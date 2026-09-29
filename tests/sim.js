// 无头测试：加载游戏逻辑，用机器人玩家跑遍所有关卡，检查引擎正确性与难度曲线。
// 用法：node tests/sim.js [--verbose]
const assert = require('assert');
const { SC, SKILLS, playFlight } = require('./bot');
const verbose = process.argv.includes('--verbose');

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
  const servedEvents = h.drainEvents();
  assert.ok(servedEvents.some((e) => e.type === 'take' && e.fresh), 'fresh-cooked patty is picked up in time');
  assert.ok(servedEvents.some((e) => e.type === 'pay' && e.freshBonus > 0), 'fresh assembly receives a bonus');
  assert.strictEqual(h.freshDishes, 1);
  for (let i = 0; i < 60; i++) h.tick(0.05);
  assert.ok(h.done, 'flight ends when everyone leaves');

  const stale = new SC.Flight({ menu: ['coffee'], passengers: [{ t: 0, type: 'normal', order: ['coffee'] }], seed: 22 });
  const coffee = stale.stations.findIndex((s) => s.id === 'coffee');
  for (let i = 0; i < 40; i++) stale.tick(0.05);
  stale.tapStation(coffee);
  for (let i = 0; i < 105; i++) stale.tick(0.05);
  stale.tapStation(coffee);
  assert.strictEqual(stale.freshDishes, 0, 'coffee picked up after the hot window is not fresh');
  assert.ok(stale.drainEvents().some((e) => e.type === 'pay' && e.freshBonus === 0));

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
  // 设备升级：1 级更快、2 级双份、3 级保温翻倍；售价按部件平均加成
  const up = new SC.Flight({ menu: ['burger', 'cola'], passengers: [{ t: 999, type: 'normal', order: ['burger'] }], seed: 9, mods: { stationLv: { grill: 3, cola: 2 } } });
  const grill = up.stations.find((s) => s.id === 'grill');
  assert.strictEqual(grill.slots.length, 2, '2 级烹饪设备可同时做 2 份');
  assert.strictEqual(grill.speed, 1.3);
  assert.strictEqual(up.burnLimit(grill), SC.STATIONS.grill.burn * 2);
  assert.ok(Math.abs(up.recipePrice('cola') - 8 * 1.24) < 1e-9, '即取设备 2 级售价 +24%');
  assert.ok(Math.abs(up.recipePrice('burger') - 22 * (1 + 0.3 / 2)) < 1e-9, '组合菜取部件平均加成');
  const up0 = new SC.Flight({ menu: ['burger'], passengers: [{ t: 999, type: 'normal', order: ['burger'] }], seed: 9 });
  up0.tapStation(up0.stations.findIndex((s) => s.id === 'grill'));
  for (let i = 0; i < 60; i++) up0.tick(0.05);
  up.tapStation(up.stations.indexOf(grill));
  for (let i = 0; i < 60; i++) up.tick(0.05);
  assert.ok(grill.slots[0].t > up0.stations.find((s) => s.id === 'grill').slots[0].t, '升级后烹饪更快');

  // 关前道具
  const bm = SC.modsFromUpgrades({ plates: 1 }, {}, ['fever', 'calm', 'tray']);
  assert.strictEqual(bm.plates, 5);
  assert.ok(Math.abs(bm.patienceMult - 1.2) < 1e-9);
  assert.strictEqual(new SC.Flight(SC.campaignFlight(0, 2, {}, {}, ['fever'])).fever, 100);

  // 升级不应抬高星级目标
  assert.deepStrictEqual(SC.campaignFlight(2, 3, {}).targets, SC.campaignFlight(2, 3, { tip: 3 }, { oven: 3 }).targets);

  // 存档 v1 -> v2：退还旧升级、补发星钻
  SC.Save.data = Object.assign(SC.Save.data, { v: 1, coins: 10, upgrades: { speed: 2, slots: 1, patience: 1 }, stars: { '0-0': 3, '0-1': 2 }, ach: { first_flight: 1 }, gems: 0 });
  SC.Save.migrateV2({ v: 1 });
  assert.strictEqual(SC.Save.data.coins, 10 + 80 + 200 + 700);
  assert.deepStrictEqual(Object.keys(SC.Save.data.upgrades), ['patience']);
  assert.strictEqual(SC.Save.data.gems, 5 + SC.GEMS_PER_ACH);
  SC.Save.reset();

  // 波次登机：同一波乘客间隔短
  const wave = SC.campaignFlight(3, 5, {}).passengers;
  assert.ok(wave.some((p, i) => i > 0 && p.t - wave[i - 1].t < 1.3), '后期关卡有扎堆登机');
  for (let i = 1; i < wave.length; i++) assert.ok(wave[i].t >= wave[i - 1].t, '登机时间递增');

  console.log('✔ 单元测试全部通过');
}

// ---------- 难度曲线 ----------
function balance() {
  const skills = SKILLS;
  const rows = [];
  let ok = true;
  for (let c = 0; c < SC.CITIES.length; c++) {
    for (let l = 0; l < SC.LEVELS_PER_CITY; l++) {
      const row = [`${SC.CITIES[c].name}-${l + 1}`];
      for (const [, delay, sloppy, lag] of skills) {
        const cfg = SC.campaignFlight(c, l, {});
        const f = playFlight(cfg, delay, sloppy, lag);
        row.push(`${f.stars}★ ${f.coins}💰 怒${f.angry}/${f.totalPassengers}`);
        if (lag === 1.8 && f.stars < 1) ok = false;
      }
      rows.push(row);
    }
  }
  console.log('\n关卡            ' + skills.map((s) => s[0].padEnd(24)).join(''));
  for (const r of rows) console.log(r[0].padEnd(12) + r.slice(1).map((x) => x.padEnd(26)).join(''));
  if (!ok) console.log('⚠ 有关卡新手不升级就过不了关');
  progression();

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

// ---------- 成长曲线：普通玩家按顺序打生涯，赚钱就升级，没三星会重打几次 ----------
function progression() {
  const skill = SKILLS[1];
  const st = { coins: 0, upgrades: {}, stationLv: {}, gems: 0 };
  const best = {};
  const rows = [];
  // 贪心：先买最便宜的、下一关用得到的设备升级，其次机舱装饰
  function shop(c, l) {
    for (;;) {
      const opts = [];
      const menu = SC.menuFor(c, Math.min(SC.LEVELS_PER_CITY - 1, l + 1));
      for (const sid of SC.Flight.stationsForMenu(menu)) {
        const lv = st.stationLv[sid] || 0;
        const cost = SC.stationUpgradeCost(sid, lv);
        if (cost != null) opts.push({ cost, buy: () => (st.stationLv[sid] = lv + 1) });
      }
      for (const u of SC.UPGRADES) {
        const lv = st.upgrades[u.id] || 0;
        if (lv < u.costs.length) opts.push({ cost: u.costs[lv] * 1.3, real: u.costs[lv], buy: () => (st.upgrades[u.id] = lv + 1) });
      }
      opts.sort((a, b) => a.cost - b.cost);
      const o = opts[0];
      if (!o || (o.real || o.cost) > st.coins) return;
      st.coins -= o.real || o.cost;
      o.buy();
    }
  }
  for (let c = 0; c < SC.CITIES.length; c++) {
    for (let l = 0; l < SC.LEVELS_PER_CITY; l++) {
      const key = c + '-' + l;
      let tries = 0;
      let first = null;
      do {
        tries++;
        const f = playFlight(SC.campaignFlight(c, l, st.upgrades, st.stationLv), skill[1], skill[2], skill[3], tries);
        if (first == null) first = f.stars;
        st.coins += f.coins;
        if (f.stars > (best[key] || 0)) {
          st.gems += f.stars - (best[key] || 0);
          best[key] = f.stars;
        }
        shop(c, l);
      } while ((best[key] || 0) < 3 && tries < 3);
      const owned = Object.values(st.stationLv).reduce((a, b) => a + b, 0) + Object.values(st.upgrades).reduce((a, b) => a + b, 0);
      rows.push(`${SC.CITIES[c].name}-${l + 1}`.padEnd(10) + `首次${first}★ 最终${best[key] || 0}★ 打了${tries}次`.padEnd(22) + `已升级${owned}项 余${st.coins}💰 💎${st.gems}`);
    }
  }
  console.log('\n成长曲线（普通玩家，赚钱就升级，没三星最多打 3 次）');
  for (const r of rows) console.log(r);
}

unitTests();
balance();
