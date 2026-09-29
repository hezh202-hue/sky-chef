// 游戏静态数据：食材、厨房设备、菜谱、城市、乘客类型、升级、成就。
(function (root) {
  const SC = (root.SC = root.SC || {});

  // ---------- 食材 / 成品 ----------
  // 每个“部件”都由某个设备产出；单部件菜谱 = 直接端给乘客的成品。
  SC.ITEMS = {
    juice: { name: '橙汁', emoji: '🧃' },
    coffee: { name: '咖啡', emoji: '☕' },
    xlb: { name: '小笼包', emoji: '🥟' },
    soymilk: { name: '豆浆', emoji: '🥛' },
    blanket: { name: '毛毯', emoji: '🧣' },
    crepe: { name: '煎饼皮', emoji: '🫓' },
    egg: { name: '煎蛋', emoji: '🍳' },
    scallion: { name: '葱花', emoji: '🌿' },

    cola: { name: '可乐', emoji: '🥤' },
    fries: { name: '薯条', emoji: '🍟' },
    bun: { name: '汉堡胚', emoji: '🍞' },
    patty: { name: '肉饼', emoji: '🍖' },
    cheese: { name: '芝士', emoji: '🧀' },
    lettuce: { name: '生菜', emoji: '🥬' },
    hdbun: { name: '热狗面包', emoji: '🥖' },
    sausage: { name: '香肠', emoji: '🥓' },

    wine: { name: '红酒', emoji: '🍷' },
    croissant: { name: '可颂', emoji: '🥐' },
    plate: { name: '餐盘', emoji: '🍽️' },
    steak: { name: '牛排', emoji: '🥩' },
    broccoli: { name: '西兰花', emoji: '🥦' },
    cake: { name: '蛋糕', emoji: '🍰' },

    matcha: { name: '抹茶', emoji: '🍵' },
    onigiri: { name: '饭团', emoji: '🍙' },
    rice: { name: '寿司饭', emoji: '🍚' },
    fish: { name: '三文鱼', emoji: '🐟' },
    bowl: { name: '汤碗', emoji: '🥣' },
    noodle: { name: '拉面', emoji: '🍝' },
    tamago: { name: '溏心蛋', emoji: '🥚' },
    tempura: { name: '天妇罗', emoji: '🍤' },
  };

  // ---------- 厨房设备 ----------
  // kind: dispenser 即取即用 / cooker 需要烹饪（可能烤焦）/ base 生成一个新餐盘底
  SC.STATIONS = {
    juicer: { name: '榨汁机', emoji: '🍊', kind: 'dispenser', out: 'juice' },
    coffee: { name: '咖啡机', emoji: '☕', kind: 'cooker', out: 'coffee', time: 3.2 },
    steamer: { name: '蒸笼', emoji: '🥟', kind: 'cooker', out: 'xlb', time: 4.5, burn: 6 },
    soy: { name: '豆浆机', emoji: '🥛', kind: 'dispenser', out: 'soymilk' },
    locker: { name: '行李柜', emoji: '🧳', kind: 'dispenser', out: 'blanket' },
    crepe: { name: '面糊', emoji: '🫓', kind: 'base', out: 'crepe' },
    griddle: { name: '煎蛋锅', emoji: '🍳', kind: 'cooker', out: 'egg', time: 3.5, burn: 6 },
    scallion: { name: '葱花', emoji: '🌿', kind: 'dispenser', out: 'scallion' },

    cola: { name: '汽水机', emoji: '🥤', kind: 'dispenser', out: 'cola' },
    fryer: { name: '炸锅', emoji: '🍟', kind: 'cooker', out: 'fries', time: 3.8, burn: 6 },
    bun: { name: '面包篮', emoji: '🍞', kind: 'base', out: 'bun' },
    grill: { name: '烤肉架', emoji: '🍖', kind: 'cooker', out: 'patty', time: 4.2, burn: 5.5 },
    cheese: { name: '芝士', emoji: '🧀', kind: 'dispenser', out: 'cheese' },
    lettuce: { name: '生菜', emoji: '🥬', kind: 'dispenser', out: 'lettuce' },
    hdbun: { name: '热狗面包', emoji: '🥖', kind: 'base', out: 'hdbun' },
    sausage: { name: '香肠烤架', emoji: '🥓', kind: 'cooker', out: 'sausage', time: 3.6, burn: 5.5 },

    wine: { name: '酒柜', emoji: '🍷', kind: 'dispenser', out: 'wine' },
    oven: { name: '烤箱', emoji: '🥐', kind: 'cooker', out: 'croissant', time: 5, burn: 6 },
    plate: { name: '餐盘架', emoji: '🍽️', kind: 'base', out: 'plate' },
    steakgrill: { name: '牛排煎锅', emoji: '🥩', kind: 'cooker', out: 'steak', time: 5, burn: 5 },
    broccoli: { name: '西兰花', emoji: '🥦', kind: 'dispenser', out: 'broccoli' },
    cake: { name: '甜品柜', emoji: '🍰', kind: 'dispenser', out: 'cake' },

    matcha: { name: '抹茶壶', emoji: '🍵', kind: 'cooker', out: 'matcha', time: 2.6 },
    onigiri: { name: '饭团柜', emoji: '🍙', kind: 'dispenser', out: 'onigiri' },
    rice: { name: '寿司饭', emoji: '🍚', kind: 'base', out: 'rice' },
    fish: { name: '三文鱼', emoji: '🐟', kind: 'dispenser', out: 'fish' },
    bowl: { name: '汤碗', emoji: '🥣', kind: 'base', out: 'bowl' },
    boiler: { name: '煮面锅', emoji: '🍝', kind: 'cooker', out: 'noodle', time: 4, burn: 5.5 },
    tamago: { name: '溏心蛋', emoji: '🥚', kind: 'dispenser', out: 'tamago' },
    tempura: { name: '天妇罗炸锅', emoji: '🍤', kind: 'cooker', out: 'tempura', time: 4, burn: 5.5 },
  };

  // ---------- 菜谱 ----------
  // parts[0] 为底（多部件菜谱时），其余部件顺序无关。
  SC.RECIPES = {
    juice: { name: '橙汁', emoji: '🧃', parts: ['juice'], price: 8, kid: true },
    coffee: { name: '咖啡', emoji: '☕', parts: ['coffee'], price: 12 },
    xlb: { name: '小笼包', emoji: '🥟', parts: ['xlb'], price: 16 },
    soymilk: { name: '豆浆', emoji: '🥛', parts: ['soymilk'], price: 8, kid: true },
    blanket: { name: '毛毯', emoji: '🧣', parts: ['blanket'], price: 6, service: true },
    jianbing: { name: '煎饼果子', emoji: '🌯', parts: ['crepe', 'egg'], price: 22 },
    jianbing2: { name: '豪华煎饼', emoji: '🥙', parts: ['crepe', 'egg', 'scallion'], price: 30 },

    cola: { name: '可乐', emoji: '🥤', parts: ['cola'], price: 8, kid: true },
    fries: { name: '薯条', emoji: '🍟', parts: ['fries'], price: 12, kid: true },
    burger: { name: '汉堡', emoji: '🍔', parts: ['bun', 'patty'], price: 22 },
    cheeseburger: { name: '芝士汉堡', emoji: '🍔', tag: '🧀', parts: ['bun', 'patty', 'cheese'], price: 28 },
    bigburger: { name: '巨无霸', emoji: '🍔', tag: '🥬', parts: ['bun', 'patty', 'cheese', 'lettuce'], price: 38 },
    hotdog: { name: '热狗', emoji: '🌭', parts: ['hdbun', 'sausage'], price: 20, kid: true },

    wine: { name: '红酒', emoji: '🍷', parts: ['wine'], price: 14 },
    croissant: { name: '可颂', emoji: '🥐', parts: ['croissant'], price: 14 },
    steak: { name: '牛排', emoji: '🥩', parts: ['plate', 'steak'], price: 30 },
    steak2: { name: '牛排套餐', emoji: '🥩', tag: '🥦', parts: ['plate', 'steak', 'broccoli'], price: 40 },
    cake: { name: '蛋糕', emoji: '🍰', parts: ['cake'], price: 16, kid: true },

    matcha: { name: '抹茶', emoji: '🍵', parts: ['matcha'], price: 12 },
    onigiri: { name: '饭团', emoji: '🍙', parts: ['onigiri'], price: 10, kid: true },
    sushi: { name: '寿司', emoji: '🍣', parts: ['rice', 'fish'], price: 24 },
    ramen: { name: '拉面', emoji: '🍜', parts: ['bowl', 'noodle'], price: 24 },
    ramen2: { name: '豪华拉面', emoji: '🍜', tag: '🥚', parts: ['bowl', 'noodle', 'tamago'], price: 34 },
    tempura: { name: '天妇罗', emoji: '🍤', parts: ['tempura'], price: 18, kid: true },
  };
  for (const id in SC.RECIPES) SC.RECIPES[id].id = id;
  for (const id in SC.STATIONS) SC.STATIONS[id].id = id;

  // 部件 -> 产出它的设备（每个部件只有一个来源）
  SC.PART_SOURCE = {};
  for (const id in SC.STATIONS) SC.PART_SOURCE[SC.STATIONS[id].out] = id;

  // ---------- 城市（生涯模式章节） ----------
  SC.CITIES = [
    {
      id: 'shanghai',
      name: '上海',
      flag: '🏮',
      route: '上海 → 东京',
      plane: '东方明珠号',
      theme: 'dawn',
      pace: 1.0, // 登机间隔倍率（难度微调）
      color: '#ff7a59',
      desc: '从一杯咖啡开始你的空中厨房生涯。',
      // 第 i 关解锁的菜品（累积）
      unlocks: [['juice', 'coffee'], ['xlb'], ['soymilk'], ['blanket'], ['jianbing'], ['jianbing2']],
    },
    {
      id: 'newyork',
      name: '纽约',
      flag: '🗽',
      route: '纽约 → 洛杉矶',
      plane: '自由鹰号',
      theme: 'day',
      pace: 1.15, // 登机间隔倍率（难度微调）
      color: '#3d8bfd',
      desc: '汉堡、热狗和一群赶时间的商务客。',
      unlocks: [['cola', 'burger'], ['fries'], ['cheeseburger'], ['hotdog'], ['bigburger'], []],
    },
    {
      id: 'paris',
      name: '巴黎',
      flag: '🗼',
      route: '巴黎 → 罗马',
      plane: '玫瑰号',
      theme: 'sunset',
      pace: 0.9, // 登机间隔倍率（难度微调）
      color: '#c65fd3',
      desc: '挑剔的美食评论家正在头等舱等着你。',
      unlocks: [['wine', 'croissant'], ['steak'], ['coffee'], ['cake'], ['steak2'], []],
    },
    {
      id: 'tokyo',
      name: '东京',
      flag: '🗻',
      route: '东京 → 悉尼',
      plane: '樱花号',
      theme: 'night',
      pace: 0.9, // 登机间隔倍率（难度微调）
      color: '#ff5d8f',
      desc: '夜航、寿司与拉面——终极的空中厨房考验。',
      unlocks: [['matcha', 'sushi'], ['onigiri'], ['ramen'], ['tempura'], ['ramen2'], []],
    },
  ];
  SC.LEVELS_PER_CITY = 6;

  // ---------- 城市 Boss 航班（每城第 6 班） ----------
  // vip: Boss 乘客类型；rule: 本班特殊规则
  SC.CITY_BOSS = [
    { title: '首航典礼', vip: 'mayor', rule: null, desc: '市长亲自登机，点 3 道菜。他耐心比一般人长，但生气离开航班就失败。' },
    { title: '华尔街包机', vip: 'tycoon', rule: 'business', desc: '满舱商务客：没耐心、小费高。大亨本人最急，千万别让他等。' },
    { title: '米其林评审团', vip: 'judge', rule: 'critics', desc: '评论家扎堆登机，主评审压轴。好评奖金丰厚，差评扣钱。' },
    { title: '樱花夜·红眼航班', vip: 'idol', rule: 'redeye', desc: '很多乘客先睡一觉再点单，记得准备毛毯。偶像也在机上！' },
  ];

  // ---------- 关卡挑战（🏅，每关一个，可选） ----------
  // 每城 6 关各自的挑战类型；数量类挑战的目标值由 tests/calibrate.js 生成
  SC.CITY_CHALLENGES = [
    ['no_angry', 'fresh', 'no_burn', 'combo', 'no_trash', 'vip_happy'],
    ['no_angry', 'fresh', 'combo', 'no_burn', 'fast', 'vip_happy'],
    ['combo', 'no_burn', 'fast', 'fresh', 'no_trash', 'vip_happy'],
    ['fast', 'combo', 'no_burn', 'fresh', 'no_angry', 'vip_happy'],
  ];
  // progress(f, n) -> { cur, done, failed }；failed 表示本局已不可能完成
  SC.CHALLENGES = {
    no_angry: { emoji: '😇', name: '零投诉', desc: () => '没有乘客生气离开', progress: (f) => ({ cur: f.angry, done: f.done && !f.failed && f.angry === 0, failed: f.angry > 0 }) },
    no_burn: { emoji: '🧯', name: '零烤焦', desc: () => '一份食物都不烤焦', progress: (f) => ({ cur: f.burnt, done: f.done && !f.failed && f.burnt === 0, failed: f.burnt > 0 }) },
    no_trash: { emoji: '♻️', name: '零浪费', desc: () => '不倒掉盘子、不烤焦食物', progress: (f) => ({ cur: f.discards + f.burnt, done: f.done && !f.failed && f.discards + f.burnt === 0, failed: f.discards + f.burnt > 0 }) },
    combo: { emoji: '🔗', name: '连击达人', desc: (n) => `连击达到 ${n}`, progress: (f, n) => ({ cur: f.maxCombo, done: f.maxCombo >= n, failed: false }) },
    fresh: { emoji: '♨️', name: '趁热上桌', desc: (n) => `趁热上桌 ${n} 次`, progress: (f, n) => ({ cur: f.freshDishes, done: f.freshDishes >= n, failed: false }) },
    fast: { emoji: '⚡', name: '闪电服务', desc: (n) => `${n} 位乘客在耐心还很足时就吃上`, progress: (f, n) => ({ cur: f.fastServed, done: f.fastServed >= n, failed: false }) },
    vip_happy: { emoji: '👑', name: '贵宾满意', desc: () => 'Boss 乘客心满意足地离开（耐心过半）', progress: (f) => ({ cur: f.bossMood == null ? 0 : 1, done: f.bossMood != null && f.bossMood >= 0.5, failed: f.bossFailed || (f.bossMood != null && f.bossMood < 0.5) }) },
  };
  SC.CHALLENGE_GEMS = 2; // 首次完成挑战奖励的星钻

  // ---------- 剧情对话 ----------
  // who: 角色 id；key: city-<c>-start / city-<c>-boss / city-<c>-clear
  SC.CAST = {
    captain: { name: '周机长', face: '🧑‍✈️' },
    purser: { name: '林乘务长', face: '👩‍✈️' },
    pierre: { name: '皮埃尔', face: '👨‍🍳' },
    mayor: { name: '市长', face: '👨‍💼' },
    tycoon: { name: '大亨', face: '🤵' },
    judge: { name: '主评审', face: '🧐' },
    idol: { name: '偶像', face: '👩‍🎤' },
  };
  SC.STORY = {
    'city-0-start': [
      ['captain', '欢迎加入东方明珠号！我是机长老周。别紧张，第一班只有几位乘客。'],
      ['purser', '我是乘务长小林。厨房里有不懂的尽管问，我会在旁边提醒你。'],
      ['captain', '月底市长要坐我们的首航典礼航班……这段时间好好练手艺吧！'],
    ],
    'city-0-boss': [
      ['purser', '今天就是首航典礼！市长点了三道菜，他很有耐心，但要是让他生气离开……'],
      ['captain', '……这条航线就要被取消了。稳住，你可以的！'],
    ],
    'city-0-clear': [
      ['mayor', '这小笼包很地道！年轻人，你的手艺应该让全世界尝尝。'],
      ['captain', '好消息：公司把你调去纽约航线了！收拾行李吧。'],
    ],
    'city-1-start': [
      ['purser', '纽约的乘客节奏快。商务客没耐心，但小费给得大方。'],
      ['captain', '汉堡要先用面包篮起盘，再放肉饼。芝士、生菜都是一层层叠上去的。'],
    ],
    'city-1-boss': [
      ['purser', '华尔街的大亨包下了整架飞机，满舱都是商务客。'],
      ['captain', '大亨本人最急。先照顾他，再照顾其他人！'],
    ],
    'city-1-clear': [
      ['tycoon', '效率惊人！我在巴黎有家餐厅正缺主厨……开玩笑的。'],
      ['captain', '下一站巴黎。听说那边有位很傲慢的明星主厨。'],
    ],
    'city-2-start': [
      ['pierre', '哦？这就是那位"云端大厨"？在巴黎，飞机餐可不是填饱肚子就行的。'],
      ['purser', '别理他。巴黎评论家多，上菜快他们会给好评奖金。'],
    ],
    'city-2-boss': [
      ['pierre', '米其林评审团今天坐你的航班。我倒要看看你能不能让他们满意。'],
      ['purser', '评论家至少点两道菜。组合菜提前备好，别手忙脚乱。'],
    ],
    'city-2-clear': [
      ['judge', '牛排火候完美。这是我今年在三万英尺高空吃过最好的一餐。'],
      ['pierre', '……哼。东京见。'],
    ],
    'city-3-start': [
      ['captain', '东京航线大多是夜航，寿司和拉面是这里的招牌。'],
      ['purser', '拉面要先起碗，豪华拉面还得加溏心蛋。天妇罗容易焦，盯紧点。'],
    ],
    'city-3-boss': [
      ['purser', '今晚的红眼航班，超人气偶像也在机上！很多乘客会先睡一觉，醒来再点单。'],
      ['captain', '毛毯从行李柜拿。别吵醒睡着的乘客就行。'],
    ],
    'city-3-clear': [
      ['idol', '谢谢你的拉面！下次演唱会给你留前排！'],
      ['pierre', '……好吧，我承认。你才是真正的云端大厨。'],
      ['captain', '四座城市全部通关！接下来去环球冒险，挑战总统专机吧。'],
    ],
  };

  // ---------- 乘客类型 ----------
  SC.PTYPES = {
    normal: {
      name: '乘客',
      faces: ['🧑', '👩', '👨', '🧔', '👱‍♀️', '👩‍🦰', '👨‍🦱', '🧑‍🦳', '👱', '👩‍🦱'],
      patience: 1,
      tip: 1,
    },
    kid: { name: '小朋友', faces: ['👧', '👦'], patience: 0.9, tip: 0.6, badge: '🧸', desc: '等太久会哭闹，让周围乘客更烦躁。' },
    grandma: { name: '老奶奶', faces: ['👵', '👴'], patience: 1.5, tip: 0.7, badge: '🍬', desc: '很有耐心，满意时送你一颗糖（狂热值+）。' },
    business: { name: '商务客', faces: ['🧑‍💼', '👩‍💼', '👨‍💼'], patience: 0.7, tip: 1.8, badge: '💼', desc: '没耐心，但小费丰厚。' },
    influencer: { name: '网红', faces: ['🧑‍🎤', '💃'], patience: 0.8, tip: 1.2, badge: '📱', desc: '快速服务后开直播好评，全舱乘客耐心回升。' },
    critic: { name: '美食评论家', faces: ['🧐'], patience: 1.1, tip: 1.2, badge: '📝', desc: '点单多；满意时给出好评奖金，差评则扣钱。' },
    vip: { name: '贵宾', faces: ['🤴', '👸'], patience: 0.9, tip: 2.5, badge: '👑', desc: '头等舱贵宾，小费惊人。' },
    president: { name: '总统', faces: ['🕴️'], patience: 1, tip: 3, badge: '🎩', boss: true, desc: '专机的主人。怠慢他，一切都完了。' },
    // 生涯城市 Boss：生气离开则航班失败
    mayor: { name: '市长', faces: ['👨‍💼'], patience: 1, tip: 2.5, badge: '🎖️', boss: true, desc: '首航典礼的主宾。让他满意，航线就稳了。' },
    tycoon: { name: '华尔街大亨', faces: ['🤵'], patience: 0.75, tip: 3, badge: '💎', boss: true, desc: '包下整架飞机的大亨，时间就是金钱。' },
    judge: { name: '米其林主评审', faces: ['🧐'], patience: 1.1, tip: 2.5, badge: '⭐', boss: true, desc: '一顿饭决定你在巴黎的名声。' },
    idol: { name: '超人气偶像', faces: ['👩‍🎤'], patience: 0.9, tip: 2.5, badge: '🎤', boss: true, desc: '红眼航班上的大明星，粉丝都在看着。' },
  };

  // ---------- 设备升级（生涯模式，按设备单独升级，金币购买） ----------
  // 每台设备 3 级，效果按设备类型区分；越晚解锁的城市，设备越贵
  SC.STATION_LEVELS = {
    cooker: [
      { short: '快', desc: '烹饪速度 +30%，售价 +10%' },
      { short: '双', desc: '可以同时做 2 份，售价 +10%' },
      { short: '稳', desc: '保温时间 ×2 不易烤焦，售价 +10%' },
    ],
    dispenser: [
      { short: '价', desc: '售价 +12%' },
      { short: '价', desc: '售价再 +12%' },
      { short: '价', desc: '售价再 +12%' },
    ],
    base: [
      { short: '价', desc: '售价 +12%' },
      { short: '价', desc: '售价再 +12%' },
      { short: '价', desc: '售价再 +12%' },
    ],
  };
  // 每级售价加成；组合菜取各部件加成的平均值（升级全部部件才能拿满，避免叠加失控）
  SC.STATION_PRICE_BONUS = { dispenser: 0.12, base: 0.12, cooker: 0.1 };
  const STATION_COSTS = { cooker: [150, 420, 950], dispenser: [100, 280, 650], base: [120, 340, 780] };
  // 设备最早出现在哪座城市（决定价格档位与升级界面的分组）
  SC.stationFirstLevel = function (sid) {
    for (let c = 0; c < SC.CITIES.length; c++) {
      for (let l = 0; l < SC.LEVELS_PER_CITY; l++) {
        for (const rid of SC.CITIES[c].unlocks[l]) {
          if (SC.RECIPES[rid].parts.some((p) => SC.PART_SOURCE[p] === sid)) return [c, l];
        }
      }
    }
    return [SC.CITIES.length - 1, 0];
  };
  SC.stationCity = (sid) => SC.stationFirstLevel(sid)[0];
  // 这台设备做哪些菜（升级界面展示用）
  SC.dishesOfStation = function (sid) {
    const out = SC.STATIONS[sid].out;
    return Object.keys(SC.RECIPES).filter((rid) => SC.RECIPES[rid].parts.includes(out));
  };
  SC.stationUpgradeCost = function (sid, lv) {
    const base = STATION_COSTS[SC.STATIONS[sid].kind][lv];
    if (base == null) return null;
    return Math.round((base * (1 + 0.6 * SC.stationCity(sid))) / 10) * 10;
  };

  // ---------- 机舱装饰（生涯模式，全局生效） ----------
  SC.UPGRADES = [
    { id: 'patience', name: '舒适座椅', emoji: '💺', desc: '乘客耐心 +10%', costs: [300, 800, 1700] },
    { id: 'tip', name: '氛围灯光', emoji: '💡', desc: '小费 +20%', costs: [350, 950, 2000] },
    { id: 'fever', name: '空乘培训', emoji: '🎓', desc: '狂热值积累 +25%', costs: [250, 750] },
    { id: 'plates', name: '加长备餐台', emoji: '🍽️', desc: '备餐盘 +1', costs: [900, 2400] },
  ];
  // 旧版全局升级（已改为按设备升级），读档时按原价退还金币
  SC.LEGACY_UPGRADES = {
    speed: [80, 200, 420],
    burn: [60, 160, 360],
    price: [120, 300, 600],
    slots: [700],
  };

  // ---------- 关前道具（消耗星钻 💎） ----------
  // 星钻来源：每关首次拿到的每颗星 +1，每个护照印章 +3
  SC.GEMS_PER_ACH = 3;
  SC.BOOSTERS = [
    { id: 'fever', name: '开局狂热', emoji: '🔥', desc: '起飞时狂热条直接满', cost: 2 },
    { id: 'calm', name: '安神香薰', emoji: '🕯️', desc: '本班乘客耐心 +20%', cost: 2 },
    { id: 'tray', name: '临时餐车', emoji: '🛒', desc: '本班备餐盘 +1', cost: 1 },
  ];

  // ---------- 成就（护照印章） ----------
  SC.ACHIEVEMENTS = [
    { id: 'first_flight', emoji: '🛫', name: '首航', desc: '完成第一次航班' },
    { id: 'three_star', emoji: '⭐', name: '完美航班', desc: '任意关卡获得三星' },
    { id: 'city_master', emoji: '🏙️', name: '城市主厨', desc: '一座城市全部关卡三星' },
    { id: 'combo10', emoji: '🔗', name: '连击大师', desc: '单次航班达成 10 连击' },
    { id: 'fever5', emoji: '🔥', name: '狂热分子', desc: '单次航班触发 3 次狂热' },
    { id: 'no_angry', emoji: '😇', name: '零投诉', desc: '15 位以上乘客的航班无人生气离开' },
    { id: 'burnt10', emoji: '💨', name: '焦炭艺术家', desc: '累计烤焦 10 份食物' },
    { id: 'served100', emoji: '🧑‍🍳', name: '百人斩', desc: '累计服务 100 位乘客' },
    { id: 'served500', emoji: '🏅', name: '空中传奇', desc: '累计服务 500 位乘客' },
    { id: 'rich', emoji: '💰', name: '小金库', desc: '累计赚取 5000 金币' },
    { id: 'critic', emoji: '📝', name: '米其林之星', desc: '让美食评论家给出好评' },
    { id: 'run_win', emoji: '🌍', name: '环球之旅', desc: '完成一次环球冒险' },
    { id: 'run_perfect', emoji: '💎', name: '零失误环球', desc: '满口碑完成环球冒险' },
    { id: 'daily', emoji: '📅', name: '每日一飞', desc: '完成一次每日航班' },
    { id: 'all_cities', emoji: '✈️', name: '环游世界', desc: '通关全部四座城市' },
    { id: 'medal1', emoji: '🏅', name: '初试身手', desc: '完成第一个关卡挑战' },
    { id: 'medal12', emoji: '🎖️', name: '挑战达人', desc: '完成 12 个关卡挑战' },
    { id: 'boss4', emoji: '👑', name: '贵宾专属', desc: '让四座城市的 Boss 乘客都满意离开' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
