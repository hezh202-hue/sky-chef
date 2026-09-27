// 环球冒险（Roguelike）模式：航线地图、天赋卡、随机事件、免税店。
(function (root) {
  const SC = (root.SC = root.SC || {});

  // ---------- 天赋卡 ----------
  // rarity: 1 普通 2 稀有 3 史诗
  SC.PERKS = [
    { id: 'turbo', name: '涡轮咖啡机', emoji: '⚡', rarity: 1, desc: '烹饪速度 +20%', stack: true, apply: (m) => (m.cookSpeed *= 1.2) },
    { id: 'nonstick', name: '不粘锅', emoji: '🍳', rarity: 1, desc: '保温时间 +60%', stack: true, apply: (m) => (m.burnMult *= 1.6) },
    { id: 'smile', name: '职业微笑', emoji: '😊', rarity: 1, desc: '乘客耐心 +15%', stack: true, apply: (m) => (m.patienceMult *= 1.15) },
    { id: 'tipjar', name: '小费罐', emoji: '🫙', rarity: 1, desc: '小费 +35%', stack: true, apply: (m) => (m.tipMult *= 1.35) },
    { id: 'regular', name: '会员积分', emoji: '💳', rarity: 1, desc: '每位满意乘客额外 +4 金币', stack: true, apply: (m) => (m.flatBonus += 4) },
    { id: 'gyro', name: '稳定陀螺仪', emoji: '🧭', rarity: 1, desc: '颠簸持续时间 -50%', apply: (m) => (m.turbMult *= 0.5) },
    { id: 'teddy', name: '安抚玩偶', emoji: '🧸', rarity: 1, desc: '小朋友再也不会哭闹', apply: (m) => (m.teddy = true) },
    { id: 'warmhands', name: '暖心服务', emoji: '🤲', rarity: 1, desc: '每送达一件，恢复的耐心 +10%', stack: true, apply: (m) => (m.deliverHeal += 0.1) },
    { id: 'bigtray', name: '超大备餐台', emoji: '🍽️', rarity: 2, desc: '备餐盘 +1', stack: true, apply: (m) => (m.plates += 1) },
    { id: 'feverplus', name: '狂热引擎', emoji: '🔥', rarity: 2, desc: '狂热积累 +40%，持续 +3 秒', stack: true, apply: (m) => { m.feverGain *= 1.4; m.feverDur += 3; } },
    { id: 'combo', name: '连击大师', emoji: '🔗', rarity: 2, desc: '连击加成上限 +10 层', stack: true, apply: (m) => (m.comboCap += 10) },
    { id: 'calm', name: '机长广播', emoji: '📢', rarity: 2, desc: '每班航班抵消 1 次口碑损失', stack: true, apply: (m) => (m.shield += 1) },
    { id: 'vipcharm', name: '头等舱礼仪', emoji: '🥂', rarity: 2, desc: '商务客/贵宾小费 ×1.6', apply: (m) => (m.vipTip *= 1.6) },
    { id: 'music', name: '舒缓音乐', emoji: '🎵', rarity: 2, desc: '乘客耐心消耗 -15%', stack: true, apply: (m) => (m.drainMult *= 0.85) },
    { id: 'autodrink', name: '自动饮料车', emoji: '🛒', rarity: 3, desc: '每 9 秒自动为一位乘客送上饮料/即取食品', apply: (m) => (m.autodrink = 9) },
    { id: 'doubleslot', name: '双头炉灶', emoji: '🔥', rarity: 3, desc: '所有烹饪设备可同时做 2 份', apply: (m) => (m.cookerSlots = Math.max(m.cookerSlots, 2)) },
    { id: 'golden', name: '镀金餐具', emoji: '🏆', rarity: 3, desc: '菜品售价 +30%', stack: true, apply: (m) => (m.priceMult *= 1.3) },
  ];
  SC.PERK_BY_ID = {};
  for (const p of SC.PERKS) SC.PERK_BY_ID[p.id] = p;
  SC.RARITY = { 1: { name: '普通', cls: 'r1' }, 2: { name: '稀有', cls: 'r2' }, 3: { name: '史诗', cls: 'r3' } };

  SC.runMods = function (run) {
    const m = Object.assign({}, SC.DEFAULT_MODS);
    for (const id of run.perks) {
      const p = SC.PERK_BY_ID[id];
      if (p) p.apply(m);
    }
    if (run.curse === 'slow') m.cookSpeed *= 0.85;
    return m;
  };

  SC.rollPerks = function (run, n, rng) {
    const owned = new Set(run.perks);
    const pool = SC.PERKS.filter((p) => p.stack || !owned.has(p.id));
    const res = [];
    let guard = 0;
    while (res.length < n && guard++ < 200) {
      const rarity = rng.weighted([[1, 6], [2, 3], [3, 1 + run.layer * 0.15]]);
      const cand = pool.filter((p) => p.rarity === rarity && !res.includes(p));
      if (!cand.length) continue;
      res.push(rng.pick(cand));
    }
    return res;
  };

  // ---------- 航线地图 ----------
  // 类 Slay the Spire：多层节点，每个节点连向下一层相邻的 1~2 个节点。
  SC.NODE_KINDS = {
    flight: { name: '常规航班', emoji: '✈️', desc: '标准航班' },
    storm: { name: '风暴航线', emoji: '⛈️', desc: '频繁颠簸，奖励 ×1.4' },
    vip: { name: '头等舱专线', emoji: '👑', desc: '贵宾与商务客，奖励 ×1.6' },
    night: { name: '红眼航班', emoji: '🌙', desc: '乘客先睡觉再点单，需要毛毯，奖励 ×1.2' },
    shop: { name: '免税店', emoji: '🛍️', desc: '用旅费购买天赋、修复口碑' },
    event: { name: '随机事件', emoji: '❓', desc: '机上总有意外发生……' },
    rest: { name: '机组休息室', emoji: '☕', desc: '恢复 2 点口碑' },
    boss: { name: '总统专机', emoji: '🎩', desc: '最终航班：让总统满意！' },
  };

  SC.RUN_LAYERS = 8; // 第 0..6 层 + Boss 层

  SC.newRun = function (seed) {
    seed = seed >>> 0 || (Math.random() * 1e9) >>> 0;
    const rng = SC.rng(seed);
    const layers = [];
    for (let L = 0; L < SC.RUN_LAYERS - 1; L++) {
      const n = L === 0 ? 2 : rng.int(2, 3);
      const nodes = [];
      for (let i = 0; i < n; i++) {
        let kind;
        if (L === 0) kind = 'flight';
        else
          kind = rng.weighted([
            ['flight', 5],
            ['storm', L >= 2 ? 2 : 0.5],
            ['vip', L >= 2 ? 2 : 0.5],
            ['night', L >= 1 ? 1.5 : 0],
            ['shop', L >= 2 ? 1.6 : 0],
            ['event', 2],
            ['rest', L >= 3 ? 1 : 0],
          ]);
        nodes.push({ layer: L, col: i, kind, city: rng.int(0, SC.CITIES.length - 1), next: [] });
      }
      layers.push(nodes);
    }
    // 保证中段至少有一个商店
    const mid = layers[4];
    if (!layers.slice(2, 6).some((ns) => ns.some((n) => n.kind === 'shop'))) mid[0].kind = 'shop';
    layers.push([{ layer: SC.RUN_LAYERS - 1, col: 0, kind: 'boss', city: rng.int(0, SC.CITIES.length - 1), next: [] }]);

    // 连接
    for (let L = 0; L < layers.length - 1; L++) {
      const cur = layers[L];
      const nxt = layers[L + 1];
      for (let i = 0; i < cur.length; i++) {
        const pos = cur.length === 1 ? 0.5 : i / (cur.length - 1);
        const j = Math.round(pos * (nxt.length - 1));
        cur[i].next.push(j);
        if (nxt.length > 1 && rng() < 0.55) {
          const j2 = SC.clamp(j + (rng() < 0.5 ? -1 : 1), 0, nxt.length - 1);
          if (!cur[i].next.includes(j2)) cur[i].next.push(j2);
        }
      }
      // 每个下层节点至少有一个入口
      for (let j = 0; j < nxt.length; j++) {
        if (!cur.some((n) => n.next.includes(j))) {
          let best = 0;
          let bd = Infinity;
          for (let i = 0; i < cur.length; i++) {
            const pos = cur.length === 1 ? 0.5 : i / (cur.length - 1);
            const d = Math.abs(pos * (nxt.length - 1) - j);
            if (d < bd) {
              bd = d;
              best = i;
            }
          }
          cur[best].next.push(j);
        }
      }
    }
    return {
      seed,
      layers,
      layer: -1, // 当前所在层（-1 为出发前）
      col: -1,
      rep: 5,
      maxRep: 5,
      cash: 30,
      perks: [],
      curse: null,
      earned: 0,
      flights: 0,
      path: [],
      over: false,
      won: false,
    };
  };

  SC.runAvailableNodes = function (run) {
    if (run.layer < 0) return run.layers[0].map((n) => n);
    const cur = run.layers[run.layer][run.col];
    if (!cur || run.layer + 1 >= run.layers.length) return [];
    return cur.next.map((j) => run.layers[run.layer + 1][j]);
  };

  // ---------- 随机事件 ----------
  // 每个选项的 run(run, rng) 返回结果文案
  SC.RUN_EVENTS = [
    {
      id: 'birthday',
      title: '机长的生日',
      emoji: '🎂',
      text: '今天是机长生日，乘务组想偷偷准备一个惊喜。',
      choices: [
        { label: '花 25 旅费买蛋糕', cond: (r) => r.cash >= 25, run: (r) => { r.cash -= 25; r.maxRep += 1; r.rep = Math.min(r.maxRep, r.rep + 2); return '机长感动得广播了你的名字！口碑上限 +1，口碑 +2。'; } },
        { label: '唱首生日歌就好', run: (r) => { r.rep = Math.min(r.maxRep, r.rep + 1); return '全舱一起合唱，气氛不错。口碑 +1。'; } },
      ],
    },
    {
      id: 'stranger',
      title: '神秘旅客',
      emoji: '🕵️',
      text: '一位戴墨镜的旅客塞给你一个小盒子：“你会用得上的。”',
      choices: [
        { label: '打开看看', run: (r, rng) => { const p = rng.pick(SC.PERKS.filter((x) => x.rarity >= 2 && (x.stack || !r.perks.includes(x.id)))); r.perks.push(p.id); return `盒子里是【${p.emoji} ${p.name}】！${p.desc}`; } },
        { label: '礼貌拒绝', run: (r) => { r.cash += 20; return '旅客笑了笑，留下 20 旅费作为小费。'; } },
      ],
    },
    {
      id: 'inspection',
      title: '卫生突击检查',
      emoji: '🧪',
      text: '航空公司派来检查员，厨房有点乱……',
      choices: [
        { label: '连夜大扫除（-1 口碑，获得天赋）', cond: (r) => r.rep > 1, run: (r, rng) => { r.rep -= 1; const p = rng.pick(SC.PERKS.filter((x) => x.stack || !r.perks.includes(x.id))); r.perks.push(p.id); return `累坏了，但厨房焕然一新。获得【${p.emoji} ${p.name}】。`; } },
        { label: '塞点旅费（-30）', cond: (r) => r.cash >= 30, run: (r) => { r.cash -= 30; return '检查员满意地离开了。'; } },
        { label: '听天由命', run: (r, rng) => { if (rng() < 0.5) { r.rep -= 1; return '被记了一笔。口碑 -1。'; } return '运气不错，顺利过关！'; } },
      ],
    },
    {
      id: 'supplier',
      title: '食材供应商',
      emoji: '📦',
      text: '地勤说有一批进口厨具，但要占用一部分预算。',
      choices: [
        { label: '买涡轮厨具（-40 旅费）', cond: (r) => r.cash >= 40, run: (r) => { r.cash -= 40; r.perks.push('turbo'); return '获得【⚡ 涡轮咖啡机】。'; } },
        { label: '转手卖掉（+35 旅费，烹饪变慢）', cond: (r) => !r.curse, run: (r) => { r.cash += 35; r.curse = 'slow'; return '赚了一笔，但旧厨具让烹饪速度 -15%。'; } },
        { label: '算了', run: () => '你决定维持现状。' },
      ],
    },
    {
      id: 'lost',
      title: '迷路的小朋友',
      emoji: '🧒',
      text: '一个小朋友在机舱里迷路了，哭个不停。',
      choices: [
        { label: '陪他找爸妈', run: (r) => { r.rep = Math.min(r.maxRep, r.rep + 1); if (!r.perks.includes('teddy')) { r.perks.push('teddy'); return '家长送了你一个玩偶。获得【🧸 安抚玩偶】，口碑 +1。'; } return '家长非常感谢你。口碑 +1。'; } },
        { label: '交给同事', run: (r) => { r.cash += 10; return '你专心工作，多赚了 10 旅费。'; } },
      ],
    },
    {
      id: 'casino',
      title: '机上抽奖',
      emoji: '🎰',
      text: '免税商品抽奖活动！花 20 旅费抽一次？',
      choices: [
        { label: '抽！', cond: (r) => r.cash >= 20, run: (r, rng) => { r.cash -= 20; const x = rng(); if (x < 0.35) { r.cash += 60; return '中了大奖！+60 旅费！'; } if (x < 0.7) { const p = rng.pick(SC.PERKS.filter((q) => q.rarity === 1)); r.perks.push(p.id); return `抽到【${p.emoji} ${p.name}】。`; } return '谢谢参与……'; } },
        { label: '不赌了', run: () => '稳健是美德。' },
      ],
    },
    {
      id: 'celebrity',
      title: '明星乘客',
      emoji: '🌟',
      text: '一位大明星点名要你亲自做餐。',
      choices: [
        { label: '全力以赴（口碑上限 -1，获得史诗天赋）', cond: (r) => r.maxRep > 3, run: (r, rng) => { r.maxRep -= 1; r.rep = Math.min(r.rep, r.maxRep); const pool = SC.PERKS.filter((x) => x.rarity === 3 && (x.stack || !r.perks.includes(x.id))); const p = rng.pick(pool.length ? pool : SC.PERKS); r.perks.push(p.id); return `明星大赞！获得【${p.emoji} ${p.name}】。`; } },
        { label: '按标准流程', run: (r) => { r.cash += 25; return '明星礼貌道谢，留下 25 旅费。'; } },
      ],
    },
  ];

  // ---------- 免税店 ----------
  SC.shopStock = function (run, rng) {
    const perks = SC.rollPerks(run, 3, rng).map((p) => ({ kind: 'perk', perk: p, price: [0, 40, 70, 110][p.rarity] }));
    const items = perks;
    items.push({ kind: 'heal', price: 35, name: '口碑修复', emoji: '❤️', desc: '口碑 +2' });
    items.push({ kind: 'maxrep', price: 60, name: '会员升级', emoji: '💖', desc: '口碑上限 +1 并回复 1 点' });
    if (run.curse) items.push({ kind: 'uncurse', price: 30, name: '厨具翻新', emoji: '🔧', desc: '移除“旧厨具”负面效果' });
    return items;
  };
})(typeof window !== 'undefined' ? window : globalThis);
