// 机器人玩家与游戏逻辑加载器：供 sim.js（测试 + 平衡报告）和 calibrate.js（星级目标校准）共用。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// 在沙箱里加载纯逻辑脚本（不含 DOM）
function loadGame() {
  const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Infinity };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['util.js', 'data.js', 'targets.js', 'engine.js', 'levels.js', 'run.js', 'save.js']) {
    const file = path.join(__dirname, '..', 'js', f);
    if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: f });
  }
  return ctx.SC;
}
const SC = loadGame();

// 四档玩家：[名称, 操作间隔(秒), 失误率, 反应时间(秒)]
const SKILLS = [
  ['高手', 0.3, 0, 0.4],
  ['普通', 0.55, 0.03, 1.0],
  ['新手', 0.9, 0.06, 1.8],
  ['手残', 1.0, 0.2, 2.5],
];

// ---------- 机器人 ----------
// delay：两次操作的最短间隔（秒），模拟玩家手速
// LAG：乘客点单后多久机器人才“注意到”（秒），模拟真人看单、找设备的反应时间
let LAG = 0;
let RNG = Math.random; // 每局用固定种子，保证模拟结果可复现
function visibleDemand(f) {
  const d = {};
  for (const p of f.seats) {
    if (!p || p.state !== 'wait' || (p.waitT || 0) < LAG) continue;
    for (const o of p.order) if (!o.done) d[o.id] = (d[o.id] || 0) + 1;
  }
  return d;
}
function botStep(f, sloppy) {
  if (sloppy && RNG() < sloppy) {
    // 手滑：随便点一下
    if (RNG() < 0.7) return f.tapStation(Math.floor(RNG() * f.stations.length)), true;
    return f.tapPlate(Math.floor(RNG() * f.plates.length)), true;
  }
  if (f.fever >= 100 && !f.feverActive) {
    // 熟练玩家会等人多的时候再开狂热；新手一满就点
    const waiting = f.seats.filter((p) => p && p.state === 'wait').length;
    if (LAG >= 1.5 || waiting >= 3 || (f.feverIdleT || 0) > 6 || !f.queue.length) return f.activateFever();
  }
  const dem = visibleDemand(f);
  // 1. 送出完成的菜
  if (!f.seatbelt) {
    for (let i = 0; i < f.plates.length; i++) {
      const pl = f.plates[i];
      if (!pl) continue;
      const r = f.recipeFor(pl.parts);
      if (r && dem[r.id] && !f.canExtendAny(pl.parts)) return f.tapPlate(i);
      if (r && dem[r.id] && !anyNeedsExtension(f, pl, dem)) return f.tapPlate(i);
    }
  }
  // 2. 清理焦糊
  for (let i = 0; i < f.stations.length; i++) {
    const st = f.stations[i];
    if (st.slots && st.slots.some((s) => s.state === 'burnt')) return f.tapStation(i);
  }
  const need = remainingNeed(f);
  // 3. 取出做好的东西 / 配料
  for (let i = 0; i < f.stations.length; i++) {
    const st = f.stations[i];
    const part = st.def.out;
    if (st.def.kind === 'cooker') {
      if (st.slots.some((s) => s.state === 'ready') && usefulPart(f, part, need)) return f.tapStation(i);
    } else if (st.def.kind === 'dispenser') {
      if (usefulPart(f, part, need)) return f.tapStation(i);
    }
  }
  // 4. 起新盘
  for (let i = 0; i < f.stations.length; i++) {
    const st = f.stations[i];
    if (st.def.kind !== 'base') continue;
    if ((need.base[st.def.out] || 0) > 0 && f.plates.includes(null)) return f.tapStation(i);
  }
  // 5. 开火
  for (let i = 0; i < f.stations.length; i++) {
    const st = f.stations[i];
    if (st.def.kind !== 'cooker') continue;
    const part = st.def.out;
    const inProgress = st.slots.filter((s) => s.state === 'cooking' || s.state === 'ready').length;
    if ((need.part[part] || 0) > inProgress && st.slots.some((s) => s.state === 'idle')) return f.tapStation(i);
  }
  // 6. 清理没用的盘子
  if (!f.plates.includes(null)) {
    for (let i = 0; i < f.plates.length; i++) {
      const pl = f.plates[i];
      const useful = Object.keys(dem).some((id) => {
        const r = SC.RECIPES[id];
        return r.parts[0] === pl.parts[0] && pl.parts.every((x) => r.parts.includes(x));
      });
      if (!useful) return f.discardPlate(i);
    }
  }
  return false;
}

function anyNeedsExtension(f, pl, dem) {
  for (const id in dem) {
    const r = SC.RECIPES[id];
    if (r.parts.length > pl.parts.length && r.parts[0] === pl.parts[0] && pl.parts.every((p) => r.parts.includes(p))) {
      // 如果当前盘子本身也有人要，就直接送
      const cur = f.recipeFor(pl.parts);
      if (cur && dem[cur.id] > 0) return false;
      return true;
    }
  }
  return false;
}

// 还需要多少部件（扣除盘子上已有的）
function remainingNeed(f) {
  const dem = visibleDemand(f);
  const part = {};
  const base = {};
  // 盘子上已有的菜按需求抵扣
  const plates = f.plates.filter(Boolean).map((p) => p.parts.slice());
  const used = new Set();
  for (const id in dem) {
    const r = SC.RECIPES[id];
    for (let k = 0; k < dem[id]; k++) {
      // 找一个能成为 r 的盘子
      let pi = -1;
      for (let i = 0; i < plates.length; i++) {
        if (used.has(i)) continue;
        const pp = plates[i];
        if (pp[0] === r.parts[0] && pp.every((x) => r.parts.includes(x))) {
          pi = i;
          break;
        }
      }
      if (pi >= 0) {
        used.add(pi);
        for (const x of r.parts) if (!plates[pi].includes(x)) part[x] = (part[x] || 0) + 1;
      } else {
        if (r.parts.length > 1) base[r.parts[0]] = (base[r.parts[0]] || 0) + 1;
        for (const x of r.parts.length > 1 ? r.parts.slice(1) : r.parts) part[x] = (part[x] || 0) + 1;
      }
    }
  }
  return { part, base };
}

function usefulPart(f, part, need) {
  if (!(need.part[part] > 0)) return false;
  const single = f.singleRecipe(part);
  if (single) return !f.seatbelt ? !!f.findPassengerFor(single.id) || f.plates.includes(null) : f.plates.includes(null);
  return f.plates.some((pl) => pl && f.canExtend(pl.parts, part));
}

function playFlight(cfg, delay, sloppy, lag, botSeed) {
  LAG = lag || 0;
  RNG = SC.rng(((cfg.seed || 1) * 7919 + Math.round((delay || 0) * 1000) + (botSeed || 0) * 104729) >>> 0);
  const f = new SC.Flight(cfg);
  const dt = 0.05;
  let cd = 0;
  let steps = 0;
  while (!f.done && steps < 20 * 60 * 20) {
    f.tick(dt);
    cd -= dt;
    if (cd <= 0) {
      if (botStep(f, sloppy)) cd = delay;
    }
    f.drainEvents();
    steps++;
  }
  assert.ok(f.done, 'flight should finish');
  return f;
}

// 同一档玩家跑多次（不同失误种子）取平均金币，减少偶然性
function avgCoins(cfg, skill, runs) {
  const [, delay, sloppy, lag] = skill;
  let sum = 0;
  for (let i = 0; i < runs; i++) sum += playFlight(cfg, delay, sloppy, lag, i).coins;
  return Math.round(sum / runs);
}

module.exports = { SC, loadGame, SKILLS, playFlight, avgCoins };
