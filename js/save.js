// 存档：localStorage，读写均容错（隐私模式等情况下退化为内存存档）。
(function (root) {
  const SC = (root.SC = root.SC || {});
  const KEY = 'skychef_save_v1';

  function fresh() {
    return {
      v: 1,
      coins: 0,
      stars: {}, // "c-l": 0..3
      best: {}, // "c-l": 最高金币
      upgrades: {},
      ach: {},
      stats: { served: 0, coinsTotal: 0, burnt: 0, flights: 0, runsWon: 0, runsPlayed: 0 },
      settings: { sfx: true, music: true },
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
        }
      } catch (e) {
        this.data = fresh();
      }
      return this.data;
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
    unlock(id) {
      if (this.data.ach[id]) return false;
      this.data.ach[id] = Date.now();
      this.save();
      return true;
    },
  };

  SC.Save = Save;
})(typeof window !== 'undefined' ? window : globalThis);
