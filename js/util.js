// 通用工具：随机数、数学辅助。所有脚本共享全局命名空间 SC（兼容浏览器与 Node 测试）。
(function (root) {
  const SC = (root.SC = root.SC || {});

  // 可复现的伪随机数（mulberry32），用于关卡生成与每日挑战
  SC.rng = function (seed) {
    let a = seed >>> 0;
    const next = function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.range = (min, max) => min + next() * (max - min);
    next.int = (min, max) => Math.floor(min + next() * (max - min + 1));
    next.pick = (arr) => arr[Math.floor(next() * arr.length)];
    next.weighted = (entries) => {
      // entries: [[value, weight], ...]
      let total = 0;
      for (const e of entries) total += e[1];
      let r = next() * total;
      for (const e of entries) {
        r -= e[1];
        if (r <= 0) return e[0];
      }
      return entries[entries.length - 1][0];
    };
    next.shuffle = (arr) => {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    };
    return next;
  };

  SC.hashString = function (str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  SC.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  SC.todayKey = function (d) {
    d = d || new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };
})(typeof window !== 'undefined' ? window : globalThis);
