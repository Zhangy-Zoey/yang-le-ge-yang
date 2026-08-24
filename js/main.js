/**
 * 入口：适配层 → 预载花牌 → 游戏状态 → 渲染循环 → 输入
 */
(function (root) {
  function resolve() {
    if (typeof module === 'object' && module.exports) {
      return {
        createRuntime: require('./adapter').createRuntime,
        Game: require('./game').Game,
        render: require('./render').render,
        preloadFlowers: require('./flowers').preloadFlowers,
      };
    }
    return {
      createRuntime: root.createRuntime,
      Game: root.Game,
      render: root.render,
      preloadFlowers: root.preloadFlowers,
    };
  }

  function boot() {
    const { createRuntime, Game, render, preloadFlowers } = resolve();
    const rt = createRuntime();

    const start = () => {
      const game = new Game(rt.width, rt.height);
      rt.onTouch((x, y) => game.tap(x, y));
      const loop = () => {
        render(rt.ctx, game);
        rt.requestFrame(loop);
      };
      loop();
    };

    const preload = preloadFlowers || root.preloadFlowers;
    const waitFont = () => {
      if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) {
        return Promise.resolve();
      }
      return document.fonts
        .load('500 16px SJshoujin')
        .then(() => document.fonts.ready)
        .catch(() => {});
    };
    Promise.all([waitFont(), preload ? preload() : Promise.resolve()])
      .then(start)
      .catch(start);
  }

  if (typeof module === 'object' && module.exports) {
    boot();
  } else {
    root.bootYangGame = boot;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
