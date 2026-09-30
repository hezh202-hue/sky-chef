// 通用 UI 工具：元素构建、弹窗、提示、主题切换、成就解锁。
(function (root) {
  const SC = (root.SC = root.SC || {});

  // h('div.cls#id', {attrs}, children...)
  function h(sel, attrs, ...children) {
    const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement((m && m[1]) || 'div');
    if (m && m[2]) {
      for (const part of m[2].match(/[.#][\w-]+/g)) {
        if (part[0] === '.') el.classList.add(part.slice(1));
        else el.id = part.slice(1);
      }
    }
    // 第二个参数不是纯对象时视为子节点（注意 0、'' 这类假值也要保留）
    if (attrs !== undefined && (attrs === null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
      children.unshift(attrs);
      attrs = null;
    }
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k.startsWith('on') && typeof v === 'function') {
          el.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    append(el, children);
    return el;
  }
  function append(el, children) {
    for (const c of children) {
      if (c == null || c === false) continue;
      if (Array.isArray(c)) append(el, c);
      else if (c instanceof Node) el.appendChild(c);
      else el.appendChild(document.createTextNode(String(c)));
    }
  }

  const UI = {
    h,
    app: null,
    modalRoot: null,
    toastRoot: null,
    fxLayer: null,
    current: null, // 当前屏幕的清理函数

    init() {
      this.app = document.getElementById('app');
      this.modalRoot = document.getElementById('modal-root');
      this.toastRoot = document.getElementById('toast-root');
      this.fxLayer = document.getElementById('fx-layer');
    },

    setScreen(node, cleanup) {
      if (this.current) {
        try {
          this.current();
        } catch (e) {
          console.error(e);
        }
      }
      this.current = cleanup || null;
      this.closeAllModals();
      this.app.innerHTML = '';
      this.app.appendChild(node);
      this.app.scrollTop = 0;
      window.scrollTo(0, 0);
    },

    setTheme(theme) {
      const sky = document.getElementById('sky');
      sky.className = 'theme-' + (theme || 'day');
    },

    // 弹窗：返回 close()
    modal(opt) {
      const overlay = h('div.modal-overlay');
      const box = h('div.modal' + (opt.cls ? '.' + opt.cls : ''));
      if (opt.title) box.appendChild(h('div.modal-title', opt.title));
      if (opt.body) box.appendChild(typeof opt.body === 'string' ? h('div.modal-body', { html: opt.body }) : h('div.modal-body', opt.body));
      const close = () => {
        if (!overlay.parentNode) return;
        overlay.classList.add('closing');
        setTimeout(() => overlay.remove(), 160);
        if (opt.onClose) opt.onClose();
      };
      if (opt.buttons && opt.buttons.length) {
        const row = h('div.modal-buttons');
        for (const b of opt.buttons) {
          const btn = h('button.btn' + (b.cls ? '.' + b.cls : ''), {
            onclick: () => {
              SC.Audio.play('click');
              if (b.close !== false) close();
              if (b.onClick) b.onClick();
            },
            disabled: b.disabled,
          }, b.label);
          row.appendChild(btn);
        }
        box.appendChild(row);
      }
      overlay.appendChild(box);
      if (opt.dismissible) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) close();
        });
      }
      this.modalRoot.appendChild(overlay);
      return close;
    },

    closeAllModals() {
      this.modalRoot.innerHTML = '';
    },

    hasModal() {
      return this.modalRoot.children.length > 0;
    },

    toast(text, emoji, cls) {
      const t = h('div.toast' + (cls ? '.' + cls : ''), emoji ? h('span.toast-emoji', emoji) : null, h('span', text));
      this.toastRoot.appendChild(t);
      setTimeout(() => t.classList.add('out'), 2600);
      setTimeout(() => t.remove(), 3100);
    },

    achieve(id) {
      if (!SC.Save.unlock(id)) return;
      const a = SC.ACHIEVEMENTS.find((x) => x.id === id);
      if (!a) return;
      SC.Audio.play('star');
      this.toast(`解锁护照印章：${a.name}`, a.emoji, 'gold');
    },

    // 剧情对话：lines = [[角色id, 台词], ...]，点击推进，结束后回调 onDone
    dialog(lines, onDone) {
      let i = 0;
      const face = h('div.dlg-face');
      const name = h('div.dlg-name');
      const text = h('div.dlg-text');
      const hintEl = h('div.dlg-next', '点击继续 ▸');
      const box = h('div.dlg-box', face, h('div.dlg-body', name, text), hintEl);
      const overlay = h('div.dlg-overlay', box);
      const show = () => {
        const [who, line] = lines[i];
        const cast = SC.CAST[who] || { name: who, face: '🙂' };
        face.textContent = cast.face;
        name.textContent = cast.name;
        text.textContent = line;
        box.classList.toggle('right', who !== 'captain' && who !== 'purser');
        hintEl.textContent = i < lines.length - 1 ? '点击继续 ▸' : '开始 ▸';
        box.classList.remove('pop');
        void box.offsetWidth;
        box.classList.add('pop');
      };
      overlay.addEventListener('click', () => {
        SC.Audio.play('click');
        i++;
        if (i < lines.length) return show();
        overlay.remove();
        if (onDone) onDone();
      });
      this.modalRoot.appendChild(overlay);
      show();
    },

    // 在屏幕坐标处飘字
    floatText(x, y, text, cls) {
      const el = h('div.float-text' + (cls ? '.' + cls : ''), text);
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      this.fxLayer.appendChild(el);
      setTimeout(() => el.remove(), 1300);
    },

    // 让 emoji 从 a 元素飞到 b 元素
    fly(emoji, fromEl, toEl, dur) {
      if (!fromEl || !toEl) return;
      const a = fromEl.getBoundingClientRect();
      const b = toEl.getBoundingClientRect();
      const el = h('div.fly', emoji);
      const x0 = a.left + a.width / 2;
      const y0 = a.top + a.height / 2;
      const x1 = b.left + b.width / 2;
      const y1 = b.top + b.height / 2;
      el.style.left = x0 + 'px';
      el.style.top = y0 + 'px';
      this.fxLayer.appendChild(el);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const anim = el.animate(
        [
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 60}px)) scale(1.4)`, opacity: 1, offset: 0.5 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.8)`, opacity: 0.9 },
        ],
        { duration: dur || 420, easing: 'ease-in-out' }
      );
      anim.onfinish = () => el.remove();
    },

    burst(x, y, emojis, n) {
      for (let i = 0; i < (n || 8); i++) {
        const el = h('div.particle', emojis[i % emojis.length]);
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        this.fxLayer.appendChild(el);
        const ang = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 60;
        const anim = el.animate(
          [
            { transform: 'translate(-50%,-50%) scale(0.6)', opacity: 1 },
            { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(1)`, opacity: 0 },
          ],
          { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.3,1)' }
        );
        anim.onfinish = () => el.remove();
      }
    },

    starsHtml(n, max) {
      let s = '';
      for (let i = 0; i < (max || 3); i++) s += `<span class="star ${i < n ? 'on' : ''}">★</span>`;
      return s;
    },

    // 菜谱说明：🍞 + 🍖 = 🍔
    recipeLine(rid) {
      const r = SC.RECIPES[rid];
      // 显示要点击的设备，而不是食材本身
      const parts = r.parts.map((p) => {
        const st = SC.STATIONS[SC.PART_SOURCE[p]];
        const how = st.kind === 'cooker' ? '需烹饪' : st.kind === 'base' ? '起盘' : '即取';
        return h('span.rpart', { title: `${st.name}（${how}）` }, h('span.rpart-emoji', st.emoji), h('small', st.name), h('span.rpart-how.how-' + st.kind, how));
      });
      const row = h('div.recipe-line');
      parts.forEach((p, i) => {
        if (i) row.appendChild(h('span.rplus', '+'));
        row.appendChild(p);
      });
      if (r.parts.length > 1) {
        row.appendChild(h('span.rplus', '='));
      } else {
        row.appendChild(h('span.rplus', '→'));
      }
      row.appendChild(h('span.rresult', dishIcon(rid), h('small', `${r.name} · ${r.price}💰`)));
      return row;
    },
  };

  function dishIcon(rid) {
    const r = SC.RECIPES[rid];
    return h('span.dish', r.emoji, r.tag ? h('span.dish-tag', r.tag) : null);
  }
  UI.dishIcon = dishIcon;

  SC.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
