/**
 * 入口：适配层 → 预载花牌 → 游戏状态 → 渲染循环 → 输入
 */
(function (root) {
  function logBoot(tag, err) {
    const detail =
      err instanceof Error ? err.stack || err.message : err != null ? String(err) : tag;
    console.error('[boot:' + tag + ']', detail);
  }

  function resolve() {
    if (typeof module === 'object' && module.exports) {
      const flowers = require('./flowers');
      const config = require('./config');
      return {
        createRuntime: require('./adapter').createRuntime,
        Game: require('./game').Game,
        render: require('./render').render,
        preloadFlowers: flowers.preloadFlowers,
        setRenderDpr: flowers.setRenderDpr,
        loadGameFont: require('./font').loadGameFont,
        getFontStack: require('./font').getFontStack,
        CONFIG: config.CONFIG,
      };
    }
    return {
      createRuntime: root.createRuntime,
      Game: root.Game,
      render: root.render,
      preloadFlowers: root.preloadFlowers,
      setRenderDpr: root.setRenderDpr,
      loadGameFont: root.loadGameFont,
      getFontStack: root.getFontStack,
    };
  }

  function boot() {
    try {
      const { createRuntime, Game, render, preloadFlowers, setRenderDpr, loadGameFont, CONFIG: cfgFromMod } =
        resolve();
      const rt = createRuntime();
      const dpr = rt.dpr || 1;
      console.info('[boot] platform=', rt.platform, 'dpr=', dpr, 'size=', rt.width, 'x', rt.height);

      if (setRenderDpr) {
        setRenderDpr(dpr);
      } else {
        console.warn('[boot] setRenderDpr missing — tiles may look blurry');
      }

      const cfg = cfgFromMod || root.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
      if (rt.safeArea && cfg && cfg.ui) {
        cfg.ui.safeTop = Math.max(cfg.ui.safeTop || 0, rt.safeArea.top);
        cfg.ui.safeBottom = Math.max(cfg.ui.safeBottom || 0, rt.safeArea.bottom);
        cfg.ui.safeRight = Math.max(cfg.ui.safeRight || 0, rt.safeArea.right || 0);
      }

      const start = () => {
        try {
          const game = new Game(rt.width, rt.height);
          rt.onTouch((x, y) => game.tap(x, y));
          const loop = () => {
            try {
              render(rt.ctx, game);
            } catch (err) {
              logBoot('render', err);
            }
            rt.requestFrame(loop);
          };
          loop();
          console.info('[boot] game loop started, status=', game.status);
        } catch (err) {
          logBoot('start', err);
        }
      };

      const preload = preloadFlowers || root.preloadFlowers;
      const fontReady = loadGameFont
        ? loadGameFont()
            .then((stack) => {
              if (cfg && cfg.ui) {
                cfg.ui.fontStack = stack;
                console.info('[boot] fontStack applied', stack);
              } else {
                console.warn('[boot] CONFIG missing — fontStack not applied');
              }
            })
            .catch((err) => {
              logBoot('font', err);
            })
        : Promise.resolve();

      Promise.all([fontReady, preload ? preload() : Promise.resolve()])
        .then(start)
        .catch((err) => {
          logBoot('preload', err);
          start();
        });
    } catch (err) {
      logBoot('init', err);
    }
  }

  if (typeof module === 'object' && module.exports) {
    if (typeof wx !== 'undefined') {
      setTimeout(boot, 80);
    } else {
      boot();
    }
  } else {
    root.bootYangGame = boot;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
