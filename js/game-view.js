// 航班画面：把 Flight 引擎渲染成可交互的机舱 + 厨房，并处理动画、音效、教程与快捷键。
(function (root) {
  const SC = (root.SC = root.SC || {});
  const { h } = SC.UI;

  const STATION_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const PLATE_KEYS = ['q', 'w', 'e', 'r', 't', 'y'];

  // 教程脚本：key 为 "城市-关卡"
  const TUTORIALS = {
    '0-0': [
      { text: '欢迎登机，见习大厨！乘客坐下后，头顶气泡是他的点单，下方彩条是耐心值。', done: (f) => f.seats.some((p) => p && p.state === 'wait') , minTime: 2.5 },
      { text: '有人点了橙汁 🧃！点击【榨汁机】，橙汁会直接送到他手上。', target: 'station:juicer', done: (f, ev) => ev.some((e) => e.type === 'deliver' && e.recipe === 'juice') },
      { text: '下一位想要咖啡 ☕。咖啡需要冲泡：点击【咖啡机】开始制作。', target: 'station:coffee', done: (f, ev) => ev.some((e) => e.type === 'cook') },
      { text: '进度条走满就好了！再点一次咖啡机，把咖啡送出去。', target: 'station:coffee', done: (f, ev) => ev.some((e) => e.type === 'deliver' && e.recipe === 'coffee') || ev.some((e) => e.type === 'plate') },
      { text: '干得漂亮！服务越快小费越多；连续让乘客满意能叠加【连击】加成。', timeout: 5 },
      { text: '狂热条满了！点击右侧 🔥 按钮：收入翻倍、耐心冻结、烹饪加速！', target: 'fever', waitFor: (f) => f.fever >= 100, done: (f, ev) => ev.some((e) => e.type === 'fever') },
    ],
    '0-1': [
      { text: '小笼包要蒸：点【蒸笼】开始，蒸好后记得及时取出——放太久会烤焦！', target: 'station:steamer', done: (f, ev) => ev.some((e) => e.type === 'take'), minTime: 1 },
    ],
    '0-4': [
      { text: '组合菜要在备餐盘上拼装：先点【面糊】🫓 起一个盘子。', target: 'station:crepe', waitFor: (f) => f.seats.some((p) => p && p.state === 'wait' && p.order.some((o) => o.id === 'jianbing')), done: (f, ev) => ev.some((e) => e.type === 'plate' && e.part === 'crepe') },
      { text: '再点【煎蛋锅】开火，煎好后点一次，煎蛋会自动放到盘子上。', target: 'station:griddle', done: (f, ev) => ev.some((e) => e.type === 'plate' && e.part === 'egg') },
      { text: '煎饼果子做好啦！点击这个备餐盘就能送给乘客。', target: 'plates', done: (f, ev) => ev.some((e) => e.type === 'deliver' && e.plate != null) },
      { text: '小技巧：点一下空盘子或未完成的盘子可以把它设为【目标盘】，配料会优先放上去。盘子右上角 ✕ 可以倒掉。', timeout: 6 },
    ],
    '1-0': [
      { text: '汉堡：先点【面包篮】起盘，再把烤好的肉饼放上去，最后点盘子送餐。', target: 'station:bun', minTime: 1, timeout: 7 },
    ],
  };

  SC.GameView = function (cfg, opts) {
    opts = opts || {};
    const f = new SC.Flight(cfg);
    const Save = SC.Save;
    const touch = !(root.matchMedia && root.matchMedia('(pointer: fine)').matches);

    // ---------- DOM ----------
    const refs = { seats: [], stations: [], plates: [] };
    const node = h('div.game.screen');
    const city = SC.CITIES[cfg.city];
    const [from, to] = (city.route || '起点 → 终点').split(' → ');

    // HUD
    const coinsEl = h('b', '0');
    const starFill = h('div.starbar-fill');
    const starMarks = h('div.starbar-marks');
    const starBar = h('div.starbar', starFill, starMarks);
    const t3 = cfg.targets ? cfg.targets[2] : 1;
    if (cfg.targets) {
      cfg.targets.forEach((t, i) => {
        const m = h('div.starmark', { style: { left: (t / t3) * 100 + '%' } }, h('span', '★'), h('small', t));
        m.dataset.i = i;
        starMarks.appendChild(m);
      });
    }
    const comboEl = h('div.hud-combo');
    const paxLeftEl = h('span', '0');
    const planeEl = h('div.route-plane', '✈️');
    const repEl = h('div.hud-rep');
    const pauseBtn = h('button.hud-btn', { title: '暂停 (Esc)', onclick: () => pause() }, '⏸');
    const bookBtn = h('button.hud-btn', { title: '菜谱', onclick: () => showBook() }, '📖');
    const hud = h(
      'div.hud',
      pauseBtn,
      h('div.hud-mid', h('div.hud-title', cfg.title), h('div.route', h('span.route-from', from), h('div.route-line', planeEl), h('span.route-to', to), h('span.route-pax', '👥 ', paxLeftEl))),
      h('div.hud-score', h('div.hud-coins', '💰 ', coinsEl), starBar),
      comboEl,
      repEl,
      bookBtn
    );

    // 机舱
    const seatbeltSign = h('div.seatbelt-sign', h('span', '💺'), h('small', '安全带'));
    const seatsEl = h('div.seats');
    for (let i = 0; i < f.seats.length; i++) {
      const seat = h('div.seat', h('div.seat-chair'));
      seat.dataset.i = i;
      refs.seats.push({ el: seat, pid: 0, pax: null });
      seatsEl.appendChild(seat);
    }
    const windowsTop = h('div.windows');
    const windowsBot = h('div.windows.bottom');
    for (let i = 0; i < 8; i++) {
      windowsTop.appendChild(h('span.window'));
      windowsBot.appendChild(h('span.window'));
    }
    const cabin = h('div.cabin', windowsTop, seatsEl, windowsBot, seatbeltSign);

    // 厨房
    const platesEl = h('div.plates');
    for (let i = 0; i < f.plates.length; i++) {
      const x = h('button.plate-x', { title: '倒掉', onpointerdown: (e) => { e.stopPropagation(); e.preventDefault(); act(() => f.discardPlate(i)); } }, '✕');
      const dish = h('div.plate-dish');
      const name = h('div.plate-name');
      const pl = h('div.plate', dish, name, x, touch ? null : h('span.key', PLATE_KEYS[i].toUpperCase()));
      pl.dataset.i = i;
      pl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        act(() => f.tapPlate(i));
      });
      refs.plates.push({ el: pl, dish, name, sig: '' });
      platesEl.appendChild(pl);
    }
    const feverFill = h('div.fever-fill');
    const feverLabel = h('div.fever-label', '狂热');
    const feverBtn = h('button.fever-btn', { title: '狂热 (空格)' }, feverFill, h('div.fever-icon', '🔥'), feverLabel);
    feverBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      act(() => f.activateFever());
    });
    const stationsEl = h('div.stations');
    f.stations.forEach((st, i) => {
      const def = st.def;
      const slotsEl = h('div.st-slots');
      const slotRefs = [];
      if (st.slots) {
        for (let k = 0; k < st.slots.length; k++) {
          const fill = h('div.slot-fill');
          const s = h('div.slot', fill);
          slotsEl.appendChild(s);
          slotRefs.push({ el: s, fill });
        }
      }
      const emoji = h('div.st-emoji', def.emoji);
      const prod = h('div.st-prod', SC.ITEMS[def.out].emoji);
      const kindLabel = def.kind === 'cooker' ? '烹饪' : def.kind === 'base' ? '起盘' : '即取';
      const btn = h(
        'button.station.kind-' + def.kind,
        emoji,
        prod,
        h('div.st-name', def.name),
        h('div.st-kind', kindLabel),
        slotsEl,
        touch || i >= STATION_KEYS.length ? null : h('span.key', STATION_KEYS[i])
      );
      btn.dataset.id = st.id;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        act(() => f.tapStation(i));
      });
      refs.stations.push({ el: btn, slots: slotRefs, emoji, prod, sig: '' });
      stationsEl.appendChild(btn);
    });
    const counter = h('div.counter', h('div.counter-label', '备餐台'), platesEl, feverBtn);
    const galley = h('div.galley', counter, stationsEl);

    const banner = h('div.banner');
    const hint = h('div.tutorial-hint');
    node.append(hud, cabin, galley, banner, hint);

    // ---------- 状态 ----------
    let raf = 0;
    let last = 0;
    let destroyed = false;
    let paused = false;
    let ended = false;
    let pendingEvents = [];
    let lastCoins = 0;
    let lastCombo = 0;
    let bannerTimer = null;

    function act(fn) {
      if (paused || ended) return;
      SC.Audio.unlock();
      fn();
    }

    // ---------- 教程 ----------
    const tutKey = `${cfg.city}-${cfg.level}`;
    const tutorial = cfg.mode === 'campaign' && !(Save.data.seen['tut-' + tutKey]) ? (TUTORIALS[tutKey] || []).slice() : [];
    let tutStep = -1;
    let tutT = 0;
    let tutHighlighted = null;
    function tutTarget(target) {
      if (!target) return null;
      if (target === 'fever') return feverBtn;
      if (target === 'plates') return platesEl;
      if (target.startsWith('station:')) {
        const id = target.slice(8);
        const r = refs.stations.find((s) => s.el.dataset.id === id);
        return r ? r.el : null;
      }
      return null;
    }
    function tutAdvance() {
      tutStep++;
      tutT = 0;
      if (tutHighlighted) tutHighlighted.classList.remove('highlight');
      tutHighlighted = null;
      hint.classList.remove('show');
      if (tutStep >= tutorial.length) {
        Save.data.seen['tut-' + tutKey] = 1;
        Save.save();
      }
    }
    function tutUpdate(dt, events) {
      if (tutStep >= tutorial.length) return;
      if (tutStep < 0) tutAdvance();
      const s = tutorial[tutStep];
      if (!s) return;
      if (s.waitFor && !hint.classList.contains('show') && !s.waitFor(f)) return;
      if (!hint.classList.contains('show')) {
        hint.textContent = s.text;
        hint.classList.add('show');
        const t = tutTarget(s.target);
        if (t) {
          t.classList.add('highlight');
          tutHighlighted = t;
        }
      }
      tutT += dt;
      if (s.minTime && tutT < s.minTime) return;
      if ((s.done && s.done(f, events)) || (s.timeout && tutT >= s.timeout)) tutAdvance();
    }

    // ---------- 渲染 ----------
    function moodOf(frac) {
      if (frac > 0.6) return '';
      if (frac > 0.35) return '😐';
      if (frac > 0.15) return '😠';
      return '🤬';
    }

    function buildPax(p) {
      const type = SC.PTYPES[p.type];
      const bubble = h('div.bubble');
      const items = p.order.map((o) => {
        const el = h('span.oi', SC.UI.dishIcon(o.id));
        bubble.appendChild(el);
        return el;
      });
      const pfill = h('div.pfill');
      const mood = h('span.mood');
      const pax = h(
        'div.pax.type-' + p.type,
        bubble,
        h('div.avatar', h('span.face', p.face), type.badge ? h('span.badge', { title: type.name + '：' + (type.desc || '') }, type.badge) : null, mood),
        h('div.pbar', pfill)
      );
      return { el: pax, bubble, items, pfill, mood, state: '', crying: null, doneMask: '' };
    }

    function renderSeats() {
      for (let i = 0; i < f.seats.length; i++) {
        const p = f.seats[i];
        const r = refs.seats[i];
        if (!p) {
          if (r.pax) {
            r.pax.el.remove();
            r.pax = null;
            r.pid = 0;
            r.el.classList.remove('occupied');
          }
          continue;
        }
        if (r.pid !== p.pid) {
          if (r.pax) r.pax.el.remove();
          r.pax = buildPax(p);
          r.pid = p.pid;
          r.el.appendChild(r.pax.el);
          r.el.classList.add('occupied');
        }
        const px = r.pax;
        if (px.state !== p.state) {
          px.el.classList.remove('st-' + px.state);
          px.el.classList.add('st-' + p.state);
          px.state = p.state;
          if (p.state === 'sleep') px.bubble.dataset.alt = '💤';
          else if (p.state === 'think' || p.state === 'board') px.bubble.dataset.alt = '…';
          else if (p.state === 'happy') px.bubble.dataset.alt = p.mood > 0.6 ? '😍' : '🙂';
          else if (p.state === 'angry') px.bubble.dataset.alt = '😡💢';
          else delete px.bubble.dataset.alt;
        }
        const mask = p.order.map((o) => (o.done ? 1 : 0)).join('');
        if (mask !== px.doneMask) {
          p.order.forEach((o, k) => px.items[k].classList.toggle('done', o.done));
          px.doneMask = mask;
        }
        const frac = SC.clamp(p.patience / p.maxPatience, 0, 1);
        px.pfill.style.width = frac * 100 + '%';
        px.pfill.style.background = frac > 0.6 ? 'var(--ok)' : frac > 0.3 ? 'var(--warn)' : 'var(--bad)';
        const mood = p.state === 'wait' ? (p.crying ? '😭' : moodOf(frac)) : '';
        if (px.mood.textContent !== mood) px.mood.textContent = mood;
        const urgent = p.state === 'wait' && frac < 0.25;
        px.el.classList.toggle('urgent', urgent);
        if (px.crying !== p.crying) {
          px.el.classList.toggle('crying', p.crying);
          px.crying = p.crying;
        }
      }
    }

    function renderStations() {
      f.stations.forEach((st, i) => {
        const r = refs.stations[i];
        if (!st.slots) return;
        let sig = '';
        let anyReady = false;
        let anyBurnt = false;
        let anyWarn = false;
        st.slots.forEach((s, k) => {
          const sr = r.slots[k];
          let pct = 0;
          if (s.state === 'cooking') pct = Math.min(1, s.t / st.def.time);
          else if (s.state === 'ready') {
            pct = 1;
            anyReady = true;
            if (st.def.burn && s.burnT > st.def.burn * f.mods.burnMult * 0.55) anyWarn = true;
          } else if (s.state === 'burnt') {
            pct = 1;
            anyBurnt = true;
          }
          sr.fill.style.width = pct * 100 + '%';
          sig += s.state[0];
          if (sr.state !== s.state) {
            sr.el.className = 'slot s-' + s.state;
            sr.state = s.state;
          }
        });
        if (sig !== r.sig || anyWarn !== r.warn) {
          r.el.classList.toggle('ready', anyReady);
          r.el.classList.toggle('burnt', anyBurnt);
          r.el.classList.toggle('warn', anyWarn);
          r.el.classList.toggle('cooking', sig.includes('c'));
          r.sig = sig;
          r.warn = anyWarn;
        }
      });
    }

    function renderPlates() {
      f.plates.forEach((pl, i) => {
        const r = refs.plates[i];
        const sig = (pl ? pl.parts.join(',') : '') + '|' + (f.targetPlate === i);
        if (sig === r.sig) return;
        r.sig = sig;
        r.el.classList.toggle('target', f.targetPlate === i);
        r.dish.innerHTML = '';
        if (!pl) {
          r.el.className = 'plate empty' + (f.targetPlate === i ? ' target' : '');
          r.name.textContent = '';
          return;
        }
        const rec = f.recipeFor(pl.parts);
        r.el.className = 'plate' + (rec ? ' complete' : ' partial') + (f.targetPlate === i ? ' target' : '');
        if (rec) {
          r.dish.appendChild(SC.UI.dishIcon(rec.id));
          r.name.textContent = rec.name;
        } else {
          for (const part of pl.parts) r.dish.appendChild(h('span.part', SC.ITEMS[part].emoji));
          r.name.textContent = '拼装中…';
        }
      });
    }

    function renderHud() {
      if (f.coins !== lastCoins) {
        coinsEl.textContent = f.coins;
        coinsEl.parentNode.classList.remove('bump');
        void coinsEl.offsetWidth;
        coinsEl.parentNode.classList.add('bump');
        lastCoins = f.coins;
        if (cfg.targets) {
          starFill.style.width = Math.min(100, (f.coins / t3) * 100) + '%';
          starMarks.querySelectorAll('.starmark').forEach((m) => m.classList.toggle('got', f.coins >= cfg.targets[+m.dataset.i]));
        }
      }
      if (f.combo !== lastCombo) {
        comboEl.innerHTML = f.combo >= 2 ? `🔗<b>${f.combo}</b><small>连击</small>` : '';
        comboEl.classList.toggle('hot', f.combo >= 5);
        lastCombo = f.combo;
      }
      paxLeftEl.textContent = f.remaining;
      planeEl.style.left = f.progress * 100 + '%';
      if (cfg.repLimit != null && isFinite(cfg.repLimit)) {
        const left = cfg.repLimit - f.repLoss;
        const shield = f.shield > 0 ? ` 🛡️${f.shield}` : '';
        const txt = '❤️'.repeat(Math.max(0, left)) + shield;
        if (repEl.textContent !== txt) repEl.textContent = txt;
      }
      // 狂热
      if (f.feverActive) {
        feverFill.style.height = (f.feverT / f.mods.feverDur) * 100 + '%';
        feverLabel.textContent = Math.ceil(f.feverT) + 's';
      } else {
        feverFill.style.height = f.fever + '%';
        feverLabel.textContent = f.fever >= 100 ? '点我!' : '狂热';
      }
      feverBtn.classList.toggle('ready', f.fever >= 100 && !f.feverActive);
      node.classList.toggle('fever', f.feverActive);
      node.classList.toggle('seatbelt', f.seatbelt);
      node.classList.toggle('turb-warn', f.turbState === 'warn');
    }

    function showBanner(text, cls, dur) {
      banner.textContent = text;
      banner.className = 'banner show ' + (cls || '');
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => banner.classList.remove('show'), dur || 2200);
    }

    function center(el) {
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    }

    function handleEvents(events) {
      for (const e of events) {
        switch (e.type) {
          case 'deliver': {
            const seatEl = refs.seats[e.seat] && refs.seats[e.seat].el;
            const src = e.station != null ? refs.stations[e.station].el : e.plate != null ? refs.plates[e.plate].el : feverBtn;
            SC.UI.fly(SC.RECIPES[e.recipe].emoji, src, seatEl);
            SC.Audio.play('deliver');
            if (e.auto) {
              const [x, y] = center(seatEl);
              SC.UI.floatText(x, y - 20, '🛒 自动送达', 'small');
            }
            break;
          }
          case 'plate': {
            if (e.station != null) SC.UI.fly(SC.ITEMS[e.part].emoji, refs.stations[e.station].el, refs.plates[e.plate].el, 300);
            SC.Audio.play('take');
            break;
          }
          case 'pay': {
            const [x, y] = center(refs.seats[e.seat].el);
            SC.UI.floatText(x, y - 30, `+${e.amount}💰`, e.frac > 0.6 ? 'gold' : '');
            if (e.note) setTimeout(() => SC.UI.floatText(x, y - 5, e.note, 'note'), 250);
            SC.Audio.play('pay');
            if (e.frac > 0.8) SC.UI.burst(x, y, ['💖', '✨', '💰'], 6);
            if (e.combo >= 3 && e.combo % 1 === 0) {
              const [cx, cy] = center(cabin);
              SC.UI.floatText(cx, cy, `连击 ×${e.combo}!`, 'combo');
              if (e.combo % 5 === 0) SC.Audio.play('combo');
            }
            if (e.ptype === 'critic' && e.note === '好评！') SC.UI.achieve('critic');
            break;
          }
          case 'angry': {
            const [x, y] = center(refs.seats[e.seat].el);
            SC.UI.floatText(x, y - 20, e.shielded ? '🛡️ 已抵消' : cfg.repLimit != null && isFinite(cfg.repLimit) ? '💔 口碑 -1' : '😡 生气离开', 'bad');
            SC.Audio.play('angry');
            refs.seats[e.seat].el.classList.add('shake');
            setTimeout(() => refs.seats[e.seat].el.classList.remove('shake'), 500);
            break;
          }
          case 'reject': {
            const el = refs.stations[e.station].el;
            el.classList.remove('nope');
            void el.offsetWidth;
            el.classList.add('nope');
            SC.Audio.play('reject');
            if (!f.plates.includes(null)) showBanner('备餐台满了！送出或倒掉一个盘子', 'info', 1400);
            break;
          }
          case 'nomatch': {
            const el = refs.plates[e.plate].el;
            el.classList.remove('nope');
            void el.offsetWidth;
            el.classList.add('nope');
            SC.Audio.play('reject');
            break;
          }
          case 'blocked':
            showBanner('🔒 安全带指示灯亮着，暂时不能送餐', 'warn', 1400);
            SC.Audio.play('reject');
            break;
          case 'tap':
            SC.Audio.play('tap');
            break;
          case 'cook':
            SC.Audio.play('cook');
            break;
          case 'ready':
            SC.Audio.play('ready');
            break;
          case 'take':
            break;
          case 'burn': {
            const el = refs.stations[e.station].el;
            const [x, y] = center(el);
            SC.UI.burst(x, y, ['💨', '🔥'], 5);
            SC.UI.floatText(x, y - 30, '烤焦了！', 'bad');
            SC.Audio.play('burn');
            break;
          }
          case 'trash':
            SC.Audio.play('trash');
            break;
          case 'board':
            SC.Audio.play('board');
            break;
          case 'order':
            SC.Audio.play('order');
            break;
          case 'wake':
            SC.Audio.play('wake');
            break;
          case 'cry': {
            const [x, y] = center(refs.seats[e.seat].el);
            SC.UI.floatText(x, y - 20, '哇——😭', 'bad');
            SC.Audio.play('cry');
            break;
          }
          case 'turbWarn':
            showBanner('⚠️ 前方气流！即将颠簸，请系好安全带', 'warn', 2500);
            SC.Audio.play('turbWarn');
            break;
          case 'turb':
            showBanner('🔒 颠簸中：暂停送餐，抓紧时间备餐！', 'warn', 3000);
            SC.Audio.play('turb');
            break;
          case 'turbEnd':
            showBanner('✅ 气流平稳，恢复送餐', 'ok', 1500);
            SC.Audio.play('ready');
            break;
          case 'fever': {
            showBanner('🔥 狂热时间！收入翻倍 · 耐心冻结 · 烹饪加速', 'fever', 2500);
            SC.Audio.play('fever');
            SC.Audio.setTempo(140);
            const [x, y] = center(feverBtn);
            SC.UI.burst(x, y, ['🔥', '⭐', '✨'], 12);
            break;
          }
          case 'feverEnd':
            SC.Audio.setTempo(108);
            break;
          case 'end':
            onEnd();
            break;
        }
      }
    }

    function frame(ts) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
      last = ts;
      if (!paused && !ended) f.tick(dt);
      const events = f.drainEvents();
      if (events.length) pendingEvents = events;
      handleEvents(events);
      if (!paused && !ended) tutUpdate(dt, events);
      renderSeats();
      renderStations();
      renderPlates();
      renderHud();
    }

    function onEnd() {
      if (ended) return;
      ended = true;
      if (tutorial.length && !Save.data.seen['tut-' + tutKey]) {
        Save.data.seen['tut-' + tutKey] = 1;
        Save.save();
      }
      SC.Audio.setTempo(108);
      if (tutHighlighted) tutHighlighted.classList.remove('highlight');
      hint.classList.remove('show');
      showBanner(f.failed ? '航班提前结束……' : '🛬 航班抵达！', f.failed ? 'warn' : 'ok', 1500);
      setTimeout(() => {
        if (!destroyed && opts.onEnd) opts.onEnd(f);
      }, 1100);
    }

    // ---------- 暂停 / 菜谱 ----------
    function pause() {
      if (ended || paused) return;
      paused = true;
      f.paused = true;
      SC.Audio.play('click');
      SC.UI.modal({
        title: '⏸ 暂停',
        body: h('div.pause-body', h('p', cfg.title), h('div.menu-list', f.menu.map((id) => SC.UI.recipeLine(id)))),
        buttons: [
          { label: '继续', cls: 'primary', onClick: resume },
          opts.onRestart ? { label: '重新开始', onClick: () => opts.onRestart() } : null,
          { label: opts.quitLabel || '退出航班', cls: 'danger', onClick: () => opts.onQuit && opts.onQuit() },
        ].filter(Boolean),
      });
    }
    function resume() {
      paused = false;
      f.paused = false;
      last = 0;
    }
    function showBook() {
      if (ended || paused) return;
      paused = true;
      f.paused = true;
      SC.UI.modal({
        title: '📖 本航班菜谱',
        body: h('div.menu-list', f.menu.map((id) => SC.UI.recipeLine(id))),
        buttons: [{ label: '继续', cls: 'primary', onClick: resume }],
        dismissible: true,
        onClose: () => {
          if (paused) resume();
        },
      });
    }

    function onKey(e) {
      if (SC.UI.hasModal()) return;
      const k = e.key.toLowerCase();
      if (k === 'escape' || k === 'p') {
        pause();
        return;
      }
      if (k === ' ') {
        e.preventDefault();
        act(() => f.activateFever());
        return;
      }
      const si = STATION_KEYS.indexOf(k);
      if (si >= 0 && si < f.stations.length) {
        act(() => f.tapStation(si));
        flash(refs.stations[si].el);
        return;
      }
      const pi = PLATE_KEYS.indexOf(k);
      if (pi >= 0 && pi < f.plates.length) {
        act(() => (e.shiftKey ? f.discardPlate(pi) : f.tapPlate(pi)));
        flash(refs.plates[pi].el);
      }
    }
    function flash(el) {
      el.classList.remove('pressed');
      void el.offsetWidth;
      el.classList.add('pressed');
    }
    function onVis() {
      if (document.hidden) pause();
    }

    return {
      node,
      flight: f,
      start() {
        SC.UI.setTheme(cfg.theme);
        document.addEventListener('keydown', onKey);
        document.addEventListener('visibilitychange', onVis);
        raf = requestAnimationFrame(frame);
      },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        clearTimeout(bannerTimer);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVis);
        SC.Audio.setTempo(108);
      },
      get events() {
        return pendingEvents;
      },
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
