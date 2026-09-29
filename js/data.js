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
    president: { name: '总统', faces: ['🕴️'], patience: 1, tip: 3, badge: '🎩', desc: '专机的主人。怠慢他，一切都完了。' },
  };

  // ---------- 厨房升级（生涯模式，金币购买） ----------
  SC.UPGRADES = [
    { id: 'speed', name: '涡轮厨具', emoji: '⚡', desc: '所有烹饪设备速度 +15%', costs: [80, 200, 420] },
    { id: 'burn', name: '保温涂层', emoji: '🛡️', desc: '食物烤焦前的保温时间 +40%', costs: [60, 160, 360] },
    { id: 'plates', name: '加长备餐台', emoji: '🍽️', desc: '备餐盘 +1', costs: [150, 450] },
    { id: 'patience', name: '舒适座椅', emoji: '💺', desc: '乘客耐心 +10%', costs: [100, 250, 500] },
    { id: 'price', name: '精美餐具', emoji: '🥂', desc: '菜品售价 +10%', costs: [120, 300, 600] },
    { id: 'fever', name: '空乘培训', emoji: '🎓', desc: '狂热值积累 +25%', costs: [90, 260] },
    { id: 'slots', name: '双头炉灶', emoji: '🔥', desc: '所有烹饪设备可同时做 2 份', costs: [700] },
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
  ];
})(typeof window !== 'undefined' ? window : globalThis);
