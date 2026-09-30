// 舷窗外的风景：出发城市天际线随爬升下沉，巡航时是云海，临近降落时目的地城市升起。
// 所有舷窗共用一幅连续全景（每个窗口按自身位置偏移），看起来像透过一排窗户看同一片天空。
(function (root) {
  const SC = (root.SC = root.SC || {});

  // 天际线轮廓，坐标系 240×60，地面在 y=60。每个城市一块可横向重复的“地砖”。
  const r = (x, y, w, hh) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}"/>`;
  const rects = (list) => list.map((a) => r(...a)).join('');
  // 罗马斗兽场：外轮廓 + 两排拱门（evenodd 镂空）
  function colosseum() {
    let d = 'M40 60V38Q75 30 110 36V60Z';
    for (let x = 44; x <= 102; x += 7) d += `M${x} 57V51Q${x + 2} 48 ${x + 4} 51V57Z`;
    for (let x = 46; x <= 100; x += 7) d += `M${x} 47V42Q${x + 1.5} 40 ${x + 3} 42V47Z`;
    return `<path fill-rule="evenodd" d="${d}"/>`;
  }
  function palm(x) {
    return `<path d="M${x} 60L${x + 1.6} 60L${x + 3.6} 36L${x + 2.6} 36Z"/>` +
      `<path d="M${x + 3} 36q-7-3-11 2q5-6 11-2q-4-7-10-8q7 1 10 8q2-7 9-8q-5 3-9 8q7-3 11 2q-6-4-11-2Z"/>`;
  }
  // 每座城市分三层：back 远景（山、丘陵），lit 楼房（夜里亮灯），front 地标（塔、桥、树，不亮灯）
  const SKYLINES = {
    上海: () => ({
      lit:
        rects([[0, 38, 14, 22], [16, 30, 12, 30], [30, 42, 16, 18], [78, 34, 14, 26], [130, 36, 12, 24], [144, 44, 18, 16], [164, 32, 10, 28], [176, 40, 20, 20], [198, 28, 12, 32], [212, 46, 28, 14]]) +
        // 上海中心、环球金融中心
        '<path d="M96 60L97 8Q101 2 105 6L108 60Z"/><path fill-rule="evenodd" d="M114 60L115 12L123 12L124 60ZM117 15h4v4h-4Z"/>',
      // 东方明珠
      front: '<path d="M52 60L58 40L62 40L68 60Z"/>' + r(58.5, 10, 3, 50) + '<circle cx="60" cy="40" r="7"/><circle cx="60" cy="22" r="4.5"/><circle cx="60" cy="12" r="2"/>' + r(59.5, 0, 1, 10),
    }),
    东京: () => ({
      back: '<path opacity=".5" d="M120 60L175 18H185L240 60Z"/><path fill="#f4f6ff" opacity=".85" d="M168 24L175 18H185L192 24L186 27L180 23L174 27Z"/>',
      lit: rects([[0, 40, 16, 20], [18, 34, 10, 26], [30, 44, 14, 16], [76, 38, 12, 22], [90, 30, 10, 30], [102, 42, 16, 18], [200, 44, 14, 16], [216, 38, 12, 22]]),
      // 东京塔
      front: '<path d="M50 60L58 30L59 14L60 0L61 14L62 30L70 60L66 60L60 36L54 60Z"/>' + r(55, 28, 10, 3) + r(57, 16, 6, 2),
    }),
    纽约: () => ({
      lit:
        rects([[0, 36, 14, 24], [16, 28, 12, 32], [30, 40, 10, 20], [42, 24, 14, 36], [84, 34, 8, 26], [112, 32, 14, 28], [128, 40, 12, 20], [142, 26, 10, 34], [154, 38, 18, 22], [206, 44, 34, 16]]) +
        // 帝国大厦、克莱斯勒大厦
        rects([[60, 30, 20, 30], [63, 20, 14, 10], [66, 12, 8, 8], [68, 6, 4, 6], [69.5, 0, 1, 6]]) + '<path d="M94 60V22L100 8L106 22V60Z"/>' + r(99.6, 0, 0.8, 8),
      // 自由女神
      front: r(184, 48, 14, 12) + '<path d="M187 48L189 30H193L195 48Z"/><circle cx="191" cy="27" r="2.5"/>' + r(193, 16, 1.5, 12) + '<circle cx="193.7" cy="15" r="2"/>',
    }),
    洛杉矶: () => ({
      back: '<path opacity=".5" d="M0 44Q40 30 80 40Q130 26 180 38Q210 32 240 42V60H0Z"/>',
      lit: rects([[86, 38, 12, 22], [100, 24, 12, 36], [102, 20, 8, 4], [114, 32, 10, 28], [126, 40, 14, 20]]),
      front: palm(28) + palm(52) + palm(168) + palm(196) + palm(222),
    }),
    巴黎: () => {
      let lit = '';
      for (const [x, w, y] of [[0, 24, 42], [26, 22, 44], [146, 24, 42], [172, 22, 45], [198, 22, 43], [222, 18, 44]]) {
        lit += r(x, y, w, 60 - y) + `<path d="M${x} ${y}L${x + 3} ${y - 4}H${x + w - 3}L${x + w} ${y}Z"/>`;
      }
      // 圣心堂、埃菲尔铁塔
      const front = '<path d="M70 60V44Q80 30 90 44V60Z"/>' + r(79.3, 32, 1.4, 6) +
        '<path d="M104 60Q112 44 116 30L118 12L119.5 0H120.5L122 12L124 30Q128 44 136 60H130Q124 50 120 48Q116 50 110 60Z"/>' + r(113, 34, 14, 2.5) + r(116, 20, 8, 2);
      return { lit, front };
    },
    罗马: () => ({
      lit: rects([[0, 44, 30, 16], [118, 48, 24, 12], [196, 46, 44, 14], [152, 44, 36, 16]]),
      // 斗兽场、圣彼得大教堂穹顶、柏树
      front: colosseum() + r(160, 36, 20, 8) + '<path d="M160 36Q170 18 180 36Z"/>' + r(169, 16, 2, 6) +
        '<ellipse cx="126" cy="46" rx="3" ry="11"/><ellipse cx="136" cy="48" rx="2.6" ry="9"/><ellipse cx="212" cy="44" rx="3" ry="12"/>',
    }),
    悉尼: () => ({
      lit: rects([[104, 42, 10, 16], [0, 40, 12, 18], [14, 46, 10, 12]]),
      // 海港大桥、歌剧院（贝壳屋顶用浅色）
      front: r(0, 57, 240, 3) + '<path d="M130 50Q180 18 230 50H226Q180 24 134 50Z"/>' + r(125, 48, 110, 2.5) + r(128, 40, 6, 12) + r(226, 40, 6, 12) +
        r(28, 52, 74, 6) + '<g fill="#f3efe6"><path d="M34 52Q40 32 52 52Z"/><path d="M46 52Q56 26 70 52Z"/><path d="M62 52Q74 30 86 52Z"/><path d="M78 52Q88 38 98 52Z"/></g>',
    }),
  };
  function generic() {
    return { lit: rects([[0, 40, 18, 20], [20, 30, 12, 30], [34, 44, 20, 16], [56, 26, 14, 34], [72, 38, 16, 22], [90, 32, 10, 28], [102, 46, 24, 14], [128, 34, 12, 26], [142, 40, 18, 20], [162, 28, 12, 32], [176, 42, 22, 18], [200, 36, 14, 24], [216, 44, 24, 16]]) };
  }

  // 各主题的天际线颜色；夜里楼房亮灯
  const INK = { dawn: '#7d6788', day: '#6a82b4', sunset: '#4a2f68', night: '#161c3a', storm: '#3a4150' };

  function svgUrl(svg) {
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }

  function skylineUrl(name, theme) {
    const sk = (SKYLINES[name] || generic)();
    const ink = INK[theme] || INK.day;
    let lights = '';
    if (theme === 'night') {
      // 只裁剪到楼房上点灯；按固定规律跳过一些窗户，看起来不那么整齐
      let dots = '';
      for (let x = 2; x < 240; x += 4) {
        for (let y = 4; y < 58; y += 5) if ((x * 7 + y * 13) % 5 < 2) dots += `<rect x="${x}" y="${y}" width="1.3" height="1.6"/>`;
      }
      lights = `<defs><clipPath id="c">${sk.lit}</clipPath></defs><g clip-path="url(#c)" fill="#ffd76a" opacity=".9">${dots}</g>`;
    }
    // 绘制顺序：远景 → 楼房 → 灯光 → 地标（地标挡在灯前面）
    return svgUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"><g fill="${ink}">${sk.back || ''}${sk.lit}</g>${lights}<g fill="${ink}">${sk.front || ''}</g></svg>`
    );
  }

  const CLOUD = { night: 'rgba(170,180,230,.35)', storm: 'rgba(80,90,110,.85)' };
  function cloudUrl(theme) {
    const c = CLOUD[theme] || 'rgba(255,255,255,.9)';
    return svgUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><g fill="${c}">` +
        '<ellipse cx="22" cy="30" rx="16" ry="5"/><ellipse cx="28" cy="26" rx="8" ry="6"/>' +
        '<ellipse cx="84" cy="14" rx="12" ry="3.5"/><ellipse cx="88" cy="11" rx="6" ry="4"/></g></svg>'
    );
  }

  // 调试 / 预览用：单独取某城市某主题的天际线图
  SC.skylineUrl = skylineUrl;

  // 建一幅全景，返回 { update(progress), layout() }。windows：所有舷窗元素
  SC.Scenery = function (windows, fromName, toName, theme) {
    const layers = [];
    const dep = skylineUrl(fromName, theme);
    const arr = skylineUrl(toName, theme);
    const clouds = cloudUrl(theme);
    for (const w of windows) {
      const pano = document.createElement('div');
      pano.className = 'pano';
      const mk = (cls, url) => {
        const el = document.createElement('div');
        el.className = 'pano-layer ' + cls;
        el.style.backgroundImage = url;
        pano.appendChild(el);
        return el;
      };
      mk('clouds', clouds);
      const a = mk('city dep', dep);
      const b = mk('city arr', arr);
      w.appendChild(pano);
      layers.push({ w, pano, a, b });
    }
    let lastDep = -1;
    let lastArr = -1;
    return {
      // 每个窗口的全景都对齐到同一条“窗户带”，窗外看起来是连续的
      layout() {
        for (const L of layers) {
          const row = L.w.parentNode;
          if (!row) continue;
          const x = L.w.getBoundingClientRect().left - row.getBoundingClientRect().left;
          L.pano.style.left = -Math.round(x) + 'px';
          L.pano.style.width = Math.round(row.getBoundingClientRect().width) + 'px';
        }
      },
      // 航程 = 已服务乘客占比，是一格一格跳的（第一关只有 6 位乘客）；
      // 所以前 25% 出发城市下沉、后 40% 目的地城市升起，短航班也看得到降落。只在变化明显时写样式
      update(progress) {
        const d = Math.round(SC.clamp(progress / 0.25, 0, 1) * 50) / 50;
        const a = Math.round(SC.clamp((progress - 0.6) / 0.4, 0, 1) * 50) / 50;
        if (d === lastDep && a === lastArr) return;
        lastDep = d;
        lastArr = a;
        for (const L of layers) {
          L.a.style.transform = `translateY(${d * 105}%)`;
          L.b.style.transform = `translateY(${(1 - a) * 105}%)`;
        }
      },
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
