/**
 * 花鸟织绣 —— 透明花 PNG + 同色玉石牌面一体绘制
 */
(function (root, factory) {
  const exp = factory();
  if (typeof module === 'object' && module.exports) module.exports = exp;
  else Object.assign(root, exp);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // tint: [玉心, 玉边] —— 从各花 PNG 主色提取，再略羊脂润；花色彼此可辨
  const FLOWER_CATALOG = [
    { id: 'plum', name: '梅', src: 'assets/flowers/plum.png?v=3', tint: ['#FAECE8', '#EEC8C0'] },
    { id: 'peony', name: '牡丹', src: 'assets/flowers/peony.png?v=3', tint: ['#FAE8E6', '#F0C8C0'] },
    { id: 'orchid', name: '兰', src: 'assets/flowers/orchid.png?v=3', tint: ['#EEF6EA', '#D0E4C8'] },
    { id: 'lotus', name: '莲', src: 'assets/flowers/lotus.png?v=3', tint: ['#F2F8F4', '#C8E0D8'] },
    { id: 'chrysanthemum', name: '菊', src: 'assets/flowers/chrysanthemum.png?v=3', tint: ['#FAF4DC', '#EDE0A8'] },
    { id: 'peach', name: '桃', src: 'assets/flowers/peach.png?v=3', tint: ['#FCF0EA', '#F4D0C0'] },
    { id: 'begonia', name: '海棠', src: 'assets/flowers/begonia.png?v=3', tint: ['#FAE8EC', '#ECC0C8'] },
    { id: 'hibiscus', name: '芙蓉', src: 'assets/flowers/hibiscus.png?v=3', tint: ['#FAE6E2', '#EAC0B8'] },
    { id: 'osmanthus', name: '桂', src: 'assets/flowers/osmanthus.png?v=3', tint: ['#F6F2D8', '#E4D898'] },
    { id: 'herbPeony', name: '芍药', src: 'assets/flowers/herbPeony.png?v=3', tint: ['#FAE8EE', '#ECC8D4'] },
    { id: 'lilac', name: '丁香', src: 'assets/flowers/lilac.png?v=3', tint: ['#F2EAFA', '#D8CCE8'] },
    { id: 'magnolia', name: '玉兰', src: 'assets/flowers/magnolia.png?v=3', tint: ['#F8F4EE', '#E8DED4'] },
  ];

  /** 羊脂白（空槽/底色） */
  const YANGZHI = ['#F5EDE4', '#DDD4C8'];

  const FLOWER_IDS = FLOWER_CATALOG.map((f) => f.id);
  const FLOWER_MAP = {};
  FLOWER_CATALOG.forEach((f) => {
    FLOWER_MAP[f.id] = f;
  });

  const imageCache = {};
  const tileSpriteCache = {};
  const loadPromises = {};
  let preloadDone = false;

  function createImage() {
    if (typeof wx !== 'undefined' && wx.createImage) return wx.createImage();
    if (typeof Image !== 'undefined') return new Image();
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

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
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
    const dx = x + p + (boxW - dw) / 2;
    const dy = y + p + (boxH - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /** 羊脂润实玉：淡色不透明底 + 花色可辨（叠牌不穿透） */
  function drawJadeBase(ctx, x, y, w, h, light, deep, blocked) {
    const jLight = mixHex(light, '#FFFBF6', blocked ? 0.28 : 0.18);
    const jDeep = mixHex(deep, '#FFFBF6', blocked ? 0.38 : 0.28);
    const jEdge = mixHex(jDeep, '#FFF8F2', 0.42);
    const r = Math.min(w, h) * 0.44;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const spread = Math.max(w, h) * 0.54;

    ctx.save();
    if (!blocked) {
      ctx.shadowColor = 'rgba(70,62,52,0.1)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 2;
    }

    roundRect(ctx, x, y, w - 1, h - 1, r);

    const body = ctx.createRadialGradient(cx - w * 0.16, cy - h * 0.2, w * 0.04, cx, cy + h * 0.02, spread);
    if (blocked) {
      body.addColorStop(0, mixHex(jLight, '#FFF8F2', 0.35));
      body.addColorStop(0.6, jLight);
      body.addColorStop(1, jEdge);
    } else {
      body.addColorStop(0, mixHex(jLight, '#FFFFFF', 0.42));
      body.addColorStop(0.42, jLight);
      body.addColorStop(0.78, mixHex(jLight, jDeep, 0.22));
      body.addColorStop(1, jEdge);
    }
    ctx.fillStyle = body;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.clip();

    ctx.globalAlpha = blocked ? 0.05 : 0.1;
    ctx.strokeStyle = mixHex(jDeep, '#D8D0C8', 0.35);
    ctx.lineWidth = 0.45;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.14, y + h * 0.2);
    ctx.quadraticCurveTo(cx, cy + h * 0.02, x + w * 0.82, y + h * 0.78);
    ctx.stroke();

    ctx.globalAlpha = blocked ? 0.03 : 0.05;
    const warm = ctx.createLinearGradient(x, y + h * 0.62, x, y + h);
    warm.addColorStop(0, 'rgba(0,0,0,0)');
    warm.addColorStop(1, hexA(mixHex(jDeep, '#E8E0D8', 0.55), 0.1));
    ctx.fillStyle = warm;
    ctx.fillRect(x, y, w, h);

    ctx.restore();

    roundRect(ctx, x, y, w - 1, h - 1, r);
    ctx.strokeStyle = blocked ? 'rgba(180,172,162,0.32)' : mixHex(jLight, '#FFFFFF', 0.45);
    ctx.lineWidth = 0.95;
    ctx.stroke();

    if (!blocked) {
      ctx.save();
      roundRect(ctx, x, y, w - 1, h - 1, r);
      ctx.clip();
      ctx.globalAlpha = 0.42;
      const spec = ctx.createRadialGradient(cx - w * 0.1, cy - h * 0.26, 0, cx - w * 0.06, cy - h * 0.2, w * 0.28);
      spec.addColorStop(0, 'rgba(255,252,248,0.82)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
  }

  /** 绣台空槽：与棋盘棋子同形同色（羊脂底） */
  function drawEmptyJadeSlot(ctx, x, y, w, h) {
    drawJadeBase(ctx, x, y, w, h, YANGZHI[0], YANGZHI[1], true);
  }

  /** 花图叠在透玉上，略透底 */
  function drawFlowerCutout(ctx, flowerId, x, y, w, h) {
    const img = imageCache[flowerId];
    if (!isReady(img)) return false;

    const pad = Math.min(w, h) * 0.05;
    ctx.save();
    drawImageCover(ctx, img, x, y, w, h, pad);
    ctx.restore();
    return true;
  }

  /** 无 PNG 时的水墨字 */
  function drawFlowerGlyph(ctx, flowerId, x, y, w, h, blocked) {
    const meta = FLOWER_MAP[flowerId] || FLOWER_CATALOG[0];
    const [light, deep] = meta.tint;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.28;

    ctx.save();
    if (blocked) ctx.globalAlpha = 0.5;

    ctx.globalAlpha *= 0.4;
    const wash = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.2);
    wash.addColorStop(0, mixHex(light, deep, 0.25));
    wash.addColorStop(1, deep + '00');
    ctx.fillStyle = wash;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = blocked ? 0.55 : 0.85;
    ctx.fillStyle = mixHex(deep, '#3A403C', 0.3);
    ctx.font = `500 ${Math.max(12, Math.min(w, h) * 0.36)}px "SJshoujin", "宋徽宗瘦金体", "Songti SC", "STSong", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.name, cx, cy + 0.5);
    ctx.restore();
  }

  /**
   * 一体花牌：玉底（花色同调）+ 抠图花
   * 不再单独叠白色方框
   */
  function drawFlowerTile(ctx, flowerId, x, y, w, h, blocked) {
    const meta = FLOWER_MAP[flowerId] || FLOWER_CATALOG[0];
    const [light, deep] = meta.tint;

    drawJadeBase(ctx, x, y, w, h, light, deep, blocked);

    ctx.save();
    if (blocked) {
      ctx.globalAlpha = 0.52;
      if (ctx.filter !== undefined) ctx.filter = 'grayscale(20%) saturate(62%)';
    }

    roundRect(ctx, x + 1, y + 1, w - 3, h - 3, Math.min(w, h) * 0.42);
    ctx.clip();

    if (!drawFlowerCutout(ctx, flowerId, x, y, w, h)) {
      drawFlowerGlyph(ctx, flowerId, x, y, w, h, blocked);
    }
    ctx.restore();
  }

  /** 消除特效等小尺寸：仅花图 */
  function drawFlowerIcon(ctx, flowerId, x, y, size, muted) {
    const img = imageCache[flowerId];
    ctx.save();
    if (muted) {
      ctx.globalAlpha = 0.5;
      if (ctx.filter !== undefined) ctx.filter = 'grayscale(18%) saturate(70%)';
    }
    if (isReady(img)) {
      drawImageCover(ctx, img, x, y, size, size, size * 0.04);
    } else {
      drawFlowerGlyph(ctx, flowerId, x, y, size, size, muted);
    }
    ctx.restore();
  }

  return {
    FLOWER_CATALOG,
    FLOWER_IDS,
    FLOWER_MAP,
    preloadFlowers,
    loadFlowerImage,
    drawFlowerTile,
    drawFlowerIcon,
    drawEmptyJadeSlot,
  };
});
