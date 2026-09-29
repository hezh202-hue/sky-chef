// 关卡生成：生涯关卡、环球冒险航班、每日航班。所有随机都可由种子复现。
(function (root) {
  const SC = (root.SC = root.SC || {});

  // 乘客类型随城市/关卡逐步登场
  function typeWeights(c, l, extra) {
    const w = [['normal', 10]];
    const d = c * 6 + l;
    if (d >= 2) w.push(['kid', 2.5]);
    if (d >= 3) w.push(['grandma', 2]);
    if (d >= 4) w.push(['business', 2.5]);
    if (d >= 7) w.push(['influencer', 1.5]);
    if (d >= 13) w.push(['critic', 1.5]);
    if (extra) for (const e of extra) w.push(e);
    return w;
  }

  // 生成乘客序列
  function genPassengers(rng, o) {
    const list = [];
    let t = o.start || 1;
    const menu = o.menu;
    const kidMenu = menu.filter((id) => SC.RECIPES[id].kid);
    const newest = o.featured || [];
    // 波次登机：几位乘客扎堆登机（间隔约 1 秒），之后留出一段喘息时间。
    // 平均登机速度不变，但有忙有闲，更考验先后顺序的判断。
    const waveMax = o.wave || 1;
    let groupLeft = 0;
    let groupStart = t;
    let groupSpan = 0;
    for (let i = 0; i < o.count; i++) {
      if (waveMax > 1) {
        if (groupLeft <= 0) {
          if (i > 0) groupStart = Math.max(groupStart + groupSpan, t + 1.5);
          groupSpan = 0;
          t = groupStart;
          groupLeft = rng.int(Math.min(2, waveMax), waveMax);
        } else {
          t += rng.range(0.7, 1.2);
        }
      }
      const type = rng.weighted(o.types);
      let n = rng.weighted(o.itemWeights);
      if (type === 'critic') n = Math.max(n, 2);
      if (type === 'kid') n = Math.min(n, 2);
      n = Math.min(n, menu.length);
      const pool = type === 'kid' && kidMenu.length ? kidMenu : menu;
      const order = [];
      let guard = 0;
      while (order.length < n && guard++ < 50) {
        const entries = pool.map((id) => {
          let w = newest.includes(id) ? 2.2 : 1;
          if (SC.RECIPES[id].service) w *= 0.6;
          return [id, w];
        });
        const pick = rng.weighted(entries);
        if (!order.includes(pick) || pool.length < n) order.push(pick);
        if (pool.length === 1) break;
      }
      const q = { t: Math.round(t * 10) / 10, type, order };
      if (o.sleepChance && rng() < o.sleepChance) q.sleep = rng.range(5, 12);
      list.push(q);
      // load 模式：按这位乘客点单的“工作量”安排下一位的到达时间，保证每关的忙碌程度可控
      const g = o.load
        ? (order.reduce((s, id) => s + SC.recipeWork(id), 0) / o.load) * rng.range(0.75, 1.25)
        : o.gap * rng.range(0.7, 1.3) * (1 + 0.35 * (n - 1));
      if (waveMax > 1) {
        groupSpan += g;
        groupLeft--;
      } else t += g;
    }
    return list;
  }

  // 关卡基础价值：只按菜品原价计算，不受升级影响——升级让玩家更容易达标，而不是抬高目标
  function baseValue(passengers) {
    let v = 0;
    for (const p of passengers) for (const id of p.order) v += SC.RECIPES[id].price;
    return v;
  }

  // 完美服务（满耐心小费 + 满连击）约为基础菜价的 2 倍
  SC.targetsFor = (bv) => [Math.round(bv * 0.9), Math.round(bv * 1.4), Math.round(bv * 1.8)];

  function turbulenceTimes(rng, count, span) {
    const res = [];
    for (let i = 0; i < count; i++) {
      const t = span * ((i + 0.6) / (count + 0.4)) + rng.range(-4, 4);
      res.push({ t: Math.max(12, t), dur: rng.range(5, 7) });
    }
    return res.sort((a, b) => a.t - b.t);
  }

  // 生涯升级（机舱装饰 + 设备等级）与关前道具 -> 引擎修正
  SC.modsFromUpgrades = function (up, stationLv, boosters) {
    up = up || {};
    boosters = boosters || [];
    return {
      plates: 3 + (up.plates || 0) + (boosters.includes('tray') ? 1 : 0),
      patienceMult: (1 + 0.1 * (up.patience || 0)) * (boosters.includes('calm') ? 1.2 : 1),
      tipMult: 1 + 0.2 * (up.tip || 0),
      feverGain: 1 + 0.25 * (up.fever || 0),
      stationLv: Object.assign({}, stationLv || {}),
      startFever: boosters.includes('fever'),
    };
  };

  SC.menuFor = function (c, l) {
    const city = SC.CITIES[c];
    const menu = [];
    for (let i = 0; i <= l; i++) for (const id of city.unlocks[i]) if (!menu.includes(id)) menu.push(id);
    return menu;
  };

  // 一道菜的工作量 ≈ 需要点几下：每个部件一下，烹饪设备多一下（开火 + 取出），组合菜再加一下（端盘）
  SC.recipeWork = function (id) {
    const r = SC.RECIPES[id];
    let w = r.parts.length;
    for (const p of r.parts) if (SC.STATIONS[SC.PART_SOURCE[p]].kind === 'cooker') w += 1;
    if (r.parts.length > 1) w += 1;
    return w;
  };

  // 生涯难度曲线：每秒需要完成的操作数，随进度平滑上升；每座新城市第 1 关稍微放松，留时间熟悉新菜
  SC.campaignLoad = function (c, l) {
    const d = c * SC.LEVELS_PER_CITY + l;
    return 0.42 + 0.03 * d - (l === 0 && c > 0 ? 0.08 : 0);
  };

  // 每波最多几位乘客：前两关不扎堆，之后随进度逐渐变大
  function waveSize(c, l) {
    const d = c * SC.LEVELS_PER_CITY + l;
    if (d < 2) return 1;
    return Math.min(4, 2 + Math.floor(d / 8));
  }

  // ---------- 生涯关卡 ----------
  SC.campaignFlight = function (c, l, upgrades, stationLv, boosters) {
    const city = SC.CITIES[c];
    const seed = 1000 + c * 100 + l;
    const rng = SC.rng(seed);
    const menu = SC.menuFor(c, l);
    const featured = city.unlocks[l].length ? city.unlocks[l] : [];
    const count = 6 + l * 2 + c * 2;
    const gap = Math.max(2.4, 5.0 - l * 0.38 - c * 0.3 + (l >= 4 ? 0.4 : 0)) * (city.pace || 1);
    let itemWeights;
    if (c === 0 && l === 0) itemWeights = [[1, 1]];
    else if (c === 0 && l < 3) itemWeights = [[1, 3], [2, 1]];
    else if (l < 3) itemWeights = [[1, 3], [2, 2]];
    else if (l < 4) itemWeights = [[1, 3], [2, 3], [3, 1]];
    else itemWeights = [[1, 3], [2, 3], [3, 0.6]];
    const passengers = genPassengers(rng, {
      count,
      menu,
      featured,
      gap,
      load: SC.campaignLoad(c, l),
      itemWeights,
      types: typeWeights(c, l),
      wave: waveSize(c, l),
    });
    if (c === 0 && l === 0) {
      // 教学关：手工编排，饮品交替出现、间隔宽松，保证第一次玩的人能顺利体验成功
      const script = [
        [1, 'juice'],
        [6, 'coffee'],
        [13, 'juice'],
        [18, 'coffee'],
        [24, 'coffee'],
        [28, 'juice'],
      ];
      passengers.length = 0;
      for (const [t, id] of script) passengers.push({ t, type: 'normal', order: [id] });
    }
    let turbCount = 0;
    if (c === 0) turbCount = l >= 4 ? 1 : 0;
    else turbCount = l >= 1 ? 1 + (l >= 4 ? 1 : 0) : 0;
    const span = passengers[passengers.length - 1].t;
    const mods = SC.modsFromUpgrades(upgrades, stationLv, boosters);
    const bv = baseValue(passengers);
    const tuned = SC.CAMPAIGN_TARGETS && SC.CAMPAIGN_TARGETS[c + '-' + l];
    return {
      mode: 'campaign',
      city: c,
      level: l,
      seed,
      title: `${city.flag} ${city.route} · 第 ${l + 1} 班`,
      theme: city.theme,
      menu,
      featured,
      passengers,
      patience: Math.max(21, 30 - 0.36 * (c * SC.LEVELS_PER_CITY + l)),
      patiencePerItem: 9,
      turbulence: turbulenceTimes(rng, turbCount, span),
      mods,
      targets: tuned ? tuned.slice() : SC.targetsFor(bv),
      baseValue: bv,
      tutorial: c === 0 && l === 0,
    };
  };

  // ---------- 环球冒险航班 ----------
  // node: { kind: 'flight'|'storm'|'vip'|'night'|'boss', city, layer }
  SC.runFlight = function (node, run) {
    const rng = SC.rng(run.seed * 13 + node.layer * 101 + node.col * 7);
    const c = node.city;
    const city = SC.CITIES[c];
    const eqLevel = Math.min(5, 2 + Math.floor(node.layer * 0.6));
    // 从该城市完整菜单中随机选 4~5 道菜（保证至少一道组合菜）
    const full = SC.menuFor(c, 5).filter((id) => id !== 'blanket');
    const combos = full.filter((id) => SC.RECIPES[id].parts.length > 1);
    let menu = rng.shuffle(full).slice(0, Math.min(full.length, node.layer >= 4 ? 5 : 4));
    if (!menu.some((id) => SC.RECIPES[id].parts.length > 1) && combos.length) menu[0] = rng.pick(combos);
    // 组合菜的“简化版”也需要在菜单里（例如芝士汉堡 → 汉堡），保证盘子能逐步成型
    for (const id of menu.slice()) {
      const r = SC.RECIPES[id];
      if (r.parts.length > 2) {
        const simpler = full.find((x) => {
          const rr = SC.RECIPES[x];
          return rr.parts.length === 2 && rr.parts[0] === r.parts[0];
        });
        if (simpler && !menu.includes(simpler)) menu.push(simpler);
      }
    }
    const extra = [];
    let count = 9 + node.layer + rng.int(0, 2);
    let gap = Math.max(2.4, 4.8 - node.layer * 0.25);
    let turbCount = rng() < 0.5 ? 1 : 0;
    let sleepChance = 0;
    let rewardMult = 1;
    if (node.kind === 'storm') {
      turbCount = 3;
      rewardMult = 1.4;
    }
    if (node.kind === 'vip') {
      extra.push(['vip', 8], ['business', 6]);
      count = Math.round(count * 0.7);
      rewardMult = 1.6;
    }
    if (node.kind === 'night') {
      sleepChance = 0.6;
      if (!menu.includes('blanket')) menu.push('blanket');
      rewardMult = 1.2;
    }
    const types = node.kind === 'vip' ? [['vip', 6], ['business', 5], ['critic', 1.5]] : typeWeights(c, eqLevel, extra);
    const passengers = genPassengers(rng, {
      count,
      menu,
      gap,
      itemWeights: [[1, 3], [2, 3], [3, 1.2]],
      types,
      sleepChance,
    });
    if (node.kind === 'boss') {
      // 总统登机：点四道菜，耐心超长
      const order = rng.shuffle(menu.filter((id) => id !== 'blanket')).slice(0, 4);
      passengers.splice(3, 0, {
        t: passengers[3] ? passengers[3].t - 0.1 : 8,
        type: 'president',
        order,
        patienceMult: 2.2,
      });
      turbCount = 2;
      rewardMult = 2;
    }
    const span = passengers[passengers.length - 1].t;
    const mods = SC.runMods(run);
    const bv = baseValue(passengers);
    return {
      mode: 'run',
      city: c,
      seed: run.seed + node.layer,
      title: `${city.flag} ${nodeTitle(node)} · ${city.name}`,
      theme: node.kind === 'night' ? 'night' : node.kind === 'storm' ? 'storm' : city.theme,
      menu,
      featured: [],
      passengers,
      patience: Math.max(24, 32 - node.layer * 0.8),
      patiencePerItem: 9,
      turbulence: turbulenceTimes(rng, turbCount, span),
      mods,
      repLimit: run.rep,
      rewardMult,
      targets: SC.targetsFor(bv),
      baseValue: bv,
      boss: node.kind === 'boss',
    };
  };

  function nodeTitle(node) {
    return (
      { flight: '常规航班', storm: '风暴航线', vip: '头等舱专线', night: '红眼航班', boss: '总统专机' }[node.kind] ||
      '航班'
    );
  }
  SC.nodeTitle = nodeTitle;

  // ---------- 每日航班 ----------
  SC.DAILY_MODS = [
    { id: 'storm', name: '颠簸不断', emoji: '⛈️', desc: '全程多次气流颠簸' },
    { id: 'business', name: '商务日', emoji: '💼', desc: '满舱商务客：没耐心但小费多' },
    { id: 'kids', name: '儿童节', emoji: '🧸', desc: '大量小朋友登机' },
    { id: 'rush', name: '极速登机', emoji: '🏃', desc: '乘客登机速度 +40%' },
    { id: 'tips', name: '慷慨日', emoji: '💸', desc: '小费翻倍' },
    { id: 'plates', name: '备餐台维修', emoji: '🔧', desc: '备餐盘 -1' },
    { id: 'influencer', name: '网红专场', emoji: '📱', desc: '大量网红乘客' },
    { id: 'hot', name: '火力全开', emoji: '🔥', desc: '烹饪加速，但食物更容易焦' },
  ];

  SC.dailyFlight = function (dateKey, upgrades) {
    const seed = SC.hashString('daily-' + dateKey);
    const rng = SC.rng(seed);
    const c = rng.int(0, SC.CITIES.length - 1);
    const city = SC.CITIES[c];
    const modsPicked = rng.shuffle(SC.DAILY_MODS).slice(0, 2);
    const ids = modsPicked.map((m) => m.id);
    const menu = SC.menuFor(c, 5).filter((id) => id !== 'blanket');
    const extra = [];
    if (ids.includes('business')) extra.push(['business', 12]);
    if (ids.includes('kids')) extra.push(['kid', 10]);
    if (ids.includes('influencer')) extra.push(['influencer', 8]);
    let gap = 3.4;
    if (ids.includes('rush')) gap /= 1.4;
    const passengers = genPassengers(rng, {
      count: 20,
      menu,
      gap,
      itemWeights: [[1, 3], [2, 3], [3, 1]],
      types: typeWeights(c, 5, extra),
    });
    // 每日航班不吃生涯升级，保证公平
    const mods = {};
    if (ids.includes('tips')) mods.tipMult = 2;
    if (ids.includes('plates')) mods.plates = 2;
    if (ids.includes('hot')) {
      mods.cookSpeed = 1.4;
      mods.burnMult = 0.6;
    }
    const span = passengers[passengers.length - 1].t;
    const bv = baseValue(passengers);
    return {
      mode: 'daily',
      city: c,
      seed,
      dateKey,
      dailyMods: modsPicked,
      title: `📅 每日航班 ${dateKey} · ${city.flag}${city.name}`,
      theme: city.theme,
      menu,
      featured: [],
      passengers,
      patience: 30,
      patiencePerItem: 9,
      turbulence: turbulenceTimes(rng, ids.includes('storm') ? 4 : 1, span),
      mods,
      targets: SC.targetsFor(bv),
      baseValue: bv,
    };
  };

  SC._genPassengers = genPassengers;
})(typeof window !== 'undefined' ? window : globalThis);
