/**
 * 花鸟织绣 —— 透明花 PNG + 同色玉石牌面一体绘制
 */
(function (root, factory) {
  const exp = factory();
  if (typeof module === 'object' && module.exports) module.exports = exp;
  else Object.assign(root, exp);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // tint: [玉心, 玉边] —— 五色淡彩，色相可辨
  const FLOWER_CATALOG = [
    { id: 'plum', name: '梅', src: 'assets/flowers/plum.png?v=5', tint: ['#F8DCDC', '#E0A0A0'] },
    { id: 'peony', name: '牡丹', src: 'assets/flowers/peony.png?v=5', tint: ['#F8E4DC', '#E8B0A0'] },
    { id: 'orchid', name: '兰', src: 'assets/flowers/orchid.png?v=5', tint: ['#E4F4DC', '#A8D898'] },
    { id: 'lotus', name: '莲', src: 'assets/flowers/lotus.png?v=5', tint: ['#EEF6F6', '#C8E4E0'] },
    { id: 'chrysanthemum', name: '菊', src: 'assets/flowers/chrysanthemum.png?v=5', tint: ['#F8F0C8', '#E8D070'] },
    { id: 'peach', name: '桃', src: 'assets/flowers/peach.png?v=5', tint: ['#F8E8DC', '#F0B898'] },
    { id: 'begonia', name: '海棠', src: 'assets/flowers/begonia.png?v=5', tint: ['#F8D8E4', '#E098B0'] },
    { id: 'hibiscus', name: '芙蓉', src: 'assets/flowers/hibiscus.png?v=5', tint: ['#F8D4D8', '#D88898'] },
    { id: 'osmanthus', name: '桂', src: 'assets/flowers/osmanthus.png?v=5', tint: ['#F4E8B0', '#D8C060'] },
    { id: 'herbPeony', name: '芍药', src: 'assets/flowers/herbPeony.png?v=5', tint: ['#F4D8E8', '#D890B0'] },
    { id: 'lilac', name: '丁香', src: 'assets/flowers/lilac.png?v=5', tint: ['#E8DCF8', '#B898D8'] },
    { id: 'magnolia', name: '玉兰', src: 'assets/flowers/magnolia.png?v=5', tint: ['#F4ECE4', '#D8C0B0'] },
  ];

  /** 花图占棋子面积（内边距越小花越大） */
  const FLOWER_INSET = 0.14;

  /** 羊脂白（空槽/底色） */
  const YANGZHI = ['#FAF5EE', '#E8E0D6'];

  const FLOWER_IDS = FLOWER_CATALOG.map((f) => f.id);
  const FLOWER_MAP = {};
  FLOWER_CATALOG.forEach((f) => {
    FLOWER_MAP[f.id] = f;
  });

  const imageCache = {};
  const tileSpriteCache = {};
  const loadPromises = {};
  let preloadDone = false;
  let renderDpr = 1;

  function isWxRuntime() {
    return typeof wx !== 'undefined' && wx.createCanvas;
  }

  function snapPx(v) {
    return Math.round(v * 2) / 2;
  }

  function setRenderDpr(dpr) {
    const next = Math.max(1, Math.min(dpr || 1, 3));
    if (next === renderDpr) return;
    renderDpr = next;
    Object.keys(tileSpriteCache).forEach((k) => delete tileSpriteCache[k]);
  }

  function prepCtx(ctx) {
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality !== undefined) ctx.imageSmoothingQuality = 'high';
  }

  function createImage() {
    if (typeof wx !== 'undefined' && wx.createImage) return wx.createImage();
    if (typeof Image !== 'undefined') return new Image();
    return null;
  }

  function createOffscreen(w, h) {
    const iw = Math.max(1, Math.ceil(w));
    const ih = Math.max(1, Math.ceil(h));
    if (typeof wx !== 'undefined' && wx.createCanvas) {
      const canvas = wx.createCanvas();
      canvas.width = iw;
      canvas.height = ih;
      return { canvas, ctx: canvas.getContext('2d') };
    }
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = iw;
      canvas.height = ih;
      return { canvas, ctx: canvas.getContext('2d') };
    }
    return null;
  }

  function isReady(img) {
    return img && (img.complete || img.width > 0) && (img.naturalWidth || img.width) > 0;
  }

  function mixHex(hexA, hexB, t) {
    const a = parseInt(hexA.slice(1), 16);
    const b = parseInt(hexB.slice(1), 16);
    const ar = (a >> 16) & 255;
    const ag = (a >> 8) & 255;
    const ab = a & 255;
    const br = (b >> 16) & 255;
    const bg = (b >> 8) & 255;
    const bb = b & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }

  function hexA(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }

  /** 正圆玉牌路径，inset 为相对 min(w,h) 的半径比例 */
  function jadeCircle(ctx, x, y, w, h, inset) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rad = (Math.min(w, h) / 2) * (inset != null ? inset : 0.94);
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.closePath();
    return { cx, cy, rad };
  }

  function loadFlowerImage(flowerId) {
    if (imageCache[flowerId]) return Promise.resolve(imageCache[flowerId]);
    if (loadPromises[flowerId]) return loadPromises[flowerId];

    const meta = FLOWER_MAP[flowerId];
    if (!meta) return Promise.resolve(null);

    loadPromises[flowerId] = new Promise((resolve) => {
      const img = createImage();
      if (!img) {
        resolve(null);
        return;
      }
      img.onload = () => {
        imageCache[flowerId] = img;
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = meta.src;
    });
    return loadPromises[flowerId];
  }

  function preloadFlowers() {
    if (preloadDone) return Promise.resolve();
    return Promise.all(FLOWER_IDS.map(loadFlowerImage)).then(() => {
      preloadDone = true;
      Object.keys(tileSpriteCache).forEach((k) => delete tileSpriteCache[k]);
    });
  }

  function drawImageCover(ctx, img, x, y, w, h, pad) {
    const p = pad || 0;
    const boxW = w - p * 2;
    const boxH = h - p * 2;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.min(boxW / iw, boxH / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = snapPx(x + p + (boxW - dw) / 2);
    const dy = snapPx(y + p + (boxH - dh) / 2);
    const sdw = snapPx(dw);
    const sdh = snapPx(dh);
    ctx.drawImage(img, dx, dy, sdw, sdh);
  }

  /** 正圆羊脂玉：球面高光 + 温润半透明感 */
  function drawJadeBase(ctx, x, y, w, h, light, deep, blocked) {
    const jLight = mixHex(light, '#FFFCF8', blocked ? 0.44 : 0.14);
    const jDeep = mixHex(deep, '#FFFCF8', blocked ? 0.52 : 0.22);
    const jEdge = mixHex(jDeep, '#FFF9F4', blocked ? 0.62 : 0.4);
    const { cx, cy, rad } = jadeCircle(ctx, x, y, w, h, 0.94);

    // 球体主光：左上亮、右下润
    const body = ctx.createRadialGradient(
      cx - rad * 0.34,
      cy - rad * 0.38,
      rad * 0.08,
      cx + rad * 0.08,
      cy + rad * 0.12,
      rad * 1.08
    );
    if (blocked) {
      body.addColorStop(0, mixHex(jLight, '#F0ECE6', 0.35));
      body.addColorStop(0.42, jLight);
      body.addColorStop(0.78, mixHex(jLight, jDeep, 0.22));
      body.addColorStop(1, jEdge);
    } else {
      body.addColorStop(0, mixHex(jLight, '#FFFFFF', 0.62));
      body.addColorStop(0.38, jLight);
      body.addColorStop(0.72, mixHex(jLight, jDeep, 0.18));
      body.addColorStop(1, jEdge);
    }
    ctx.fillStyle = body;
    ctx.fill();

    ctx.save();
    jadeCircle(ctx, x, y, w, h, 0.94);
    ctx.clip();

    // 玉理：内弧沁色
    ctx.globalAlpha = blocked ? 0.05 : 0.09;
    ctx.strokeStyle = mixHex(jDeep, '#E0D8D0', 0.35);
    ctx.lineWidth = 0.45;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - rad * 0.42, cy - rad * 0.12);
    ctx.quadraticCurveTo(cx - rad * 0.04, cy + rad * 0.08, cx + rad * 0.46, cy + rad * 0.34);
    ctx.stroke();

    // 下半球暗部，营造厚度
    const shade = ctx.createRadialGradient(cx, cy + rad * 0.55, rad * 0.05, cx, cy, rad);
    shade.addColorStop(0, blocked ? 'rgba(72,64,58,0.18)' : 'rgba(72,64,58,0.06)');
    shade.addColorStop(0.55, 'rgba(255,252,248,0)');
    ctx.fillStyle = shade;
    ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);

    // 顶缘高光弧
    if (!blocked) {
      ctx.globalAlpha = 0.48;
      const spec = ctx.createRadialGradient(
        cx - rad * 0.22,
        cy - rad * 0.38,
        0,
        cx - rad * 0.08,
        cy - rad * 0.22,
        rad * 0.55
      );
      spec.addColorStop(0, 'rgba(255,253,250,0.95)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    } else {
      ctx.globalAlpha = 0.24;
      const press = ctx.createRadialGradient(cx, cy + rad * 0.38, rad * 0.1, cx, cy, rad);
      press.addColorStop(0, 'rgba(58,52,48,0.22)');
      press.addColorStop(0.6, 'rgba(255,252,248,0)');
      ctx.fillStyle = press;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    ctx.restore();

    // 外缘：上亮下润
    jadeCircle(ctx, x, y, w, h, 0.94);
    const rim = ctx.createLinearGradient(cx, cy - rad, cx, cy + rad);
    if (blocked) {
      rim.addColorStop(0, 'rgba(228,222,214,0.45)');
      rim.addColorStop(0.5, 'rgba(188,180,170,0.32)');
      rim.addColorStop(1, 'rgba(148,140,132,0.42)');
    } else {
      rim.addColorStop(0, 'rgba(255,255,255,0.88)');
      rim.addColorStop(0.35, mixHex(jLight, '#FFFFFF', 0.52));
      rim.addColorStop(1, mixHex(jDeep, '#B8B0A8', 0.32));
    }
    ctx.strokeStyle = rim;
    ctx.lineWidth = blocked ? 0.7 : 1.05;
    ctx.stroke();

    // 可点牌：顶缘亮弧
    if (!blocked) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = 'rgba(255,252,248,0.75)';
      ctx.lineWidth = Math.max(0.8, rad * 0.07);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.92, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      ctx.restore();
    }
  }

  function flowerActiveFilter(flowerId) {
    if (flowerId === 'lotus') {
      return 'saturate(1.08) contrast(1.04) brightness(0.98)';
    }
    return 'saturate(1.68) contrast(1.18) brightness(1.06)';
  }

  function drawFlowerCutout(ctx, flowerId, x, y, w, h, blocked) {
    const img = imageCache[flowerId];
    if (!isReady(img)) return false;

    const pad = Math.min(w, h) * FLOWER_INSET;
    ctx.save();
    if (ctx.filter !== undefined) {
      ctx.filter = blocked
        ? 'saturate(0.52) brightness(0.8) contrast(0.9)'
        : flowerActiveFilter(flowerId);
    }
    drawImageCover(ctx, img, x, y, w, h, pad);
    ctx.restore();
    return true;
  }

  function drawFlowerGlyph(ctx, flowerId, x, y, w, h, blocked) {
    const meta = FLOWER_MAP[flowerId] || FLOWER_CATALOG[0];
    const [light, deep] = meta.tint;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.22;

    ctx.save();
    if (blocked) {
      if (ctx.filter !== undefined) ctx.filter = 'saturate(58%) brightness(0.9)';
    }

    ctx.globalAlpha = 0.35;
    const wash = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.1);
    wash.addColorStop(0, mixHex(light, deep, 0.2));
    wash.addColorStop(1, deep + '00');
    ctx.fillStyle = wash;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = blocked ? 0.72 : 0.88;
    ctx.fillStyle = mixHex(deep, '#6A6258', 0.22);
    ctx.font = `${Math.max(11, Math.min(w, h) * 0.3)}px "GameQigong", "STKaiti", "Kaiti SC", "Songti SC", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.name, cx, cy + 0.5);
    ctx.restore();
  }

  function paintFlowerTile(ctx, flowerId, w, h, blocked) {
    const meta = FLOWER_MAP[flowerId] || FLOWER_CATALOG[0];
    const [light, deep] = meta.tint;

    drawJadeBase(ctx, 0, 0, w, h, light, deep, blocked);

    ctx.save();
    if (blocked && ctx.filter !== undefined) {
      ctx.filter = 'saturate(0.45) brightness(0.76) contrast(0.88)';
    }

    jadeCircle(ctx, 0, 0, w, h, 0.94);
    ctx.clip();

    if (!drawFlowerCutout(ctx, flowerId, 0, 0, w, h, blocked)) {
      drawFlowerGlyph(ctx, flowerId, 0, 0, w, h, blocked);
    }
    ctx.restore();

    if (blocked) {
      const { cx, cy, rad } = jadeCircle(ctx, 0, 0, w, h, 0.94);
      ctx.save();
      jadeCircle(ctx, 0, 0, w, h, 0.94);
      ctx.clip();
      ctx.fillStyle = 'rgba(200,192,182,0.16)';
      ctx.fill();
      const veil = ctx.createRadialGradient(cx, cy + rad * 0.28, rad * 0.1, cx, cy, rad);
      veil.addColorStop(0, 'rgba(148,138,128,0.28)');
      veil.addColorStop(0.55, 'rgba(210,204,196,0.12)');
      veil.addColorStop(1, 'rgba(255,252,248,0)');
      ctx.fillStyle = veil;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      ctx.restore();
    }
  }

  function spriteCacheKey(flowerId, w, h, blocked) {
    return (
      flowerId +
      '_' +
      Math.round(w * 10) / 10 +
      'x' +
      Math.round(h * 10) / 10 +
      (blocked ? '_b' : '') +
      '@' +
      renderDpr +
      '_v2'
    );
  }

  function getTileSprite(flowerId, w, h, blocked) {
    if (isWxRuntime()) return null;

    const key = spriteCacheKey(flowerId, w, h, blocked);
    if (tileSpriteCache[key]) return tileSpriteCache[key];

    const dpr = renderDpr;
    const off = createOffscreen(w * dpr, h * dpr);
    if (!off) return null;

    prepCtx(off.ctx);
    off.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintFlowerTile(off.ctx, flowerId, w, h, blocked);
    tileSpriteCache[key] = off.canvas;
    return off.canvas;
  }

  function drawEmptyJadeSlot(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rad = (Math.min(w, h) / 2) * 0.98;

    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,250,244,0.72)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(94,136,120,0.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.9, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(94,136,120,0.28)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  /**
   * 一体花牌：离屏合成实底，叠层不穿透
   */
  function drawFlowerTile(ctx, flowerId, x, y, w, h, blocked) {
    const sizeW = Math.max(8, w);
    const sizeH = Math.max(8, h);
    prepCtx(ctx);

    const sx = snapPx(x);
    const sy = snapPx(y);

    if (isWxRuntime()) {
      ctx.save();
      ctx.translate(sx, sy);
      paintFlowerTile(ctx, flowerId, sizeW, sizeH, !!blocked);
      ctx.restore();
      return;
    }

    const sprite = getTileSprite(flowerId, sizeW, sizeH, !!blocked);
    if (sprite) {
      ctx.drawImage(sprite, sx, sy, sizeW, sizeH);
      return;
    }
    ctx.save();
    ctx.translate(sx, sy);
    paintFlowerTile(ctx, flowerId, sizeW, sizeH, !!blocked);
    ctx.restore();
  }

  function drawFlowerIcon(ctx, flowerId, x, y, size, muted) {
    const img = imageCache[flowerId];
    ctx.save();
    if (muted) {
      if (ctx.filter !== undefined) ctx.filter = 'saturate(70%) brightness(0.96)';
    }
    if (isReady(img)) {
      drawImageCover(ctx, img, x, y, size, size, size * FLOWER_INSET);
    } else {
      drawFlowerGlyph(ctx, flowerId, x, y, size, size, muted);
    }
    ctx.restore();
  }

  return {
    FLOWER_CATALOG,
    FLOWER_IDS,
    FLOWER_MAP,
    setRenderDpr,
    preloadFlowers,
    loadFlowerImage,
    drawFlowerTile,
    drawFlowerIcon,
    drawEmptyJadeSlot,
  };
});
