/**
 * 运行时适配：微信小游戏 / 浏览器
 */
(function (root, factory) {
  const exp = factory();
  if (typeof module === 'object' && module.exports) module.exports = exp;
  else Object.assign(root, exp);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createRuntime() {
    const isWx = typeof wx !== 'undefined' && wx.createCanvas;

    if (isWx) {
      const canvas = wx.createCanvas();
      const sys = wx.getSystemInfoSync();
      const dpr = sys.pixelRatio || 1;
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
        onTouch(handler) {
          wx.onTouchStart((e) => {
            const t = e.touches[0];
            handler(t.clientX, t.clientY);
          });
        },
        requestFrame(cb) {
          return requestAnimationFrame(cb);
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

    return {
      platform: 'browser',
      canvas,
      ctx,
      width,
      height,
      dpr,
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
