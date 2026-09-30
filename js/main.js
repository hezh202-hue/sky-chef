// 入口：读取存档、应用设置、进入标题画面。
(function (root) {
  const SC = root.SC;

  function boot() {
    SC.UI.init();
    setTimeout(() => SC.UI.preloadIcons(), 300);
    const d = SC.Save.load();
    SC.Audio.sfxOn = d.settings.sfx;
    SC.Audio.musicOn = d.settings.music;
    // 首次交互后才能播放声音（浏览器策略）
    const unlock = () => {
      SC.Audio.unlock();
      if (SC.Audio.musicOn) SC.Audio.startMusic();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    // 防止移动端双击缩放 / 长按菜单干扰操作
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest && e.target.closest('.game')) e.preventDefault();
    });
    SC.Screens.title();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
