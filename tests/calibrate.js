// 星级目标校准：用三档机器人（不升级）实际跑每一关，按设计意图生成 js/targets.js。
// 设计意图（不升级时）：
//   - 前期（上海）：新手两星、普通三星——先让玩家尝到甜头
//   - 后期（东京）：新手一星、普通两星；三星比高手不升级时还高一截——想拿三星就得升级设备
//   - 中间按关卡进度线性过渡，保证难度一路平滑上升
// 用法：node tests/calibrate.js   （改动关卡生成或引擎数值后重新运行）
const fs = require('fs');
const path = require('path');
const { SC, SKILLS, avgCoins } = require('./bot');

// 校准时忽略旧目标，避免循环依赖
SC.CAMPAIGN_TARGETS = null;

const round5 = (x) => Math.max(5, Math.round(x / 5) * 5);
const lerp = (a, b, t) => a + (b - a) * t;
const total = SC.CITIES.length * SC.LEVELS_PER_CITY - 1;

const out = {};
const rows = [];
for (let c = 0; c < SC.CITIES.length; c++) {
  for (let l = 0; l < SC.LEVELS_PER_CITY; l++) {
    const coins = SKILLS.slice(0, 3).map((skill) => avgCoins(SC.campaignFlight(c, l, {}), skill, 6));
    const [E, N, V] = coins;
    const t = (c * SC.LEVELS_PER_CITY + l) / total;
    let one = V * 0.8;
    let two = lerp(V * 0.95, N * 0.95, t);
    let three = lerp(N * 0.98, E * 1.22, t);
    // 星与星之间至少拉开一点距离
    two = Math.max(two, one * 1.15);
    three = Math.max(three, two * 1.12);
    out[`${c}-${l}`] = [round5(one), round5(two), round5(three)];
    rows.push(`${SC.CITIES[c].name}-${l + 1}`.padEnd(8) + `高手${E} 普通${N} 新手${V}`.padEnd(26) + `→ ${out[`${c}-${l}`].join(' / ')}`);
  }
}

const body = Object.entries(out)
  .map(([k, v]) => `    '${k}': [${v.join(', ')}],`)
  .join('\n');
const file = `// 生涯关卡星级目标（金币）。由 tests/calibrate.js 根据机器人实测自动生成，请勿手改。
(function (root) {
  const SC = (root.SC = root.SC || {});
  SC.CAMPAIGN_TARGETS = {
${body}
  };
})(typeof window !== 'undefined' ? window : globalThis);
`;
fs.writeFileSync(path.join(__dirname, '..', 'js', 'targets.js'), file);
console.log(rows.join('\n'));
console.log('\n✔ 已写入 js/targets.js');
