// 航班模拟引擎：纯逻辑、无 DOM。UI 每帧调用 tick() 并读取状态、消费 events。
(function (root) {
  const SC = (root.SC = root.SC || {});

  const DEFAULT_MODS = {
    cookSpeed: 1, // 烹饪速度倍率
    burnMult: 1, // 保温时间倍率
    plates: 3, // 备餐盘数量
    patienceMult: 1,
    drainMult: 1, // 耐心消耗倍率
    tipMult: 1,
    priceMult: 1,
    feverGain: 1,
    feverDur: 8,
    comboCap: 10,
    cookerSlots: 1,
    turbMult: 1, // 颠簸持续时间倍率
    flatBonus: 0, // 每位满意乘客额外金币
    teddy: false, // 小朋友不会哭闹
    shield: 0, // 可抵消的差评次数
    autodrink: 0, // 自动送饮料间隔（秒），0 为关闭
    vipTip: 1, // 商务/贵宾小费倍率
    deliverHeal: 0.2, // 每送达一件恢复的耐心比例
    stationLv: {}, // 生涯设备等级 { 设备id: 0~3 }
    startFever: false, // 道具：开局狂热条满
  };
  SC.DEFAULT_MODS = DEFAULT_MODS;

  const SEAT_COLS = 6;
  const TURB_WARN = 2.5;
  const FRESH_WINDOW = 1.8; // 出锅后及时取出，获得趁热奖励

  class Flight {
    constructor(cfg) {
      this.cfg = cfg;
      this.mods = Object.assign({}, DEFAULT_MODS, cfg.mods || {});
      this.rng = SC.rng((cfg.seed || 1) * 31 + 7);
      this.menu = cfg.menu.slice();
      this.recipes = this.menu.map((id) => SC.RECIPES[id]);
      this.time = 0;

      // 设备：由菜单推导
      const stationIds = cfg.stations || Flight.stationsForMenu(this.menu);
      this.stations = stationIds.map((id) => {
        const def = SC.STATIONS[id];
        const lv = (this.mods.stationLv && this.mods.stationLv[id]) || 0;
        const st = { id, def, lv };
        if (def.kind === 'cooker') {
          st.speed = lv >= 1 ? 1.3 : 1; // 1 级：更快
          st.burnK = lv >= 3 ? 2 : 1; // 3 级：保温翻倍
          const n = Math.max(1, this.mods.cookerSlots | 0, lv >= 2 ? 2 : 1); // 2 级：双份
          st.slots = [];
          for (let i = 0; i < n; i++) st.slots.push({ state: 'idle', t: 0, burnT: 0, readyT: 0 });
        }
        return st;
      });

      this.plates = new Array(this.mods.plates).fill(null);
      this.targetPlate = -1;
      this.seats = new Array(cfg.seats || 12).fill(null);
      this.queue = cfg.passengers
        .map((p, i) => Object.assign({ idx: i }, p))
        .sort((a, b) => a.t - b.t);
      this.totalPassengers = this.queue.length;

      this.coins = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.served = 0;
      this.freshDishes = 0;
      this.angry = 0;
      this.burnt = 0;
      this.fever = this.mods.startFever ? 100 : 0;
      this.feverT = 0;
      this.feverCount = 0;
      this.shield = this.mods.shield;
      this.repLoss = 0;
      this.repLimit = cfg.repLimit == null ? Infinity : cfg.repLimit;
      this.criticGood = 0;
      this.autodrinkT = 0;
      this.bossServed = false;
      this.bossFailed = false;
      this.bossMood = null; // Boss 满意离开时的耐心比例
      this.fastServed = 0; // 耐心还很足（等待不到 20%）就吃上的乘客数
      this.discards = 0; // 倒掉的盘子数

      this.turbs = (cfg.turbulence || []).map((x) => ({ t: x.t, dur: x.dur * this.mods.turbMult }));
      this.turbState = 'none'; // none | warn | active
      this.turbLeft = 0;

      this.paused = false;
      // 教学暂停：乘客不登机、耐心不消耗、颠簸不推进，但厨房照常运作，方便新手照着提示操作
      this.hold = false;
      this.done = false;
      this.failed = false;
      this.events = [];
      this.nextPid = 1;
    }

    static stationsForMenu(menu) {
      const set = [];
      for (const rid of menu) {
        for (const part of SC.RECIPES[rid].parts) {
          const sid = SC.PART_SOURCE[part];
          if (sid && !set.includes(sid)) set.push(sid);
        }
      }
      // 排序：底 -> 配料/烹饪 -> 饮品，保持厨房布局稳定
      const order = Object.keys(SC.STATIONS);
      return set.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    }

    emit(type, data) {
      this.events.push(Object.assign({ type }, data || {}));
    }

    get seatbelt() {
      return this.turbState === 'active';
    }
    get feverActive() {
      return this.feverT > 0;
    }
    get remaining() {
      let n = this.queue.length;
      for (const p of this.seats) if (p && (p.state !== 'happy' && p.state !== 'angry')) n++;
      return n;
    }
    get progress() {
      const doneCount = this.served + this.angry;
      return this.totalPassengers ? doneCount / this.totalPassengers : 1;
    }
    get stars() {
      const t = this.cfg.targets;
      if (!t || this.bossFailed) return 0; // Boss 生气离开：本班不计星
      let s = 0;
      for (let i = 0; i < 3; i++) if (this.coins >= t[i]) s = i + 1;
      return s;
    }

    // 设备放多久会烤焦（秒）；没有 burn 的设备返回 Infinity
    burnLimit(st) {
      return st.def.burn ? st.def.burn * this.mods.burnMult * (st.burnK || 1) : Infinity;
    }

    // 单道菜的实际售价：基础价 × 全局倍率 × (1 + 各部件设备升级加成的平均值)
    recipePrice(id) {
      const r = SC.RECIPES[id];
      let bonus = 0;
      const lvs = this.mods.stationLv || {};
      for (const part of r.parts) {
        const sid = SC.PART_SOURCE[part];
        const kind = SC.STATIONS[sid].kind;
        bonus += (lvs[sid] || 0) * (SC.STATION_PRICE_BONUS ? SC.STATION_PRICE_BONUS[kind] || 0 : 0);
      }
      bonus /= r.parts.length;
      return r.price * this.mods.priceMult * (1 + bonus);
    }

    // ---------------- 菜谱匹配 ----------------
    recipeFor(parts) {
      for (const r of this.recipes) {
        if (r.parts.length !== parts.length) continue;
        if (r.parts[0] !== parts[0]) continue;
        if (parts.every((p) => r.parts.includes(p))) return r;
      }
      return null;
    }
    canExtend(parts, part) {
      if (parts.includes(part)) return false;
      for (const r of this.recipes) {
        if (r.parts[0] !== parts[0] || r.parts.length <= parts.length) continue;
        if (!r.parts.includes(part)) continue;
        if (parts.every((p) => r.parts.includes(p))) return true;
      }
      return false;
    }
    singleRecipe(part) {
      for (const r of this.recipes) if (r.parts.length === 1 && r.parts[0] === part) return r;
      return null;
    }
    isBase(part) {
      return this.recipes.some((r) => r.parts.length > 1 && r.parts[0] === part);
    }

    // 所有未满足的点单数量（按菜谱），可扣除已做好的盘子
    demand(excludePlates) {
      const d = {};
      for (const p of this.seats) {
        if (!p || p.state !== 'wait') continue;
        for (const o of p.order) if (!o.done) d[o.id] = (d[o.id] || 0) + 1;
      }
      if (excludePlates) {
        for (const pl of this.plates) {
          if (!pl) continue;
          const r = this.recipeFor(pl.parts);
          if (r && d[r.id]) d[r.id]--;
        }
      }
      return d;
    }

    findPassengerFor(recipeId) {
      let best = null;
      let bestFrac = Infinity;
      for (const p of this.seats) {
        if (!p || p.state !== 'wait') continue;
        if (!p.order.some((o) => !o.done && o.id === recipeId)) continue;
        const f = p.patience / p.maxPatience;
        if (f < bestFrac) {
          bestFrac = f;
          best = p;
        }
      }
      return best;
    }

    emptyPlate() {
      if (this.targetPlate >= 0 && !this.plates[this.targetPlate]) return this.targetPlate;
      return this.plates.indexOf(null);
    }

    // 把一个部件放到合适位置。返回 true 表示成功
    placePart(part, fromStation, fresh) {
      const single = this.singleRecipe(part);
      if (single) {
        if (!this.seatbelt) {
          const p = this.findPassengerFor(single.id);
          if (p) {
            this.deliver(p, single.id, { station: fromStation, fresh: !!fresh });
            return true;
          }
        }
        const i = this.emptyPlate();
        if (i >= 0) {
          this.plates[i] = { parts: [part], freshParts: fresh ? [part] : [] };
          this.emit('plate', { plate: i, part, station: fromStation, fresh: !!fresh });
          return true;
        }
        return false;
      }
      if (this.isBase(part)) {
        const i = this.emptyPlate();
        if (i >= 0) {
          this.plates[i] = { parts: [part], freshParts: fresh ? [part] : [] };
          this.emit('plate', { plate: i, part, station: fromStation, fresh: !!fresh });
          return true;
        }
        return false;
      }
      // 配料：找能接受它的盘子
      const cands = [];
      for (let i = 0; i < this.plates.length; i++) {
        const pl = this.plates[i];
        if (pl && this.canExtend(pl.parts, part)) cands.push(i);
      }
      if (!cands.length) return false;
      let pick = cands[0];
      if (cands.includes(this.targetPlate)) pick = this.targetPlate;
      else {
        // 优先放到“加上它就能完成某个被点单菜品”的盘子
        const dem = this.demand(true);
        let bestScore = -1;
        for (const i of cands) {
          const next = this.plates[i].parts.concat(part);
          const r = this.recipeFor(next);
          let score = 0;
          if (r && dem[r.id] > 0) score = 3;
          else if (!this.recipeFor(this.plates[i].parts)) score = 2; // 未完成的盘子优先
          if (score > bestScore) {
            bestScore = score;
            pick = i;
          }
        }
      }
      this.plates[pick].parts.push(part);
      if (fresh) {
        this.plates[pick].freshParts = this.plates[pick].freshParts || [];
        this.plates[pick].freshParts.push(part);
      }
      this.emit('plate', { plate: pick, part, station: fromStation, fresh: !!fresh });
      return true;
    }

    // ---------------- 玩家操作 ----------------
    tapStation(idx) {
      if (this.done || this.paused) return false;
      const st = this.stations[idx];
      if (!st) return false;
      const def = st.def;
      if (def.kind !== 'cooker') {
        const ok = this.placePart(def.out, idx);
        if (!ok) this.emit('reject', { station: idx });
        else this.emit('tap', { station: idx });
        return ok;
      }
      // 烹饪设备：1) 清理焦糊 2) 取出成品 3) 开始烹饪
      const burnt = st.slots.find((s) => s.state === 'burnt');
      if (burnt) {
        burnt.state = 'idle';
        burnt.t = 0;
        burnt.burnT = 0;
        burnt.readyT = 0;
        this.emit('trash', { station: idx });
        return true;
      }
      const ready = st.slots
        .filter((s) => s.state === 'ready')
        .sort((a, b) => b.burnT - a.burnT)[0];
      if (ready) {
        const fresh = ready.readyT <= FRESH_WINDOW;
        if (this.placePart(def.out, idx, fresh)) {
          ready.state = 'idle';
          ready.t = 0;
          ready.burnT = 0;
          ready.readyT = 0;
          this.emit('take', { station: idx, fresh });
          return true;
        }
      }
      const idle = st.slots.find((s) => s.state === 'idle');
      if (idle) {
        idle.state = 'cooking';
        idle.t = 0;
        idle.burnT = 0;
        idle.readyT = 0;
        this.emit('cook', { station: idx });
        return true;
      }
      this.emit('reject', { station: idx });
      return false;
    }

    tapPlate(i) {
      if (this.done || this.paused) return false;
      const pl = this.plates[i];
      if (!pl) {
        this.targetPlate = this.targetPlate === i ? -1 : i;
        return false;
      }
      const r = this.recipeFor(pl.parts);
      if (r) {
        if (this.seatbelt) {
          this.emit('blocked', { plate: i });
          return false;
        }
        const p = this.findPassengerFor(r.id);
        if (p) {
          this.plates[i] = null;
          if (this.targetPlate === i) this.targetPlate = -1;
          this.deliver(p, r.id, { plate: i, fresh: !!(pl.freshParts && pl.freshParts.length) });
          return true;
        }
        this.emit('nomatch', { plate: i });
        // 完成的菜也允许被选为目标（例如汉堡还要继续加芝士）
        if (this.canExtendAny(pl.parts)) this.targetPlate = this.targetPlate === i ? -1 : i;
        return false;
      }
      this.targetPlate = this.targetPlate === i ? -1 : i;
      this.emit('target', { plate: i });
      return false;
    }
    canExtendAny(parts) {
      return this.recipes.some(
        (r) => r.parts[0] === parts[0] && r.parts.length > parts.length && parts.every((p) => r.parts.includes(p))
      );
    }

    discardPlate(i) {
      if (this.done || !this.plates[i]) return false;
      this.plates[i] = null;
      this.discards++;
      if (this.targetPlate === i) this.targetPlate = -1;
      this.emit('trash', { plate: i });
      return true;
    }

    activateFever() {
      if (this.done || this.paused || this.feverActive || this.fever < 100) return false;
      this.feverT = this.mods.feverDur;
      this.feverCount++;
      this.emit('fever');
      return true;
    }

    // ---------------- 服务与结算 ----------------
    deliver(p, recipeId, src) {
      const o = p.order.find((x) => !x.done && x.id === recipeId);
      if (!o) return;
      o.done = true;
      o.fresh = !!(src && src.fresh);
      if (o.fresh) this.freshDishes++;
      p.patience = Math.min(p.maxPatience, p.patience + p.maxPatience * this.mods.deliverHeal);
      this.emit('deliver', Object.assign({ seat: p.seat, recipe: recipeId }, src || {}));
      if (p.order.every((x) => x.done)) this.complete(p);
    }

    complete(p) {
      const type = SC.PTYPES[p.type];
      const frac = SC.clamp(p.patience / p.maxPatience, 0, 1);
      const freshValue = p.order.reduce((sum, o) => sum + (o.fresh ? this.recipePrice(o.id) : 0), 0);
      const freshBonus = Math.round(freshValue * 0.12);
      let price = 0;
      for (const o of p.order) price += this.recipePrice(o.id);
      let tipMult = this.mods.tipMult * type.tip;
      if (p.type === 'business' || p.type === 'vip' || type.boss) tipMult *= this.mods.vipTip;
      // 小费看“实际等了多久”（不受送餐回血影响），越快越多，拉开手速差距
      const speed = SC.clamp(1 - (p.waitT || 0) / p.maxPatience, 0, 1);
      const tip = price * 0.6 * Math.pow(speed, 1.5) * tipMult;
      if (speed >= 0.8) this.fastServed++;
      if (frac >= 0.5) {
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
      } else {
        this.combo = 0;
      }
      const comboMult = 1 + 0.04 * Math.min(this.combo, this.mods.comboCap);
      let total = (price + tip + freshBonus) * comboMult * (this.feverActive ? 2 : 1) + this.mods.flatBonus;
      let bonus = 0;
      let note = null;
      if (p.type === 'critic') {
        if (frac >= 0.6) {
          bonus = 40;
          note = '好评！';
          this.criticGood++;
        } else {
          bonus = -20;
          note = '差评…';
        }
      }
      total = Math.round(total + bonus);
      this.coins = Math.max(0, this.coins + total);
      this.served++;
      p.state = 'happy';
      p.leaveT = 1.3;
      p.mood = frac;
      if (!this.feverActive) {
        this.fever = Math.min(100, this.fever + (9 + 11 * frac) * this.mods.feverGain);
      }
      if (p.type === 'grandma' && frac >= 0.3 && !this.feverActive) {
        this.fever = Math.min(100, this.fever + 15 * this.mods.feverGain);
        note = '送你一颗糖 🍬';
      }
      if (p.type === 'influencer' && frac >= 0.6) {
        for (const q of this.seats) {
          if (q && q !== p && q.state === 'wait') q.patience = Math.min(q.maxPatience, q.patience + q.maxPatience * 0.15);
        }
        note = '直播好评！全舱耐心 +15%';
      }
      if (type.boss) {
        this.bossServed = true;
        this.bossMood = frac;
      }
      this.emit('pay', {
        seat: p.seat,
        amount: total,
        freshBonus,
        tip: Math.round(tip),
        combo: this.combo,
        frac,
        note,
        ptype: p.type,
      });
    }

    makeAngry(p) {
      p.state = 'angry';
      p.leaveT = 1.3;
      this.angry++;
      this.combo = 0;
      let shielded = false;
      if (this.shield > 0) {
        this.shield--;
        shielded = true;
      } else {
        this.repLoss++;
      }
      if (SC.PTYPES[p.type].boss) this.bossFailed = true;
      this.emit('angry', { seat: p.seat, shielded, ptype: p.type });
      if (this.repLoss >= this.repLimit || this.bossFailed) {
        this.failed = true;
        this.finish();
      }
    }

    spawn(q, seat) {
      const type = SC.PTYPES[q.type];
      const nItems = q.order.length;
      const base = (this.cfg.patience || 30) + (this.cfg.patiencePerItem || 9) * (nItems - 1);
      const maxP = base * type.patience * this.mods.patienceMult * (q.patienceMult || 1);
      const p = {
        pid: this.nextPid++,
        seat,
        type: q.type,
        face: q.face || this.rng.pick(type.faces),
        order: q.order.map((id) => ({ id, done: false })),
        maxPatience: maxP,
        patience: maxP,
        state: 'board',
        stateT: 0.6,
        sleepT: q.sleep || 0,
        crying: false,
      };
      this.seats[seat] = p;
      this.emit('board', { seat });
    }

    finish() {
      if (this.done) return;
      this.done = true;
      this.emit('end', { failed: this.failed });
    }

    // ---------------- 主循环 ----------------
    tick(dt) {
      if (this.done || this.paused) return;
      if (dt > 0.25) dt = 0.25;
      const hold = this.hold;
      if (!hold) this.time += dt;
      const fever = this.feverActive;
      if (!fever && !hold && this.fever >= 100) this.feverIdleT = (this.feverIdleT || 0) + dt; // 狂热攒满却没用的时长
      if (fever && !hold) {
        this.feverT -= dt;
        if (this.feverT <= 0) {
          this.feverT = 0;
          this.fever = 0;
          this.emit('feverEnd');
        }
      }

      // 颠簸
      if (!hold) this.updateTurbulence(dt);

      // 烹饪
      const speed = this.mods.cookSpeed * (fever ? 2 : 1);
      for (let si = 0; si < this.stations.length; si++) {
        const st = this.stations[si];
        if (!st.slots) continue;
        for (const s of st.slots) {
          if (s.state === 'cooking') {
            s.t += dt * speed * (st.speed || 1);
            if (s.t >= st.def.time) {
              s.state = 'ready';
              s.burnT = 0;
              s.readyT = 0;
              this.emit('ready', { station: si });
            }
          } else if (s.state === 'ready') {
            s.readyT += dt;
            if (st.def.burn && !hold) {
              s.burnT += dt;
              if (s.burnT >= this.burnLimit(st)) {
                s.state = 'burnt';
                this.burnt++;
                this.emit('burn', { station: si });
              }
            }
          }
        }
      }

      // 登机
      while (!hold && this.queue.length && this.queue[0].t <= this.time) {
        const free = [];
        for (let i = 0; i < this.seats.length; i++) if (!this.seats[i]) free.push(i);
        if (!free.length) break;
        const q = this.queue.shift();
        this.spawn(q, this.rng.pick(free));
      }

      // 乘客
      for (let i = 0; i < this.seats.length; i++) {
        const p = this.seats[i];
        if (!p) continue;
        this.updatePassenger(p, dt, fever || hold);
        if (this.done) return;
      }

      // 自动送饮料（天赋）
      if (this.mods.autodrink > 0 && !this.seatbelt && !hold) {
        this.autodrinkT += dt;
        if (this.autodrinkT >= this.mods.autodrink) {
          this.autodrinkT = 0;
          this.autoServeDrink();
        }
      }

      if (!this.queue.length && this.seats.every((s) => !s)) this.finish();
    }

    autoServeDrink() {
      let best = null;
      let bestRid = null;
      for (const p of this.seats) {
        if (!p || p.state !== 'wait') continue;
        for (const o of p.order) {
          if (o.done) continue;
          const r = SC.RECIPES[o.id];
          if (r.parts.length !== 1) continue;
          const sid = SC.PART_SOURCE[r.parts[0]];
          if (SC.STATIONS[sid].kind !== 'dispenser') continue;
          if (!best || p.patience / p.maxPatience < best.patience / best.maxPatience) {
            best = p;
            bestRid = o.id;
          }
        }
      }
      if (best) this.deliver(best, bestRid, { auto: true });
    }

    updateTurbulence(dt) {
      if (this.turbState === 'active') {
        this.turbLeft -= dt;
        if (this.turbLeft <= 0) {
          this.turbState = 'none';
          this.emit('turbEnd');
        }
        return;
      }
      const next = this.turbs[0];
      if (!next) return;
      if (this.turbState === 'none' && this.time >= next.t - TURB_WARN) {
        this.turbState = 'warn';
        this.emit('turbWarn');
      }
      if (this.turbState === 'warn' && this.time >= next.t) {
        this.turbs.shift();
        this.turbState = 'active';
        this.turbLeft = next.dur;
        this.emit('turb');
      }
    }

    updatePassenger(p, dt, fever) {
      switch (p.state) {
        case 'board':
          p.stateT -= dt;
          if (p.stateT <= 0) {
            if (p.sleepT > 0) p.state = 'sleep';
            else {
              p.state = 'think';
              p.stateT = 0.8;
            }
          }
          break;
        case 'sleep':
          p.sleepT -= dt;
          if (p.sleepT <= 0) {
            p.state = 'think';
            p.stateT = 0.8;
            this.emit('wake', { seat: p.seat });
          }
          break;
        case 'think':
          p.stateT -= dt;
          if (p.stateT <= 0) {
            p.state = 'wait';
            this.emit('order', { seat: p.seat });
          }
          break;
        case 'wait': {
          p.waitT = (p.waitT || 0) + dt; // 已点单时长（模拟器用来模拟玩家“看到点单”的反应时间）
          if (fever) break;
          let rate = this.mods.drainMult;
          if (this.seatbelt) rate *= 0.4;
          if (this.nearCrying(p)) rate *= 1.5;
          p.patience -= dt * rate;
          const frac = p.patience / p.maxPatience;
          if (p.type === 'kid' && !this.mods.teddy) {
            const cry = frac < 0.35;
            if (cry && !p.crying) this.emit('cry', { seat: p.seat });
            p.crying = cry;
          }
          if (p.patience <= 0) {
            p.patience = 0;
            p.crying = false;
            this.makeAngry(p);
          }
          break;
        }
        case 'happy':
        case 'angry':
          p.leaveT -= dt;
          if (p.leaveT <= 0) {
            this.seats[p.seat] = null;
            this.emit('leave', { seat: p.seat });
          }
          break;
      }
    }

    nearCrying(p) {
      const col = p.seat % SEAT_COLS;
      for (const q of this.seats) {
        if (!q || q === p || !q.crying) continue;
        if (Math.abs((q.seat % SEAT_COLS) - col) <= 1) return true;
      }
      return false;
    }

    // UI 读取事件后清空
    drainEvents() {
      const e = this.events;
      this.events = [];
      return e;
    }
  }

  SC.Flight = Flight;
  SC.SEAT_COLS = SEAT_COLS;
  SC.FRESH_WINDOW = FRESH_WINDOW;
})(typeof window !== 'undefined' ? window : globalThis);
