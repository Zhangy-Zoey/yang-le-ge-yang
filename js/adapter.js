/**
 * 运行时适配：微信小游戏 / 浏览器
 */
(function (root, factory) {
  const exp = factory();
  if (typeof module === 'object' && module.exports) module.exports = exp;
  else Object.assign(root, exp);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function readBrowserSafeArea() {
    let top = 20;
    let bottom = 18;
    if (typeof document !== 'undefined' && typeof getComputedStyle !== 'undefined') {
      const probe = document.createElement('div');
      probe.style.cssText =
        'position:fixed;top:0;left:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);visibility:hidden;';
      document.documentElement.appendChild(probe);
      const cs = getComputedStyle(probe);
      top = parseFloat(cs.paddingTop) || top;
      bottom = parseFloat(cs.paddingBottom) || bottom;
      document.documentElement.removeChild(probe);
    }
    return { top: Math.ceil(top), bottom: Math.ceil(bottom), left: 0, right: 0 };
  }

  function readWxSafeArea(sys) {
    let top = sys.statusBarHeight || 0;
    let right = 0;
    try {
      if (typeof wx.getMenuButtonBoundingClientRect === 'function') {
        const menu = wx.getMenuButtonBoundingClientRect();
        if (menu && menu.bottom) top = Math.max(top, menu.bottom + 8);
        if (menu && menu.left > 0) {
          right = Math.max(0, sys.windowWidth - menu.left + 6);
        }
      }
    } catch (_) {
      /* ignore */
    }
    if (sys.safeArea && sys.safeArea.top > 0) {
      top = Math.max(top, sys.safeArea.top + 4);
    }
    const bottom =
      sys.safeArea && sys.windowHeight
        ? Math.max(16, sys.windowHeight - sys.safeArea.bottom + 4)
        : 16;
    return {
      top: Math.ceil(top),
      bottom: Math.ceil(bottom),
      left: 0,
      right: Math.ceil(right),
    };
  }

  function getWxSystemInfo() {
    for (let i = 0; i < 24; i++) {
      try {
        const sys = wx.getSystemInfoSync();
        if (sys && sys.windowWidth && sys.windowHeight) return sys;
      } catch (_) {
        /* jsbridge 未就绪时重试 */
      }
    }
    return {
      windowWidth: 375,
      windowHeight: 667,
      pixelRatio: 2,
      statusBarHeight: 20,
      safeArea: { top: 20, bottom: 667, left: 0, right: 375 },
    };
  }

  function createRuntime() {
    const isWx = typeof wx !== 'undefined' && wx.createCanvas;

    if (isWx) {
      const canvas = wx.createCanvas();
      const sys = getWxSystemInfo();
      const dpr = sys.pixelRatio || 1;
      const safeArea = readWxSafeArea(sys);
      canvas.width = sys.windowWidth * dpr;
      canvas.height = sys.windowHeight * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      return {
        platform: 'wx',
        canvas,
        ctx,
        width: sys.windowWidth,
        height: sys.windowHeight,
        dpr,
        safeArea,
        onTouch(handler) {
          wx.onTouchStart((e) => {
            const t = e.touches[0];
            handler(t.clientX, t.clientY);
          });
        },
        requestFrame(cb) {
          if (typeof canvas.requestAnimationFrame === 'function') {
            return canvas.requestAnimationFrame.call(canvas, cb);
          }
          if (typeof requestAnimationFrame === 'function') {
            return requestAnimationFrame(cb);
          }
          return setTimeout(cb, 16);
        },
      };
    }

    const canvas = document.getElementById('game');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.min(window.innerWidth, 430);
    const height = window.innerHeight;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const safeArea = readBrowserSafeArea();

    return {
      platform: 'browser',
      canvas,
      ctx,
      width,
      height,
      dpr,
      safeArea,
      onTouch(handler) {
        const fire = (e) => {
          e.preventDefault();
          const rect = canvas.getBoundingClientRect();
          const src = e.touches ? e.touches[0] : e;
          const scaleX = width / rect.width;
          const scaleY = height / rect.height;
          handler((src.clientX - rect.left) * scaleX, (src.clientY - rect.top) * scaleY);
        };
        canvas.addEventListener('touchstart', fire, { passive: false });
        canvas.addEventListener('mousedown', fire);
      },
      requestFrame(cb) {
        return requestAnimationFrame(cb);
      },
    };
  }

  return { createRuntime };
});
