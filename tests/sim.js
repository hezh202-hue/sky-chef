// 无头测试：加载游戏逻辑，用机器人玩家跑遍所有关卡，检查引擎正确性与难度曲线。
// 用法：node tests/sim.js [--verbose]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ctx = { console, Math, Date, JSON, Object, Array, Set, Map, Infinity };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['util.js', 'data.js', 'engine.js', 'levels.js', 'run.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
}
const SC = ctx.SC;
const verbose = process.argv.includes('--verbose');

// ---------- 机器人 ----------
// delay：两次操作的最短间隔（秒），模拟玩家手速
function botStep(f, sloppy) {
  if (sloppy && Math.random() < sloppy) {
    // 手滑：随便点一下
    if (Math.random() < 0.7) return f.tapStation(Math.floor(Math.random() * f.stations.length)), true;
    return f.tapPlate(Math.floor(Math.random() * f.plates.length)), true;
  }
  if (f.fever >= 100 && !f.feverActive) return f.activateFever();
  const dem = f.demand(false);
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
  const dem = f.demand(false);
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

function playFlight(cfg, delay, sloppy) {
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

// ---------- 单元测试 ----------
function unitTests() {
  // 菜谱匹配
  const cfg = SC.campaignFlight(1, 4, {});
  const f = new SC.Flight(cfg);
  assert.strictEqual(f.recipeFor(['bun', 'patty']).id, 'burger');
  assert.strictEqual(f.recipeFor(['bun', 'cheese', 'patty']).id, 'cheeseburger');
  assert.ok(f.canExtend(['bun'], 'patty'));
  assert.ok(f.canExtend(['bun', 'patty'], 'lettuce'));
  assert.ok(!f.canExtend(['bun'], 'sausage'));
  assert.ok(!f.canExtend(['bun', 'patty'], 'patty'));
  assert.ok(f.isBase('bun'));
  assert.ok(!f.isBase('cheese'));

  // 烹饪与烤焦
  const g = new SC.Flight({ menu: ['burger'], passengers: [{ t: 999, type: 'normal', order: ['burger'] }], seed: 1 });
  const gi = g.stations.findIndex((s) => s.id === 'grill');
  g.tapStation(gi);
  assert.strictEqual(g.stations[gi].slots[0].state, 'cooking');
  for (let i = 0; i < 100; i++) g.tick(0.05);
  assert.strictEqual(g.stations[gi].slots[0].state, 'ready');
  for (let i = 0; i < 200; i++) g.tick(0.05);
  assert.strictEqual(g.stations[gi].slots[0].state, 'burnt');
  assert.strictEqual(g.burnt, 1);
  g.tapStation(gi);
  assert.strictEqual(g.stations[gi].slots[0].state, 'idle');

  // 完整服务流程
  const h = new SC.Flight({ menu: ['burger', 'cola'], passengers: [{ t: 0, type: 'normal', order: ['burger', 'cola'] }], seed: 2 });
  for (let i = 0; i < 40; i++) h.tick(0.05);
  const p = h.seats.find(Boolean);
  assert.strictEqual(p.state, 'wait');
  const si = (id) => h.stations.findIndex((s) => s.id === id);
  h.tapStation(si('cola'));
  assert.ok(p.order.find((o) => o.id === 'cola').done, 'cola auto delivered');
  h.tapStation(si('bun'));
  assert.strictEqual(JSON.stringify(h.plates[0].parts), JSON.stringify(['bun']));
  h.tapStation(si('grill'));
  for (let i = 0; i < 100; i++) h.tick(0.05);
  h.tapStation(si('grill'));
  assert.strictEqual(JSON.stringify(h.plates[0].parts), JSON.stringify(['bun', 'patty']));
  assert.ok(h.tapPlate(0));
  assert.strictEqual(h.served, 1);
  assert.ok(h.coins > 30);
  for (let i = 0; i < 60; i++) h.tick(0.05);
  assert.ok(h.done, 'flight ends when everyone leaves');

  // 颠簸时不能上菜
  const k = new SC.Flight({ menu: ['cola'], passengers: [{ t: 0, type: 'normal', order: ['cola'] }], turbulence: [{ t: 3, dur: 5 }], seed: 3 });
  for (let i = 0; i < 70; i++) k.tick(0.05);
  assert.ok(k.seatbelt);
  k.tapStation(0);
  assert.ok(k.plates[0], 'during turbulence item goes to plate');
  assert.ok(!k.tapPlate(0));
  for (let i = 0; i < 120; i++) k.tick(0.05);
  assert.ok(!k.seatbelt);
  assert.ok(k.tapPlate(0));

  // 生气离开 & 口碑上限导致失败
  const a = new SC.Flight({ menu: ['cola'], passengers: [{ t: 0, type: 'normal', order: ['cola'] }], repLimit: 1, patience: 5, seed: 4 });
  for (let i = 0; i < 400 && !a.done; i++) a.tick(0.05);
  assert.ok(a.failed && a.angry === 1);

  // 狂热
  const fv = new SC.Flight({ menu: ['cola'], passengers: [{ t: 0, type: 'normal', order: ['cola'] }], seed: 5 });
  fv.fever = 100;
  assert.ok(fv.activateFever());
  assert.ok(fv.feverActive);

  // 环球地图连通性
  for (let s = 1; s < 60; s++) {
    const run = SC.newRun(s);
    assert.strictEqual(run.layers.length, SC.RUN_LAYERS);
    for (let L = 1; L < run.layers.length; L++) {
      for (let j = 0; j < run.layers[L].length; j++) {
        assert.ok(run.layers[L - 1].some((n) => n.next.includes(j)), `node ${L}:${j} reachable (seed ${s})`);
      }
    }
    for (const node of run.layers.flat()) {
      if (['flight', 'storm', 'vip', 'night', 'boss'].includes(node.kind)) {
        const c = SC.runFlight(node, run);
        assert.ok(c.passengers.length > 3);
        new SC.Flight(c); // 能正常构建
      }
    }
  }
  console.log('✔ 单元测试全部通过');
}

// ---------- 难度曲线 ----------
function balance() {
  const skills = [
    ['高手', 0.3],
    ['普通', 0.55],
    ['新手', 0.9],
    ['手残', 1.0, 0.2],
  ];
  const rows = [];
  let ok = true;
  for (let c = 0; c < SC.CITIES.length; c++) {
    for (let l = 0; l < SC.LEVELS_PER_CITY; l++) {
      const row = [`${SC.CITIES[c].name}-${l + 1}`];
      for (const [, delay, sloppy] of skills) {
        const cfg = SC.campaignFlight(c, l, {});
        const f = playFlight(cfg, delay, sloppy);
        row.push(`${f.stars}★ r${(f.coins / cfg.baseValue).toFixed(2)} 怒${f.angry}/${f.totalPassengers} ${Math.round(f.time)}s`);
        if (delay === 0.3 && f.stars < 2) ok = false;
      }
      rows.push(row);
    }
  }
  console.log('\n关卡            ' + skills.map((s) => s[0].padEnd(24)).join(''));
  for (const r of rows) console.log(r[0].padEnd(12) + r.slice(1).map((x) => x.padEnd(26)).join(''));
  if (!ok) console.log('⚠ 有关卡连高手机器人都拿不到 2 星');

  // 环球冒险：跑几条完整路线
  let wins = 0;
  const N = 20;
  for (let s = 1; s <= N; s++) {
    const run = SC.newRun(s * 977);
    const rng = SC.rng(s);
    while (!run.over) {
      const opts = SC.runAvailableNodes(run);
      if (!opts.length) break;
      const node = opts.find((n) => ['flight', 'storm', 'vip', 'night', 'boss'].includes(n.kind)) || opts[0];
      run.layer = node.layer;
      run.col = node.col;
      if (['flight', 'storm', 'vip', 'night', 'boss'].includes(node.kind)) {
        const cfg = SC.runFlight(node, run);
        const f = playFlight(cfg, 0.45);
        run.rep -= f.repLoss;
        if (f.failed || run.rep <= 0) {
          run.over = true;
          break;
        }
        if (f.angry === 0) run.rep = Math.min(run.maxRep, run.rep + 1);
        run.cash += Math.round(f.coins * cfg.rewardMult * 0.25);
        run.perks.push(SC.rollPerks(run, 3, rng)[0].id);
        if (node.kind === 'boss') {
          run.won = true;
          run.over = true;
        }
      }
    }
    if (run.won) wins++;
    if (verbose) console.log(`run ${s}: ${run.won ? '胜利' : '失败'} 层${run.layer} 口碑${run.rep} perks=${run.perks.join(',')}`);
  }
  console.log(`\n环球冒险（普通偏上机器人，只选航班节点）胜率：${wins}/${N}`);
}

unitTests();
balance();
