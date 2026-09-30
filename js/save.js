// 存档：localStorage，读写均容错（隐私模式等情况下退化为内存存档）。
(function (root) {
  const SC = (root.SC = root.SC || {});
  const KEY = 'skychef_save_v1';

  function fresh() {
    return {
      v: 2,
      coins: 0,
      gems: 0, // 星钻：首次拿星、解锁成就获得，用于关前道具
      stationLv: {}, // 设备等级 { 设备id: 1~3 }
      medals: {}, // 已完成的关卡挑战 { "c-l": 时间戳 }
      stars: {}, // "c-l": 0..3
      best: {}, // "c-l": 最高金币
      upgrades: {},
      ach: {},
      stats: { served: 0, coinsTotal: 0, burnt: 0, flights: 0, runsWon: 0, runsPlayed: 0 },
      settings: { sfx: true, music: true, vibrate: true },
      daily: {}, // dateKey: 最高分
      run: null, // 进行中的环球冒险
      bestRun: 0,
      seen: {}, // 已看过的新菜品介绍
    };
  }

  const Save = {
    data: fresh(),
    load() {
      try {
        const raw = root.localStorage && root.localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          const base = fresh();
          this.data = Object.assign(base, d);
          this.data.stats = Object.assign(fresh().stats, d.stats || {});
          this.data.settings = Object.assign(fresh().settings, d.settings || {});
          if (!d.v || d.v < 2) this.migrateV2(d);
        }
      } catch (e) {
        this.data = fresh();
      }
      return this.data;
    },
    // v1 -> v2：全局升级改为按设备升级。旧的全局升级按原价退还金币，已有星星和成就补发星钻
    migrateV2(old) {
      const d = this.data;
      let refund = 0;
      for (const id in SC.LEGACY_UPGRADES) {
        const lv = (d.upgrades && d.upgrades[id]) || 0;
        for (let i = 0; i < lv; i++) refund += SC.LEGACY_UPGRADES[id][i] || 0;
        if (d.upgrades) delete d.upgrades[id];
      }
      d.coins += refund;
      d.gems = (d.gems || 0) + this.totalStars() + Object.keys(d.ach || {}).length * SC.GEMS_PER_ACH;
      d.stationLv = d.stationLv || {};
      d.v = 2;
      this.migrationNote = { refund, gems: d.gems, fromVersion: old.v || 1 };
      this.save();
    },
    save() {
      try {
        root.localStorage && root.localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) {
        /* 存储不可用时忽略 */
      }
    },
    reset() {
      this.data = fresh();
      this.save();
    },
    key(c, l) {
      return `${c}-${l}`;
    },
    starsOf(c, l) {
      return this.data.stars[this.key(c, l)] || 0;
    },
    totalStars() {
      let s = 0;
      for (const k in this.data.stars) s += this.data.stars[k];
      return s;
    },
    levelUnlocked(c, l) {
      if (c === 0 && l === 0) return true;
      if (l > 0) return this.starsOf(c, l - 1) > 0;
      return this.starsOf(c - 1, SC.LEVELS_PER_CITY - 1) > 0;
    },
    cityUnlocked(c) {
      return this.levelUnlocked(c, 0);
    },
    // 环球冒险与每日航班：通关上海第 3 关后开放
    modesUnlocked() {
      return this.starsOf(0, 2) > 0;
    },
    stationLevel(sid) {
      return this.data.stationLv[sid] || 0;
    },
    // 设备所在关卡解锁后才能升级
    stationUnlocked(sid) {
      const [c, l] = SC.stationFirstLevel(sid);
      return this.levelUnlocked(c, l);
    },
    unlock(id) {
      if (this.data.ach[id]) return false;
      this.data.ach[id] = Date.now();
      this.data.gems += SC.GEMS_PER_ACH;
      this.save();
      return true;
    },
  };

  SC.Save = Save;
})(typeof window !== 'undefined' ? window : globalThis);
