// 各个界面：标题、生涯地图、升级、护照、环球冒险、每日航班、结算。
(function (root) {
  const SC = (root.SC = root.SC || {});
  const { h } = SC.UI;
  const UI = SC.UI;
  const Save = SC.Save;

  const S = {};
  SC.Screens = S;

  function topBar(title, onBack, extra) {
    return h(
      'div.topbar',
      h('button.btn.small.back', { onclick: () => { SC.Audio.play('click'); onBack(); } }, '← 返回'),
      h('div.topbar-title', title),
      h('div.topbar-extra', extra || null)
    );
  }
  function wallet() {
    return h('div.wallet', h('span', '💰 ', h('b', Save.data.coins)), h('span', '⭐ ', h('b', Save.totalStars())));
  }

  // ======================= 标题 =======================
  S.title = function () {
    UI.setTheme('day');
    SC.Audio.setTempo(108);
    const d = Save.data;
    const modes = Save.modesUnlocked();
    const hasRun = d.run && !d.run.over;
    const lockTip = '通关「上海 第 3 班」后解锁';
    const btn = (label, sub, onclick, cls, disabled) =>
      h('button.menu-btn' + (cls ? '.' + cls : ''), { onclick: () => { SC.Audio.unlock(); SC.Audio.startMusic(); SC.Audio.play('click'); onclick(); }, disabled }, h('span.mb-label', label), h('small', sub));
    const node = h(
      'div.screen.title-screen',
      h(
        'div.logo',
        h('div.logo-plane', '✈️'),
        h('h1', '云端大厨'),
        h('div.logo-sub', 'SKY CHEF · 环球航线')
      ),
      wallet(),
      h(
        'div.menu',
        btn('🧑‍🍳 生涯模式', '四座城市 · 24 个航班', () => S.campaign(), 'primary'),
        hasRun
          ? btn('🌍 继续环球冒险', `第 ${d.run.layer + 2} 站 · ❤️${d.run.rep} · 💵${d.run.cash}`, () => S.runMap(), 'accent')
          : btn('🌍 环球冒险', modes ? 'Roguelike：航线抉择 + 天赋构筑' : '🔒 ' + lockTip, () => S.runNew(), 'accent', !modes),
        btn('📅 每日航班', modes ? '每天一班，随机规则挑战最高分' : '🔒 ' + lockTip, () => S.daily(), '', !modes),
        h(
          'div.menu-row',
          btn('🔧 厨房升级', '', () => S.upgrades()),
          btn('🛂 护照印章', '', () => S.passport()),
          btn('⚙️ 设置', '', () => S.settings()),
          btn('❓ 玩法', '', () => S.help())
        )
      ),
      h('div.footer-note', '点击 / 触屏游玩 · 键盘：数字键=设备  Q W E R=备餐盘  空格=狂热  Esc=暂停')
    );
    UI.setScreen(node);
  };

  // ======================= 帮助 =======================
  S.help = function () {
    UI.modal({
      title: '❓ 怎么玩',
      cls: 'wide',
      dismissible: true,
      body: h(
        'div.help',
        h('h3', '🍽️ 基础'),
        h('ul',
          h('li', '乘客登机后，头顶气泡是点单，下方彩条是耐心。耐心耗尽会生气离开。'),
          h('li', h('b', '即取设备'), '（榨汁机、汽水机……）：点一下，成品直接送到点单乘客手里。'),
          h('li', h('b', '烹饪设备'), '（咖啡机、烤架……）：点一下开始烹饪，完成后再点一下取出。放太久会', h('b', '烤焦'), '，要再点一次清理。'),
          h('li', h('b', '组合菜'), '：先点「起盘」设备（面包篮、餐盘架……）在备餐台放一个盘子，再把配料加上去，完成后点盘子送餐。'),
          h('li', '点空盘子/未完成盘子可设为「目标盘」，配料会优先放上去；✕ 可倒掉盘子。')
        ),
        h('h3', '✨ 新玩法'),
        h('ul',
          h('li', h('b', '🔗 连击'), '：连续让乘客在耐心过半前满意离开，收入加成最高 +40%。'),
          h('li', h('b', '🔥 狂热'), '：服务积累狂热值，满了点击按钮——收入翻倍、耐心冻结、烹饪加速。'),
          h('li', h('b', '⛈️ 气流颠簸'), '：安全带灯亮起时不能送餐，但可以继续备餐。提前规划！'),
          h('li', h('b', '🧑‍🤝‍🧑 乘客性格'), '：商务客没耐心但小费多；小朋友会哭闹影响邻座；老奶奶送糖；网红好评让全舱回血；评论家决定奖金。'),
          h('li', h('b', '🌍 环球冒险'), '：像《杀戮尖塔》一样选择航线，每班航班后三选一天赋，免税店、随机事件、最终挑战总统专机。'),
          h('li', h('b', '📅 每日航班'), '：每天一套固定种子与随机规则，挑战自己的最高分。')
        ),
        h('h3', '⌨️ 键盘'),
        h('p', '数字键 1-0 = 对应设备；Q W E R T = 备餐盘（Shift+键 倒掉）；空格 = 狂热；Esc = 暂停。')
      ),
      buttons: [{ label: '明白了', cls: 'primary' }],
    });
  };

  // ======================= 设置 =======================
  S.settings = function () {
    const d = Save.data;
    const toggle = (label, key, apply) => {
      const input = h('input', { type: 'checkbox' });
      input.checked = d.settings[key];
      input.addEventListener('change', () => {
        d.settings[key] = input.checked;
        apply(input.checked);
        Save.save();
      });
      return h('label.toggle', input, h('span.toggle-ui'), label);
    };
    UI.modal({
      title: '⚙️ 设置',
      dismissible: true,
      body: h(
        'div.settings',
        toggle('音效', 'sfx', (v) => (SC.Audio.sfxOn = v)),
        toggle('背景音乐', 'music', (v) => SC.Audio.setMusic(v)),
        h('button.btn.danger.small', {
          onclick: () => {
            UI.modal({
              title: '确认重置存档？',
              body: '所有星星、金币、升级和成就都会被清除，无法恢复。',
              buttons: [
                { label: '取消' },
                { label: '重置', cls: 'danger', onClick: () => { Save.reset(); UI.closeAllModals(); S.title(); UI.toast('存档已重置', '🗑️'); } },
              ],
            });
          },
        }, '重置存档')
      ),
      buttons: [{ label: '完成', cls: 'primary' }],
    });
  };

  // ======================= 生涯地图 =======================
  S.campaign = function (focusCity) {
    UI.setTheme('day');
    let c = focusCity;
    if (c == null) {
      c = 0;
      for (let i = SC.CITIES.length - 1; i >= 0; i--) if (Save.cityUnlocked(i)) { c = i; break; }
    }
    const tabs = h('div.city-tabs');
    const body = h('div.city-body');
    SC.CITIES.forEach((city, i) => {
      const unlocked = Save.cityUnlocked(i);
      let stars = 0;
      for (let l = 0; l < SC.LEVELS_PER_CITY; l++) stars += Save.starsOf(i, l);
      const tab = h('button.city-tab' + (i === c ? '.active' : '') + (unlocked ? '' : '.locked'), {
        onclick: () => { SC.Audio.play('click'); S.campaign(i); },
        style: { '--city': city.color },
      }, h('span.ct-flag', unlocked ? city.flag : '🔒'), h('span.ct-name', city.name), h('small', `${stars}/18⭐`));
      tabs.appendChild(tab);
    });
    const city = SC.CITIES[c];
    UI.setTheme(city.theme);
    const unlocked = Save.cityUnlocked(c);
    body.appendChild(h('div.city-head', { style: { '--city': city.color } }, h('div.city-flag', city.flag), h('div', h('h2', `${city.name} · ${city.plane}`), h('p', city.desc))));
    if (!unlocked) {
      body.appendChild(h('div.locked-note', `🔒 通关「${SC.CITIES[c - 1].name} 第 6 班」后解锁`));
    }
    const path = h('div.level-path');
    for (let l = 0; l < SC.LEVELS_PER_CITY; l++) {
      const open = Save.levelUnlocked(c, l);
      const st = Save.starsOf(c, l);
      const newItems = city.unlocks[l].map((id) => SC.RECIPES[id].emoji).join('');
      const n = h('button.level-node' + (open ? '' : '.locked') + (st ? '.cleared' : ''), {
        disabled: !open,
        style: { '--city': city.color },
        onclick: () => { SC.Audio.play('click'); S.startCampaign(c, l); },
      },
      h('div.ln-num', open ? l + 1 : '🔒'),
      h('div.ln-stars', { html: UI.starsHtml(st) }),
      h('div.ln-new', newItems ? '新 ' + newItems : '终极挑战'),
      Save.data.best[Save.key(c, l)] ? h('small.ln-best', '最佳 ' + Save.data.best[Save.key(c, l)]) : null);
      path.appendChild(n);
    }
    body.appendChild(path);
    const node = h('div.screen.campaign-screen', topBar('🧑‍🍳 生涯模式', S.title, wallet()), tabs, body,
      h('div.campaign-foot', h('button.btn', { onclick: () => S.upgrades(() => S.campaign(c)) }, '🔧 厨房升级')));
    UI.setScreen(node);
  };

  // 航班开场说明
  function flightIntro(cfg, extra, onGo, onCancel) {
    const newIds = cfg.featured || [];
    const list = h('div.menu-list');
    for (const id of cfg.menu) {
      const line = UI.recipeLine(id);
      if (newIds.includes(id)) line.classList.add('is-new');
      list.appendChild(line);
    }
    const body = h(
      'div.intro',
      extra || null,
      cfg.targets ? h('div.targets', cfg.targets.map((t, i) => h('div.target', h('span', { html: UI.starsHtml(i + 1) }), h('b', t + ' 💰')))) : null,
      h('div.intro-meta', `👥 ${cfg.passengers.length} 位乘客`, cfg.turbulence.length ? ` · ⛈️ ${cfg.turbulence.length} 次颠簸` : ''),
      h('div.intro-sub', '本班菜单'),
      list
    );
    UI.modal({
      title: cfg.title,
      cls: 'wide',
      body,
      buttons: [
        { label: '返回', onClick: onCancel },
        { label: '🛫 起飞！', cls: 'primary', onClick: onGo },
      ],
    });
  }

  // 通用：进入航班
  function play(cfg, onEnd, onQuit, quitLabel) {
    const isRun = cfg.mode === 'run';
    const view = SC.GameView(cfg, {
      onEnd: (f) => onEnd(f),
      // 环球冒险中不允许重开（防止刷结果）
      onRestart: isRun ? null : () => play(cfg, onEnd, onQuit, quitLabel),
      onQuit: () => onQuit(),
      quitLabel,
    });
    UI.setScreen(view.node, () => view.destroy());
    SC._view = view; // 调试 / 自动化测试用
    view.start();
    SC.Audio.startMusic();
  }
  S._play = play;

  function recordCommon(f) {
    const st = Save.data.stats;
    st.served += f.served;
    st.coinsTotal += f.coins;
    st.burnt += f.burnt;
    st.flights += 1;
    Save.save();
    UI.achieve('first_flight');
    if (f.maxCombo >= 10) UI.achieve('combo10');
    if (f.feverCount >= 3) UI.achieve('fever5');
    if (f.totalPassengers >= 15 && f.angry === 0 && !f.failed) UI.achieve('no_angry');
    if (st.burnt >= 10) UI.achieve('burnt10');
    if (st.served >= 100) UI.achieve('served100');
    if (st.served >= 500) UI.achieve('served500');
    if (st.coinsTotal >= 5000) UI.achieve('rich');
  }

  function statsBlock(f) {
    return h(
      'div.result-stats',
      h('div', h('small', '服务乘客'), h('b', `${f.served}/${f.totalPassengers}`)),
      h('div', h('small', '生气离开'), h('b', f.angry)),
      h('div', h('small', '最高连击'), h('b', f.maxCombo)),
      h('div', h('small', '狂热次数'), h('b', f.feverCount)),
      h('div', h('small', '烤焦'), h('b', f.burnt))
    );
  }

  S.startCampaign = function (c, l) {
    const cfg = SC.campaignFlight(c, l, Save.data.upgrades);
    flightIntro(cfg, null, () => play(cfg, (f) => S.campaignResult(f, cfg), () => S.campaign(c)), () => {});
  };

  S.campaignResult = function (f, cfg) {
    const c = cfg.city;
    const l = cfg.level;
    const key = Save.key(c, l);
    const stars = f.stars;
    const prev = Save.data.stars[key] || 0;
    if (stars > prev) Save.data.stars[key] = stars;
    Save.data.best[key] = Math.max(Save.data.best[key] || 0, f.coins);
    Save.data.coins += f.coins;
    Save.save();
    recordCommon(f);
    if (stars === 3) UI.achieve('three_star');
    let all3 = true;
    for (let i = 0; i < SC.LEVELS_PER_CITY; i++) if (Save.starsOf(c, i) < 3) all3 = false;
    if (all3) UI.achieve('city_master');
    if (SC.CITIES.every((_, i) => Save.starsOf(i, SC.LEVELS_PER_CITY - 1) > 0)) UI.achieve('all_cities');

    const pass = stars > 0;
    const hasNext = l + 1 < SC.LEVELS_PER_CITY || c + 1 < SC.CITIES.length;
    const next = l + 1 < SC.LEVELS_PER_CITY ? [c, l + 1] : [c + 1, 0];
    if (pass) SC.Audio.play('win');
    else SC.Audio.play('lose');
    const starEl = h('div.result-stars');
    for (let i = 0; i < 3; i++) {
      const s = h('span.big-star', '★');
      starEl.appendChild(s);
      if (i < stars) setTimeout(() => { s.classList.add('on'); SC.Audio.play('star'); }, 350 + i * 380);
    }
    let unlockNote = null;
    if (pass && l === 2 && c === 0 && prev === 0) unlockNote = h('div.unlock-note', '🎉 解锁新模式：🌍 环球冒险 与 📅 每日航班！');
    if (pass && l === SC.LEVELS_PER_CITY - 1 && prev === 0 && c + 1 < SC.CITIES.length) unlockNote = h('div.unlock-note', `🎉 解锁新城市：${SC.CITIES[c + 1].flag} ${SC.CITIES[c + 1].name}！`);
    UI.modal({
      title: pass ? '🛬 航班顺利抵达！' : '😣 乘客们不太满意……',
      cls: 'result',
      body: h('div', starEl, h('div.result-coins', `💰 ${f.coins}`), h('div.result-goal', pass ? (stars < 3 ? `下一颗星：${cfg.targets[stars]} 💰` : '完美航班！') : `至少需要 ${cfg.targets[0]} 💰 才能过关`), statsBlock(f), unlockNote),
      buttons: [
        { label: '地图', onClick: () => S.campaign(c) },
        { label: '重试', onClick: () => S.startCampaign(c, l) },
        pass && hasNext ? { label: '下一班 →', cls: 'primary', onClick: () => { S.campaign(next[0]); S.startCampaign(next[0], next[1]); } } : { label: '🔧 升级厨房', cls: 'primary', onClick: () => S.upgrades(() => S.campaign(c)) },
      ],
    });
  };

  // ======================= 升级 =======================
  S.upgrades = function (back) {
    back = back || S.title;
    UI.setTheme('day');
    const list = h('div.upgrade-list');
    const render = () => {
      list.innerHTML = '';
      for (const u of SC.UPGRADES) {
        const lv = Save.data.upgrades[u.id] || 0;
        const max = u.costs.length;
        const cost = u.costs[lv];
        const pips = h('div.pips');
        for (let i = 0; i < max; i++) pips.appendChild(h('span.pip' + (i < lv ? '.on' : '')));
        const canBuy = lv < max && Save.data.coins >= cost;
        list.appendChild(
          h('div.upgrade-card', h('div.up-emoji', u.emoji), h('div.up-info', h('b', u.name), h('small', u.desc), pips),
            h('button.btn.small' + (canBuy ? '.primary' : ''), {
              disabled: !canBuy,
              onclick: () => {
                Save.data.coins -= cost;
                Save.data.upgrades[u.id] = lv + 1;
                Save.save();
                SC.Audio.play('pay');
                UI.toast(`${u.name} 升到 ${lv + 1} 级！`, u.emoji);
                S.upgrades(back);
              },
            }, lv >= max ? '已满级' : `💰 ${cost}`))
        );
      }
    };
    render();
    UI.setScreen(h('div.screen.upgrade-screen', topBar('🔧 厨房升级', back, wallet()), h('p.screen-note', '升级在生涯模式中永久生效。金币来自每一班航班的收入。'), list));
  };

  // ======================= 护照 =======================
  S.passport = function () {
    UI.setTheme('sunset');
    const st = Save.data.stats;
    const got = SC.ACHIEVEMENTS.filter((a) => Save.data.ach[a.id]).length;
    const grid = h('div.stamp-grid');
    for (const a of SC.ACHIEVEMENTS) {
      const on = !!Save.data.ach[a.id];
      grid.appendChild(h('div.stamp' + (on ? '.on' : ''), h('div.stamp-emoji', on ? a.emoji : '❔'), h('b', a.name), h('small', a.desc)));
    }
    const stats = h(
      'div.passport-stats',
      h('div', h('small', '总航班'), h('b', st.flights)),
      h('div', h('small', '服务乘客'), h('b', st.served)),
      h('div', h('small', '累计收入'), h('b', st.coinsTotal)),
      h('div', h('small', '环球通关'), h('b', st.runsWon)),
      h('div', h('small', '最远航程'), h('b', Save.data.bestRun + ' 站'))
    );
    UI.setScreen(h('div.screen.passport-screen', topBar(`🛂 护照印章 ${got}/${SC.ACHIEVEMENTS.length}`, S.title), stats, grid));
  };

  // ======================= 每日航班 =======================
  S.daily = function () {
    const key = SC.todayKey();
    const cfg = SC.dailyFlight(key);
    const best = Save.data.daily[key] || 0;
    const extra = h('div.daily-mods', cfg.dailyMods.map((m) => h('div.daily-mod', h('span', m.emoji), h('b', m.name), h('small', m.desc))), best ? h('div.daily-best', `今日最佳：${best} 💰`) : null);
    flightIntro(cfg, extra, () => play(cfg, (f) => S.dailyResult(f, cfg), S.title), () => {});
  };
  S.dailyResult = function (f, cfg) {
    const key = cfg.dateKey;
    const prev = Save.data.daily[key] || 0;
    const record = f.coins > prev;
    if (record) Save.data.daily[key] = f.coins;
    const reward = Math.round(f.coins * 0.3);
    Save.data.coins += reward;
    Save.save();
    recordCommon(f);
    UI.achieve('daily');
    SC.Audio.play(record ? 'win' : 'pay');
    UI.modal({
      title: record ? '🏆 刷新今日纪录！' : '📅 每日航班完成',
      cls: 'result',
      body: h('div', h('div.result-stars', { html: UI.starsHtml(f.stars) }), h('div.result-coins', `💰 ${f.coins}`), h('div.result-goal', `今日最佳：${Math.max(prev, f.coins)} · 获得生涯金币 +${reward}`), statsBlock(f)),
      buttons: [
        { label: '主菜单', onClick: S.title },
        { label: '再飞一次', cls: 'primary', onClick: S.daily },
      ],
    });
  };

  // ======================= 环球冒险 =======================
  S.runNew = function () {
    Save.data.run = SC.newRun();
    Save.data.stats.runsPlayed++;
    Save.save();
    UI.modal({
      title: '🌍 环球冒险',
      cls: 'wide',
      body: h(
        'div.help',
        h('p', '你被派往一条充满未知的环球航线。每一站都要做出选择：'),
        h('ul',
          h('li', '✈️ 航班节点会随机抽取一座城市的厨房和菜单。'),
          h('li', '❤️ 口碑：每有一位乘客生气离开就 -1，归零则冒险失败。零投诉航班回复 1 点。'),
          h('li', '🃏 每班航班后三选一天赋，逐渐构筑你的专属厨房。'),
          h('li', '🛍️ 免税店、❓ 随机事件、☕ 休息室……'),
          h('li', '🎩 终点：让总统专机上的总统满意！')
        )
      ),
      buttons: [{ label: '出发！', cls: 'primary', onClick: S.runMap }],
    });
  };

  function runHud(run) {
    const perks = h('div.run-perks');
    const counts = {};
    for (const id of run.perks) counts[id] = (counts[id] || 0) + 1;
    for (const id in counts) {
      const p = SC.PERK_BY_ID[id];
      perks.appendChild(h('span.perk-chip.' + SC.RARITY[p.rarity].cls, { title: `${p.name}：${p.desc}`, onclick: () => UI.toast(`${p.name}：${p.desc}`, p.emoji) }, p.emoji, counts[id] > 1 ? h('sub', '×' + counts[id]) : null));
    }
    if (run.curse) perks.appendChild(h('span.perk-chip.curse', { title: '旧厨具：烹饪速度 -15%', onclick: () => UI.toast('旧厨具：烹饪速度 -15%', '🪫') }, '🪫'));
    return h(
      'div.run-hud',
      h('div.run-stat', h('span.rep', '❤️'.repeat(Math.max(0, run.rep)) + '🤍'.repeat(Math.max(0, run.maxRep - run.rep)))),
      h('div.run-stat', '💵 旅费 ', h('b', run.cash)),
      h('div.run-stat', '💰 总收入 ', h('b', run.earned)),
      perks.children.length ? perks : h('div.run-perks.empty', '还没有天赋')
    );
  }

  S.runMap = function () {
    const run = Save.data.run;
    if (!run) return S.title();
    UI.setTheme('sunset');
    const avail = SC.runAvailableNodes(run);
    const onPath = (L, c) => run.path.some((p) => p[0] === L && p[1] === c);
    const map = h('div.run-map');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('run-lines');
    map.appendChild(svg);
    const rows = [];
    for (let L = run.layers.length - 1; L >= 0; L--) {
      const row = h('div.run-row');
      run.layers[L].forEach((n) => {
        const kind = SC.NODE_KINDS[n.kind];
        const isAvail = avail.includes(n);
        const cur = run.layer === L && run.col === n.col;
        const flightish = ['flight', 'storm', 'vip', 'night', 'boss'].includes(n.kind);
        const el = h('button.run-node.k-' + n.kind + (isAvail ? '.avail' : '') + (onPath(L, n.col) ? '.visited' : '') + (cur ? '.current' : ''), {
          disabled: !isAvail,
          title: kind.name + '：' + kind.desc,
          onclick: () => { SC.Audio.play('click'); S.runEnter(n); },
        }, h('span.rn-emoji', kind.emoji), h('small', kind.name), flightish ? h('span.rn-city', SC.CITIES[n.city].flag) : null);
        el.dataset.key = `${L}-${n.col}`;
        row.appendChild(el);
      });
      rows.push(row);
      map.appendChild(row);
    }
    map.appendChild(h('div.run-row.start', h('div.run-node.start-node' + (run.layer < 0 ? '.current' : ''), h('span.rn-emoji', '🛫'), h('small', '出发'))));

    const drawLines = () => {
      const mr = map.getBoundingClientRect();
      svg.setAttribute('width', mr.width);
      svg.setAttribute('height', map.scrollHeight);
      svg.innerHTML = '';
      const pos = (key) => {
        const el = map.querySelector(`[data-key="${key}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return [r.left - mr.left + r.width / 2, r.top - mr.top + r.height / 2 + map.scrollTop];
      };
      const startEl = map.querySelector('.start-node');
      const sr = startEl.getBoundingClientRect();
      const sp = [sr.left - mr.left + sr.width / 2, sr.top - mr.top + sr.height / 2 + map.scrollTop];
      const line = (a, b, cls) => {
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', a[0]);
        l.setAttribute('y1', a[1]);
        l.setAttribute('x2', b[0]);
        l.setAttribute('y2', b[1]);
        l.setAttribute('class', cls);
        svg.appendChild(l);
      };
      run.layers[0].forEach((n) => line(sp, pos(`0-${n.col}`), run.path.length && run.path[0][1] === n.col ? 'walked' : run.layer < 0 ? 'open' : ''));
      for (let L = 0; L < run.layers.length - 1; L++) {
        run.layers[L].forEach((n) => {
          for (const j of n.next) {
            const a = pos(`${L}-${n.col}`);
            const b = pos(`${L + 1}-${j}`);
            if (!a || !b) continue;
            const walked = onPath(L, n.col) && onPath(L + 1, j);
            const open = run.layer === L && run.col === n.col;
            line(a, b, walked ? 'walked' : open ? 'open' : '');
          }
        });
      }
    };

    const node = h(
      'div.screen.run-screen',
      topBar('🌍 环球冒险', S.title, h('button.btn.small.danger', {
        onclick: () => UI.modal({
          title: '放弃这次冒险？',
          body: '将按当前收入结算少量金币。',
          buttons: [{ label: '继续冒险' }, { label: '放弃', cls: 'danger', onClick: () => S.runEnd(false) }],
        }),
      }, '放弃')),
      runHud(run),
      map,
      h('p.screen-note', '从下往上飞：选择一个闪烁的节点前进。终点是 🎩 总统专机。')
    );
    const onResize = () => drawLines();
    UI.setScreen(node, () => window.removeEventListener('resize', onResize));
    window.addEventListener('resize', onResize);
    requestAnimationFrame(() => {
      drawLines();
      const target = map.querySelector('.run-node.avail');
      if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  };

  function moveTo(run, n) {
    run.layer = n.layer;
    run.col = n.col;
    run.path.push([n.layer, n.col]);
    Save.data.bestRun = Math.max(Save.data.bestRun, n.layer + 1);
    Save.save();
  }

  S.runEnter = function (n) {
    const run = Save.data.run;
    const kind = SC.NODE_KINDS[n.kind];
    const rng = SC.rng(run.seed * 7 + n.layer * 31 + n.col);
    if (['flight', 'storm', 'vip', 'night', 'boss'].includes(n.kind)) {
      const cfg = SC.runFlight(n, run);
      const extra = h('div.node-info', h('span', kind.emoji), h('div', h('b', kind.name), h('small', kind.desc)));
      if (n.kind === 'boss') extra.appendChild(h('div.boss-note', '🎩 总统会点 4 道菜。如果他生气离开，冒险直接失败！'));
      flightIntro(cfg, extra, () => play(cfg, (f) => S.runFlightResult(f, cfg, n), () => S.runQuit(), '放弃航班（口碑 -1）'), () => {});
      return;
    }
    moveTo(run, n);
    if (n.kind === 'rest') {
      const before = run.rep;
      run.rep = Math.min(run.maxRep, run.rep + 2);
      Save.save();
      SC.Audio.play('star');
      UI.modal({ title: '☕ 机组休息室', body: `你喝了杯热茶，小憩片刻。口碑 ${before} → ${run.rep}`, buttons: [{ label: '继续', cls: 'primary', onClick: S.runMap }] });
    } else if (n.kind === 'shop') {
      S.runShop(run, SC.shopStock(run, rng));
    } else if (n.kind === 'event') {
      S.runEvent(run, rng.pick(SC.RUN_EVENTS), rng);
    }
  };

  S.runQuit = function () {
    const run = Save.data.run;
    run.rep -= 1;
    Save.save();
    UI.toast('你放弃了这班航班，口碑 -1', '💔');
    if (run.rep <= 0) S.runEnd(false);
    else S.runMap();
  };

  S.runFlightResult = function (f, cfg, n) {
    const run = Save.data.run;
    recordCommon(f);
    run.rep -= f.repLoss;
    run.earned += f.coins;
    run.flights++;
    const cash = Math.round(f.coins * (cfg.rewardMult || 1) * 0.2);
    run.cash += cash;
    if (f.failed || run.rep <= 0) {
      Save.save();
      SC.Audio.play('lose');
      const why = f.bossFailed ? '总统愤怒地离开了专机……' : '口碑跌到谷底，航空公司停飞了你的航线。';
      UI.modal({ title: '💔 冒险结束', cls: 'result', body: h('div', h('p', why), statsBlock(f)), buttons: [{ label: '结算', cls: 'primary', onClick: () => S.runEnd(false) }] });
      return;
    }
    moveTo(run, n);
    let healed = false;
    if (f.angry === 0 && run.rep < run.maxRep) {
      run.rep++;
      healed = true;
    }
    Save.save();
    if (n.kind === 'boss') {
      SC.Audio.play('win');
      return S.runEnd(true);
    }
    SC.Audio.play('win');
    UI.modal({
      title: '🛬 抵达！',
      cls: 'result',
      body: h('div', h('div.result-coins', `💰 ${f.coins}`), h('div.result-goal', `旅费 +${cash}` + (cfg.rewardMult > 1 ? `（×${cfg.rewardMult} 奖励）` : '') + (healed ? ' · 零投诉，口碑 +1 ❤️' : '') + (f.repLoss ? ` · 口碑 -${f.repLoss}` : '')), statsBlock(f)),
      buttons: [{ label: '选择天赋 →', cls: 'primary', onClick: () => S.runPerkPick(run) }],
    });
  };

  S.runPerkPick = function (run) {
    const rng = SC.rng(run.seed + run.flights * 97);
    const choices = SC.rollPerks(run, 3, rng);
    let close = null;
    const cards = h('div.perk-cards');
    for (const p of choices) {
      cards.appendChild(
        h('button.perk-card.' + SC.RARITY[p.rarity].cls, {
          onclick: () => {
            run.perks.push(p.id);
            Save.save();
            SC.Audio.play('star');
            close();
            S.runMap();
          },
        }, h('div.pc-rarity', SC.RARITY[p.rarity].name), h('div.pc-emoji', p.emoji), h('b', p.name), h('small', p.desc))
      );
    }
    close = UI.modal({
      title: '🃏 选择一张天赋',
      cls: 'wide',
      body: cards,
      buttons: [{ label: '跳过（+15 旅费）', onClick: () => { run.cash += 15; Save.save(); S.runMap(); } }],
    });
  };

  S.runShop = function (run, stock) {
    const list = h('div.shop-list');
    const cashEl = h('b', run.cash);
    const render = () => {
      list.innerHTML = '';
      cashEl.textContent = run.cash;
      stock.forEach((it, i) => {
        if (it.sold) return;
        const name = it.kind === 'perk' ? it.perk.name : it.name;
        const emoji = it.kind === 'perk' ? it.perk.emoji : it.emoji;
        const desc = it.kind === 'perk' ? it.perk.desc : it.desc;
        const rcls = it.kind === 'perk' ? '.' + SC.RARITY[it.perk.rarity].cls : '';
        const disabled = run.cash < it.price || (it.kind === 'heal' && run.rep >= run.maxRep);
        list.appendChild(
          h('div.shop-item' + rcls, h('span.si-emoji', emoji), h('div.si-info', h('b', name), h('small', desc)),
            h('button.btn.small' + (disabled ? '' : '.primary'), {
              disabled,
              onclick: () => {
                run.cash -= it.price;
                if (it.kind === 'perk') run.perks.push(it.perk.id);
                if (it.kind === 'heal') run.rep = Math.min(run.maxRep, run.rep + 2);
                if (it.kind === 'maxrep') { run.maxRep++; run.rep = Math.min(run.maxRep, run.rep + 1); }
                if (it.kind === 'uncurse') run.curse = null;
                it.sold = true;
                Save.save();
                SC.Audio.play('pay');
                render();
              },
            }, `💵 ${it.price}`))
        );
      });
      if (!list.children.length) list.appendChild(h('p', '货架空了！'));
    };
    render();
    UI.modal({ title: '🛍️ 免税店', cls: 'wide', body: h('div', h('div.shop-cash', '你的旅费：💵 ', cashEl), list), buttons: [{ label: '离开', cls: 'primary', onClick: S.runMap }] });
  };

  S.runEvent = function (run, ev, rng) {
    UI.modal({
      title: `${ev.emoji} ${ev.title}`,
      body: h('p', ev.text),
      buttons: ev.choices.map((ch) => ({
        label: ch.label,
        disabled: ch.cond && !ch.cond(run),
        onClick: () => {
          const msg = ch.run(run, rng);
          Save.save();
          SC.Audio.play('star');
          if (run.rep <= 0) {
            UI.modal({ title: ev.title, body: msg, buttons: [{ label: '结算', onClick: () => S.runEnd(false) }] });
            return;
          }
          UI.modal({ title: ev.title, body: msg, buttons: [{ label: '继续', cls: 'primary', onClick: S.runMap }] });
        },
      })),
    });
  };

  S.runEnd = function (won) {
    const run = Save.data.run;
    if (!run) return S.title();
    run.over = true;
    const reward = Math.round(run.earned * (won ? 0.2 : 0.08));
    Save.data.coins += reward;
    if (won) {
      Save.data.stats.runsWon++;
      UI.achieve('run_win');
      if (run.rep >= run.maxRep) UI.achieve('run_perfect');
    }
    Save.data.run = null;
    Save.save();
    UI.setTheme(won ? 'dawn' : 'night');
    const perks = run.perks.map((id) => SC.PERK_BY_ID[id].emoji).join(' ');
    UI.setScreen(h('div.screen.title-screen'));
    UI.modal({
      title: won ? '🌍 环球之旅完成！' : '🛬 冒险结束',
      cls: 'result',
      body: h(
        'div',
        h('div.result-stars', won ? '🎩🤝🧑‍🍳' : '🧳'),
        h('p', won ? '总统对你的手艺赞不绝口，你的名字将载入航空餐饮史！' : `你飞过了 ${run.path.length} 站。下次一定能走得更远！`),
        h('div.result-stats', h('div', h('small', '航班'), h('b', run.flights)), h('div', h('small', '总收入'), h('b', run.earned)), h('div', h('small', '口碑'), h('b', `${Math.max(0, run.rep)}/${run.maxRep}`))),
        perks ? h('p.perk-summary', '天赋：' + perks) : null,
        h('div.result-goal', `获得生涯金币 +${reward} 💰`)
      ),
      buttons: [
        { label: '主菜单', onClick: S.title },
        { label: '再来一次', cls: 'primary', onClick: S.runNew },
      ],
    });
    SC.Audio.play(won ? 'win' : 'lose');
  };
})(typeof window !== 'undefined' ? window : globalThis);
