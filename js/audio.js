// 音效与背景音乐：全部由 WebAudio 实时合成，无需任何音频文件。
(function (root) {
  const SC = (root.SC = root.SC || {});

  let ctx = null;
  let master = null;
  let sfxGain = null;
  let musicGain = null;
  let noiseBuf = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
    } catch (e) {
      return false;
    }
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.55;
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.18;
    musicGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function tone(freq, dur, opt) {
    opt = opt || {};
    const t0 = ctx.currentTime + (opt.delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t0 + dur);
    const vol = opt.vol == null ? 0.5 : opt.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(opt.out || sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noise(dur, opt) {
    opt = opt || {};
    const t0 = ctx.currentTime + (opt.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opt.filter || 'lowpass';
    f.frequency.value = opt.freq || 800;
    const g = ctx.createGain();
    const vol = opt.vol == null ? 0.3 : opt.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (opt.attack || 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(opt.out || sfxGain);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  const SFX = {
    click: () => tone(660, 0.06, { type: 'triangle', vol: 0.25 }),
    tap: () => tone(520, 0.07, { type: 'triangle', vol: 0.3, to: 700 }),
    reject: () => tone(180, 0.15, { type: 'square', vol: 0.12, to: 140 }),
    cook: () => noise(0.25, { freq: 2500, filter: 'highpass', vol: 0.08 }),
    ready: () => {
      tone(880, 0.12, { type: 'sine', vol: 0.25 });
      tone(1320, 0.18, { type: 'sine', vol: 0.2, delay: 0.08 });
    },
    take: () => tone(740, 0.08, { type: 'triangle', vol: 0.3, to: 990 }),
    deliver: () => tone(600, 0.1, { type: 'triangle', vol: 0.3, to: 900 }),
    pay: () => {
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.11, delay: i * 0.055 }));
    },
    fresh: () => {
      [880, 1175, 1568, 1760].forEach((f, i) => tone(f, 0.22, { type: 'sine', vol: 0.15, delay: i * 0.055 }));
      tone(1175, 0.34, { type: 'triangle', vol: 0.08, delay: 0.08 });
    },
    combo: () => {
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, { type: 'triangle', vol: 0.2, delay: i * 0.05 }));
    },
    burn: () => {
      noise(0.6, { freq: 1200, vol: 0.2, attack: 0.1 });
      tone(200, 0.4, { type: 'sawtooth', vol: 0.08, to: 90 });
    },
    trash: () => noise(0.18, { freq: 600, vol: 0.2 }),
    angry: () => {
      tone(220, 0.25, { type: 'sawtooth', vol: 0.15, to: 150 });
      tone(160, 0.35, { type: 'sawtooth', vol: 0.12, delay: 0.15, to: 110 });
    },
    board: () => tone(1175, 0.2, { type: 'sine', vol: 0.12 }),
    order: () => tone(990, 0.08, { type: 'sine', vol: 0.12 }),
    turbWarn: () => {
      tone(880, 0.25, { type: 'sine', vol: 0.3 });
      tone(660, 0.35, { type: 'sine', vol: 0.3, delay: 0.3 });
    },
    turb: () => noise(1.6, { freq: 180, vol: 0.5, attack: 0.2 }),
    fever: () => {
      tone(300, 0.6, { type: 'sawtooth', vol: 0.15, to: 1200 });
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, { type: 'square', vol: 0.08, delay: 0.3 + i * 0.07 }));
    },
    star: () => {
      [1318, 1760, 2093].forEach((f, i) => tone(f, 0.25, { type: 'sine', vol: 0.22, delay: i * 0.12 }));
    },
    win: () => {
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.25, delay: i * 0.1 }));
    },
    lose: () => {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.22, delay: i * 0.15 }));
    },
    cry: () => tone(700, 0.4, { type: 'sine', vol: 0.12, to: 500 }),
    wake: () => tone(500, 0.2, { type: 'sine', vol: 0.1, to: 800 }),
    coin: () => tone(1568, 0.08, { type: 'square', vol: 0.07 }),
  };

  // ---------- 背景音乐：简单的轻快循环 ----------
  const CHORDS = [
    [261.6, 329.6, 392.0],
    [220.0, 261.6, 329.6],
    [174.6, 220.0, 261.6],
    [196.0, 246.9, 293.7],
  ];
  const MELODY = [0, 2, 4, 2, 5, 4, 2, 0, 4, 5, 7, 5, 4, 2, 1, 2];
  const SCALE = [523.3, 587.3, 659.3, 698.5, 784.0, 880.0, 987.8, 1046.5];
  let musicTimer = null;
  let musicTrack = null;
  let step = 0;
  let nextTime = 0;
  let tempo = 108;

  function scheduleMusic() {
    if (!ctx) return;
    const spb = 60 / tempo / 2; // 八分音符
    while (nextTime < ctx.currentTime + 0.2) {
      const bar = Math.floor(step / 8) % CHORDS.length;
      const chord = CHORDS[bar];
      const delay = nextTime - ctx.currentTime;
      if (step % 8 === 0) {
        tone(chord[0] / 2, spb * 7, { type: 'triangle', vol: 0.35, delay, out: musicGain });
      }
      if (step % 2 === 0) {
        tone(chord[(step / 2) % 3] , spb * 1.6, { type: 'sine', vol: 0.12, delay, out: musicGain });
      }
      const m = MELODY[step % MELODY.length];
      if (step % 4 !== 3) tone(SCALE[m] / 2, spb * 0.9, { type: 'square', vol: 0.05, delay, out: musicGain });
      nextTime += spb;
      step++;
    }
  }

  // ---------- 狂热变奏：在背景音乐上叠一层快节奏琶音 + 踩镲 ----------
  const FEVER_ARP = [0, 2, 4, 7, 4, 2, 5, 7];
  let feverTimer = null;
  let feverStep = 0;
  let feverNext = 0;
  function scheduleFever() {
    if (!ctx) return;
    const s16 = 60 / 150 / 4; // 150 BPM 的十六分音符
    while (feverNext < ctx.currentTime + 0.2) {
      const delay = feverNext - ctx.currentTime;
      const m = FEVER_ARP[feverStep % FEVER_ARP.length] + (Math.floor(feverStep / 16) % 2 ? 1 : 0);
      tone(SCALE[m % SCALE.length], s16 * 0.9, { type: 'square', vol: 0.14, delay, out: musicGain });
      if (feverStep % 2 === 1) noise(0.04, { filter: 'highpass', freq: 7000, vol: 0.25, attack: 0.005, delay, out: musicGain });
      if (feverStep % 4 === 0) tone(SCALE[0] / 4, s16 * 2, { type: 'triangle', vol: 0.4, delay, out: musicGain });
      feverNext += s16;
      feverStep++;
    }
  }

  function startSynthMusic() {
    if (!ctx) return;
    nextTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(scheduleMusic, 60);
  }

  SC.Audio = {
    sfxOn: true,
    musicOn: true,
    unlock() {
      ensure();
    },
    play(name) {
      if (!this.sfxOn || !SFX[name]) return;
      if (!ensure()) return;
      try {
        SFX[name]();
      } catch (e) {
        /* 忽略 */
      }
    },
    startMusic() {
      if (!this.musicOn || musicTimer) return;
      if (!ensure()) return;
      if (typeof root.Audio === 'function') {
        if (!musicTrack) {
          musicTrack = new root.Audio('assets/sky-chef-cabin-theme.mp3');
          musicTrack.loop = true;
          musicTrack.preload = 'auto';
          musicTrack.volume = 0.32;
        }
        musicTimer = 'track';
        const started = musicTrack.play();
        if (started && typeof started.catch === 'function') {
          started.catch(() => {
            if (musicTimer !== 'track' || !this.musicOn) return;
            musicTimer = null;
            startSynthMusic();
          });
        }
      } else startSynthMusic();
    },
    // 狂热期间叠加变奏；只在音乐开启时播放，暂停/结束时由航班画面关掉
    setFever(on) {
      if (on && this.musicOn && !feverTimer && ensure()) {
        feverStep = 0;
        feverNext = ctx.currentTime + 0.05;
        feverTimer = setInterval(scheduleFever, 60);
      } else if (!on && feverTimer) {
        clearInterval(feverTimer);
        feverTimer = null;
      }
    },
    stopMusic() {
      this.setFever(false);
      if (musicTimer && musicTimer !== 'track') clearInterval(musicTimer);
      if (musicTrack) musicTrack.pause();
      musicTimer = null;
    },
    suspend() {
      this.stopMusic();
      if (ctx && ctx.state === 'running') ctx.suspend();
    },
    resume() {
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (this.musicOn) this.startMusic();
    },
    setTempo(t) {
      tempo = t;
      if (musicTrack) musicTrack.playbackRate = t > 108 ? 1.05 : 1;
    },
    setMusic(on) {
      this.musicOn = on;
      if (!on) this.stopMusic();
      else this.startMusic();
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
