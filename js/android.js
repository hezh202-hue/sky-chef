// Android 生命周期适配；普通浏览器也会在切到后台时静音。
(function (root) {
  const SC = root.SC;
  function background() {
    if (document.querySelector('.game') && SC._view) SC._view.pause();
    SC.Audio.suspend();
    SC.Save.save();
  }
  function foreground() { SC.Audio.resume(); }
  root.addEventListener('skychef-background', background);
  root.addEventListener('skychef-foreground', foreground);
  document.addEventListener('visibilitychange', () => document.hidden ? background() : foreground());
  SC.handleAndroidBack = function () {
    // 模态窗口保留其明确的操作按钮，避免跳过确认或让暂停状态失配。
    if (SC.UI.hasModal()) return true;
    if (document.querySelector('.game') && SC._view) {
      SC._view.pause();
      return true;
    }
    const back = document.querySelector('.topbar .back');
    if (back) { back.click(); return true; }
    return false;
  };
})(window);
