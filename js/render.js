/**
 * 花鸟织绣 UI · 江南水彩
 * 一张宣纸、棋子为实、UI 只留墨线，不加手游壳
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const { CONFIG, getLayout, getHomeLayout } = require('./config');
    const flowers = require('./flowers');
    const fontApi = require('./font');
    module.exports = factory(CONFIG, getLayout, getHomeLayout, flowers, fontApi);
  } else {
    Object.assign(root, factory(root.CONFIG, root.getLayout, root.getHomeLayout, root, root));
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (CONFIG, getLayout, getHomeLayout, flowersApi, fontApi) {
  const { drawFlowerTile, drawEmptyJadeSlot } = flowersApi;

  function palette() {
    return CONFIG.palette || {};
  }

  function fontFace() {
    if (CONFIG.ui && CONFIG.ui.fontStack) return CONFIG.ui.fontStack;
    if (fontApi && fontApi.getFontStack) return fontApi.getFontStack();
    return '"Songti SC", "STSong", "PingFang SC", serif';
  }

  function systemFace() {
    if (fontApi && fontApi.getSystemStack) return fontApi.getSystemStack();
    return '"Songti SC", "STSong", "PingFang SC", serif';
  }

  function needsRareFallback(ch) {
    if (fontApi && fontApi.isRareGlyph) return fontApi.isRareGlyph(ch);
    return /[秾葳蕤]/.test(ch || '');
  }

  /** 题名混排：主字体 + 缺字回退系统楷/宋 */
  function fillLiteratiLine(ctx, text, x, y, size, bold) {
    const primary = makeFont(size);
    const fallback = size + 'px ' + systemFace();
    let cx = x;
    for (const ch of text) {
      ctx.font = needsRareFallback(ch) ? fallback : primary;
      if (bold) {
        ctx.fillText(ch, cx, y);
        ctx.fillText(ch, cx + 0.65, y);
      } else {
        ctx.fillText(ch, cx, y);
      }
      cx += ctx.measureText(ch).width;
    }
  }

  function measureLiteratiLine(ctx, text, size) {
    const primary = makeFont(size);
    const fallback = size + 'px ' + systemFace();
    let w = 0;
    for (const ch of text) {
      ctx.font = needsRareFallback(ch) ? fallback : primary;
      w += ctx.measureText(ch).width;
    }
    return w;
  }

  function textColor(role) {
    const C = palette();
    if (role === 'primary') return C.ink || '#504840';
    if (role === 'secondary') return C.inkSoft || '#6A6258';
    if (role === 'muted') return C.inkFaint || '#8A8278';
    return C.ink || '#504840';
  }

  function fillBoldText(ctx, text, x, y) {
    ctx.fillText(text, x, y);
    ctx.fillText(text, x + 0.65, y);
  }

  /** 单字重手写体，避免 500/600 触发系统回退 */
  function makeFont(size, weight) {
    const face = fontFace();
    if (weight && weight !== '400' && weight !== 'normal') {
      return weight + ' ' + size + 'px ' + face;
    }
    return size + 'px ' + face;
  }

  function FONT() {
    return {
      hero: makeFont(30),
      title: makeFont(19),
      gameTitle: makeFont(22),
      gameMeta: makeFont(13),
      subtitle: makeFont(14),
      meta: makeFont(12),
      tip: makeFont(11),
      dockLabel: makeFont(13),
      btn: makeFont(15),
      body: makeFont(14),
    };
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

  /** 水彩晕染团 — 模拟湿纸洇开 */
  function drawWashBlob(ctx, cx, cy, rx, ry, inner, outer, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha != null ? alpha : 1;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, inner);
    g.addColorStop(0.55, outer);
    g.addColorStop(1, outer.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 暖光透窗 — 参考图右上金色漫射 */
  function drawSunHaze(ctx, w, h) {
    const C = palette();
    drawWashBlob(ctx, w * 0.78, h * 0.1, w * 0.55, h * 0.32, C.sunlightCore || 'rgba(255,236,200,0.35)', C.sunlight || 'rgba(255,214,160,0.12)', 0.9);
    drawWashBlob(ctx, w * 0.62, h * 0.22, w * 0.38, h * 0.22, 'rgba(255,248,230,0.2)', 'rgba(255,220,180,0.04)', 0.75);
  }

  /** 檐角淡墨 — 左上压暗，托出花影 */
  function drawEaveWash(ctx, w, h) {
    const C = palette();
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, w * 0.55, h * 0.45);
    g.addColorStop(0, C.eaveInk || 'rgba(58,52,72,0.16)');
    g.addColorStop(0.45, 'rgba(58,52,72,0.04)');
    g.addColorStop(1, 'rgba(58,52,72,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.72, 0);
    ctx.quadraticCurveTo(w * 0.38, h * 0.12, w * 0.08, h * 0.38);
    ctx.quadraticCurveTo(0, h * 0.18, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** 垂枝桃花 — 柔线 + 粉瓣，虚在背景 */
  function drawDrapingBlossoms(ctx, w, h, t, strength) {
    const C = palette();
    const s = strength != null ? strength : 1;
    const sway = Math.sin(t * 0.45) * 3;

    ctx.save();
    ctx.globalAlpha = 0.14 * s;
    ctx.strokeStyle = '#6A5A52';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w * 0.02, -8);
    ctx.bezierCurveTo(w * 0.08, h * 0.06, w * 0.18 + sway, h * 0.22, w * 0.28 + sway * 0.6, h * 0.42);
    ctx.bezierCurveTo(w * 0.34, h * 0.52, w * 0.22, h * 0.58, w * 0.12, h * 0.48);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(w * 0.06, h * 0.04);
    ctx.quadraticCurveTo(w * 0.14, h * 0.12, w * 0.2 + sway * 0.3, h * 0.2);
    ctx.stroke();
    ctx.restore();

    const petalSpots = [
      [0.1, 0.08, 5, 3.2],
      [0.16, 0.14, 4.5, 3],
      [0.22, 0.2, 5.5, 3.4],
      [0.28, 0.28, 4, 2.8],
      [0.14, 0.32, 4.8, 3],
      [0.08, 0.24, 3.5, 2.4],
      [0.32, 0.36, 4.2, 2.9],
    ];
    petalSpots.forEach(([px, py, rx, ry], i) => {
      const ph = t * 0.35 + i * 0.9;
      const ox = Math.sin(ph) * 2;
      const oy = Math.cos(ph * 0.7) * 1.5;
      drawWashBlob(
        ctx,
        px * w + ox,
        py * h + oy,
        rx,
        ry,
        C.blossom || '#E8A8A8',
        'rgba(232,168,168,0)',
        0.22 * s
      );
    });
  }

  /** 光斑 bokeh */
  function drawLightBokeh(ctx, w, h, t) {
    const spots = [
      [0.72, 0.14, 18],
      [0.85, 0.08, 12],
      [0.64, 0.22, 10],
      [0.9, 0.2, 8],
    ];
    spots.forEach(([px, py, r], i) => {
      const pulse = 1 + Math.sin(t * 0.8 + i) * 0.08;
      ctx.save();
      ctx.globalAlpha = 0.12 + Math.sin(t * 0.5 + i * 1.3) * 0.04;
      const g = ctx.createRadialGradient(px * w, py * h, 0, px * w, py * h, r * pulse);
      g.addColorStop(0, 'rgba(255,252,240,0.9)');
      g.addColorStop(0.4, 'rgba(255,236,200,0.35)');
      g.addColorStop(1, 'rgba(255,236,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px * w, py * h, r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  /** 水彩面板：湿边 + 淡填 */
  function drawWatercolorPanel(ctx, x, y, w, h, r, opts) {
    const C = palette();
    const o = opts || {};
    const bleed = o.bleed != null ? o.bleed : 3;

    ctx.save();
    roundRect(ctx, x - bleed, y - bleed, w + bleed * 2, h + bleed * 2, r + 2);
    const edge = ctx.createLinearGradient(x, y, x + w, y + h);
    edge.addColorStop(0, o.edgeTop || 'rgba(232,168,168,0.14)');
    edge.addColorStop(0.5, o.edgeMid || 'rgba(255,252,248,0.08)');
    edge.addColorStop(1, o.edgeBot || 'rgba(143,174,158,0.12)');
    ctx.fillStyle = edge;
    ctx.fill();
    ctx.restore();

    roundRect(ctx, x, y, w, h, r);
    const fill = ctx.createLinearGradient(x, y, x, y + h);
    fill.addColorStop(0, o.fillTop || C.frost || 'rgba(255,252,248,0.88)');
    fill.addColorStop(1, o.fillBot || 'rgba(255,246,238,0.72)');
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
    if (o.washPink) {
      drawWashBlob(ctx, x + w * 0.2, y + h * 0.15, w * 0.35, h * 0.25, 'rgba(232,168,168,0.1)', 'rgba(232,168,168,0)', 1);
    }
    if (o.washGreen) {
      drawWashBlob(ctx, x + w * 0.82, y + h * 0.75, w * 0.28, h * 0.22, 'rgba(143,174,158,0.08)', 'rgba(143,174,158,0)', 1);
    }
    ctx.restore();

    ctx.strokeStyle = o.stroke || C.boardEdge || 'rgba(196,152,152,0.22)';
    ctx.lineWidth = o.lineWidth != null ? o.lineWidth : 0.7;
    roundRect(ctx, x, y, w, h, r);
    ctx.stroke();
  }

  /** 飘落瓣雨 */
  function drawFallingPetals(ctx, w, h, t, count) {
    const C = palette();
    const n = count != null ? count : 5;
    for (let i = 0; i < n; i++) {
      const ph = t * 0.12 + i * 1.7;
      const px = ((0.12 + i * 0.17 + Math.sin(ph) * 0.06) % 1) * w;
      const py = ((ph * 0.04 + i * 0.11) % 1.05) * h;
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.translate(px, py);
      ctx.rotate(ph * 0.5);
      ctx.fillStyle = i % 2 ? C.blossom || '#E8A8A8' : C.celadon || '#7F9E96';
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** 江南背景装饰：虚、淡、不抢棋子 */
  function drawLiteratiDecor(ctx, w, h, t) {
    const C = palette();

    drawEaveWash(ctx, w, h);
    drawDrapingBlossoms(ctx, w, h, t, 0.85);
    drawLightBokeh(ctx, w, h, t);
    drawFallingPetals(ctx, w, h, t, 6);

    // 远山淡影（青绿水彩）
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = C.celadon || '#7F9E96';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.8);
    ctx.bezierCurveTo(w * 0.18, h * 0.74, w * 0.4, h * 0.82, w * 0.58, h * 0.76);
    ctx.bezierCurveTo(w * 0.74, h * 0.7, w * 0.9, h * 0.78, w, h * 0.73);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    drawWashBlob(ctx, w * 0.5, h * 0.88, w * 0.6, h * 0.18, C.sageWash || 'rgba(143,174,158,0.1)', 'rgba(143,174,158,0)', 0.8);
  }

  /** 宣纸底：暖纸 + 水彩晕染 */
  function drawLiteratiGround(ctx, L, t, minimal) {
    const C = palette();
    const { w, h } = L;

    const wash = ctx.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, C.paperWarm || '#FFF6EE');
    wash.addColorStop(0.42, C.paper || '#FBF8F3');
    wash.addColorStop(1, C.paperDeep || '#F3EBE2');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);

    drawSunHaze(ctx, w, h);
    drawEaveWash(ctx, w, h);

    drawWashBlob(ctx, w * 0.12, h * 0.08, w * 0.42, h * 0.28, 'rgba(232,168,168,0.14)', 'rgba(232,168,168,0)', 1);
    drawWashBlob(ctx, w * 0.05, h * 0.28, w * 0.32, h * 0.22, 'rgba(232,168,168,0.08)', 'rgba(232,168,168,0)', 1);

    if (minimal) {
      drawDrapingBlossoms(ctx, w, h, t, 1.1);
      drawLightBokeh(ctx, w, h, t);
      drawFallingPetals(ctx, w, h, t, 4);
    } else {
      drawWashBlob(ctx, w * 0.82, h * 0.68, w * 0.38, h * 0.32, C.sageWash || 'rgba(143,174,158,0.1)', 'rgba(143,174,158,0)', 1);
      drawLiteratiDecor(ctx, w, h, t);
    }
  }

  /** 首页：居中题跋 · 顶留白 · 棋子实 */
  function drawHomeScreen(ctx, game, t) {
    const C = palette();
    const F = FONT();
    const H = game.homeLayout ? game.homeLayout() : getHomeLayout(game.width, game.height);
    const theme = CONFIG.theme || {};
    const { cx, sealX, sealY, sealW, sealH, titleY, subtitleY, taglineY, ruleY, demoIds, demoX, demoY, demoTileSize, demoGap, homeBtn, hintY } = H;

    const panelW = Math.min(300, H.w - 40);
    const panelH = hintY - sealY + 28;
    const panelX = cx - panelW / 2;
    const panelY = sealY - 16;
    drawWatercolorPanel(ctx, panelX, panelY, panelW, panelH, 18, {
      washPink: true,
      washGreen: true,
      fillTop: 'rgba(255,252,248,0.52)',
      fillBot: 'rgba(255,244,236,0.38)',
      edgeTop: 'rgba(232,168,168,0.18)',
      edgeBot: 'rgba(143,174,158,0.14)',
    });

    // 印
    roundRect(ctx, sealX, sealY, sealW, sealH, 3);
    const sealG = ctx.createLinearGradient(sealX, sealY, sealX, sealY + sealH);
    sealG.addColorStop(0, 'rgba(212,136,136,0.88)');
    sealG.addColorStop(1, 'rgba(184,122,124,0.78)');
    ctx.fillStyle = sealG;
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,72,72,0.25)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.fillStyle = '#FDFBF7';
    ctx.font = makeFont(15);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('花', cx, sealY + sealH * 0.34);
    ctx.fillText('鸟', cx, sealY + sealH * 0.68);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.ink || '#3A403C';
    ctx.font = makeFont(32);
    ctx.fillText(theme.title || '花鸟织绣', cx, titleY);

    ctx.font = F.subtitle;
    ctx.fillStyle = C.inkSoft || '#6A726C';
    ctx.fillText(theme.subtitle || '淡彩三叠', cx, subtitleY);

    ctx.font = F.meta;
    ctx.fillStyle = C.inkFaint || '#8A918A';
    ctx.fillText(theme.tagline || '三同则消 · 江南淡彩', cx, taglineY);

    const float = Math.sin(t * 1.1) * 1.5;
    demoIds.forEach((id, i) => {
      const size = demoTileSize;
      const x = Math.round(demoX + i * (size + demoGap));
      const y = Math.round(demoY + float * (i % 2 === 0 ? 1 : -0.5));
      drawTileShadow(ctx, { x, y, w: size, h: size, blocked: false, layer: i, soft: true });
      drawFlowerTile(ctx, id, x, y, size, size, false);
    });

    ctx.strokeStyle = 'rgba(127,158,150,0.22)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - 52, ruleY);
    ctx.lineTo(cx - 8, ruleY);
    ctx.moveTo(cx + 8, ruleY);
    ctx.lineTo(cx + 52, ruleY);
    ctx.stroke();

    const { x: bx, y: by, w: bw, h: bh } = homeBtn;
    drawWatercolorPanel(ctx, bx, by, bw, bh, 14, {
      washPink: true,
      fillTop: 'rgba(255,252,248,0.82)',
      fillBot: 'rgba(252,228,220,0.65)',
      edgeTop: 'rgba(232,168,168,0.28)',
      stroke: 'rgba(196,136,136,0.32)',
    });

    ctx.fillStyle = C.ink || '#3A403C';
    ctx.font = F.btn;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(theme.homeCta || '入画', cx, by + bh / 2);

    ctx.font = F.tip;
    ctx.fillStyle = C.inkFaint || '#8A918A';
    ctx.fillText('轻点任意处开始', cx, hintY);
  }

  /** 顶栏：两行题跋 + 右侧提示，避让胶囊 */
  function drawAirHeader(ctx, game, L) {
    const C = palette();
    const F = FONT();
    const {
      headerX: x,
      headerY: y,
      headerW: w,
      headerH,
      headerSealW,
      headerSealH,
      headerSealX,
      headerSealY,
      headerTitleY,
      headerMetaY,
      headerMsgY,
      headerMsgMaxW,
    } = L;

    const sx = headerSealX != null ? headerSealX : x + 2;
    const sy = headerSealY != null ? headerSealY : y + 6;
    const sw = headerSealW || 18;
    const sh = headerSealH || 24;
    roundRect(ctx, sx, sy, sw, sh, 3);
    const sealG = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    sealG.addColorStop(0, 'rgba(212,136,136,0.82)');
    sealG.addColorStop(1, 'rgba(184,122,124,0.72)');
    ctx.fillStyle = sealG;
    ctx.fill();
    ctx.fillStyle = '#FDFBF7';
    ctx.font = makeFont(13);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('花', sx + sw / 2, sy + sh * 0.34);
    ctx.fillText('鸟', sx + sw / 2, sy + sh * 0.72);

    const tx = sx + sw + 8;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.ink || '#3A403C';
    const titleSize = 22;
    const titleMaxW = w - (tx - x) - (game.message ? headerMsgMaxW + 12 : 8) - (L.headerRightPad || 0);
    let title = game.levelName || '';
    while (title.length > 4 && measureLiteratiLine(ctx, title, titleSize) > titleMaxW) {
      title = title.slice(0, -1);
    }
    fillLiteratiLine(ctx, title, tx, headerTitleY, titleSize, false);

    ctx.font = F.gameMeta;
    ctx.fillStyle = C.inkFaint || '#8A918A';
    const sub = (CONFIG.theme && CONFIG.theme.subtitle) || '淡彩三叠';
    ctx.fillText(sub + '  ·  余芳 ' + game.remainingCount(), tx, headerMetaY);

    ctx.save();
    ctx.strokeStyle = 'rgba(232,168,168,0.22)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(tx, headerMetaY + 10);
    ctx.lineTo(tx + Math.min(140, w * 0.48), headerMetaY + 10);
    ctx.stroke();
    ctx.restore();

    if (game.message) {
      ctx.textAlign = 'right';
      ctx.fillStyle = C.rouge || '#B87A7C';
      ctx.font = F.tip;
      let msg = game.message;
      while (msg.length > 2 && ctx.measureText(msg).width > headerMsgMaxW) {
        msg = msg.slice(0, -1);
      }
      ctx.fillText(msg, x + w - 4 - (L.headerRightPad || 0), headerMsgY);
    }
  }

  /** 棋区裁纸：湿边水彩纸 */
  function drawPaperBoard(ctx, game, L) {
    const C = palette();
    const f = game.boardFrame;
    if (!f) return;
    const { x, y, w, h } = f;
    const pad = 4;

    ctx.save();
    ctx.globalAlpha = 0.35;
    drawWashBlob(ctx, x + w / 2, y + h / 2 + 6, w * 0.55, h * 0.12, 'rgba(58,52,48,0.08)', 'rgba(58,52,48,0)', 1);
    ctx.restore();

    drawWatercolorPanel(ctx, x, y, w, h, 16, {
      washPink: true,
      washGreen: true,
      fillTop: 'rgba(255,252,248,0.82)',
      fillBot: 'rgba(255,244,236,0.68)',
      edgeTop: 'rgba(232,168,168,0.16)',
      edgeMid: 'rgba(255,252,248,0.06)',
      edgeBot: 'rgba(143,174,158,0.14)',
      stroke: C.boardEdge,
      bleed: pad,
    });

    ctx.save();
    roundRect(ctx, x, y, w, h, 16);
    ctx.clip();
    drawWashBlob(ctx, x + w * 0.25, y + h * 0.18, w * 0.45, h * 0.35, 'rgba(232,168,168,0.06)', 'rgba(232,168,168,0)', 1);
    drawWashBlob(ctx, x + w * 0.75, y + h * 0.7, w * 0.32, h * 0.28, 'rgba(143,174,158,0.05)', 'rgba(143,174,158,0)', 1);
    ctx.restore();
  }

  function drawTileShadow(ctx, tile) {
    const { x, y, w, h, blocked, layer, soft } = tile;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rad = (Math.min(w, h) / 2) * 0.94;

    ctx.save();
    if (blocked) {
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = 'rgba(58,52,48,0.4)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + rad * 0.1, rad * 0.68, rad * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (soft) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = 'rgba(48,42,36,0.22)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + rad * 0.22, rad * 0.62, rad * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const lift = 0.15 + (layer || 0) * 0.04;
      ctx.shadowColor = `rgba(48,42,36,${0.22 + (layer || 0) * 0.03})`;
      ctx.shadowBlur = 7 + (layer || 0) * 1.8;
      ctx.shadowOffsetX = 0.5;
      ctx.shadowOffsetY = 3.5 + (layer || 0) * 0.75;
      ctx.fillStyle = 'rgba(0,0,0,0.02)';
      ctx.beginPath();
      ctx.arc(cx, cy - lift, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTile(ctx, tile, t, game) {
    const { x, y, w, h, blocked, icon, id } = tile;
    let dx = 0;
    if (game.fx.shakes[id] && game.now < game.fx.shakes[id]) {
      dx = Math.sin(game.now / 25) * 2.2;
    }
    const tx = x + dx;
    drawTileShadow(ctx, { ...tile, x: tx });

    ctx.save();
    if (!blocked) {
      const pulse = 1 + Math.sin(t * 1.2 + id) * 0.004;
      ctx.translate(tx + w / 2, y + h / 2);
      ctx.scale(pulse, pulse);
      ctx.translate(-(tx + w / 2), -(y + h / 2));
    }
    drawFlowerTile(ctx, icon, tx, y, w, h, blocked);

    if (blocked) {
      const cx = tx + w / 2;
      const cy = y + h / 2;
      const rad = (Math.min(w, h) / 2) * 0.94;
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = 'rgba(88,82,76,0.18)';
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      const cx = tx + w / 2;
      const cy = y + h / 2;
      const rad = (Math.min(w, h) / 2) * 0.97;
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = Math.max(1, w * 0.022);
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** 绣台：标签与槽位分区 */
  function drawSoftDock(ctx, game, L) {
    const C = palette();
    const F = FONT();
    const {
      dockX,
      dockY,
      dockW,
      dockH,
      slotX,
      slotY,
      slotTw,
      slotTh,
      capacity,
      slotGap,
      slotRowW,
      dockLabelH,
    } = L;
    const tw = slotTw || L.tw;
    const th = slotTh || L.th;
    const innerX = L.dockInnerX != null ? L.dockInnerX : dockX + 10;
    const innerW = L.dockInnerW != null ? L.dockInnerW : dockW - 20;

    drawWatercolorPanel(ctx, dockX, dockY, dockW, dockH, 16, {
      washPink: true,
      fillTop: 'rgba(255,252,248,0.84)',
      fillBot: 'rgba(252,240,234,0.68)',
      edgeTop: 'rgba(232,168,168,0.16)',
      edgeBot: 'rgba(143,174,158,0.12)',
      bleed: 0,
    });

    ctx.fillStyle = C.inkSoft || '#6A726C';
    ctx.font = F.dockLabel;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('绣台 · 三同则消', dockX + dockW / 2, dockY + dockLabelH / 2);

    ctx.save();
    roundRect(ctx, innerX, slotY - 2, innerW, th + 4, 10);
    ctx.clip();

    for (let i = 0; i < capacity; i++) {
      const sx = Math.round(slotX + i * (tw + slotGap));
      const item = game.slotBar.slots[i];
      if (item && !game.isSlotHiddenByFly(i)) {
        if (item.matching) {
          const pulse = 0.5 + Math.sin(game.now / 70) * 0.5;
          ctx.save();
          ctx.globalAlpha = 0.14 + pulse * 0.18;
          ctx.fillStyle = 'rgba(143,174,158,0.35)';
          ctx.beginPath();
          ctx.arc(sx + tw / 2, slotY + th / 2, Math.min(tw, th) / 2 * 0.96, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        drawFlowerTile(ctx, item.icon, sx, slotY, tw, th, false);
      } else {
        drawEmptyJadeSlot(ctx, sx, slotY, tw, th);
      }
    }
    ctx.restore();

    if (game.matchFlash > 0) {
      ctx.save();
      roundRect(ctx, innerX, slotY - 2, innerW, th + 4, 10);
      ctx.clip();
      ctx.globalAlpha = game.matchFlash * 0.28;
      const glow = ctx.createRadialGradient(
        slotX + slotRowW / 2,
        slotY + th / 2,
        4,
        slotX + slotRowW / 2,
        slotY + th / 2,
        slotRowW * 0.42
      );
      glow.addColorStop(0, 'rgba(143,174,158,0.3)');
      glow.addColorStop(1, 'rgba(143,174,158,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(innerX, slotY - 4, innerW, th + 8);
      ctx.restore();
    }
  }

  function drawFlies(ctx, game) {
    game.fx.flies.forEach((f) => {
      const s = game.flyState(f);
      ctx.save();
      ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
      ctx.scale(s.scale, s.scale);
      drawFlowerTile(ctx, s.icon, -s.w / 2, -s.h / 2, s.w, s.h, false);
      ctx.restore();
    });
  }

  function drawImpacts(ctx, game) {
    game.fx.impacts.forEach((im) => {
      const s = game.impactState(im);
      if (s.alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.translate(im.x + im.w / 2, im.y + im.h / 2);
      ctx.scale(s.sx, s.sy);
      drawFlowerTile(ctx, im.icon, -im.w / 2, -im.h / 2, im.w, im.h, false);
      ctx.restore();
    });
  }

  function drawBursts(ctx, game) {
    game.fx.bursts.forEach((b) => {
      const p = Math.min(1, (game.now - b.t0) / b.dur);
      const alpha = 1 - Math.pow(p, b.strong ? 1.9 : 1.35);
      const radius = b.strong ? 6 + p * 44 : 8 + p * 28;
      ctx.save();
      ctx.translate(b.x, b.y);

      if (b.ringOnly) {
        ctx.globalAlpha = alpha * 0.92;
        ctx.strokeStyle = 'rgba(255,252,248,0.9)';
        ctx.lineWidth = 2.6 * (1 - p * 0.85);
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return;
      }

      if (p < 0.28) {
        ctx.globalAlpha = (1 - p / 0.28) * 0.88;
        ctx.fillStyle = 'rgba(255,252,248,0.92)';
        ctx.beginPath();
        ctx.arc(0, 0, 7 + p * 16, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = alpha * (b.strong ? 0.82 : 0.62);
      const ink = ctx.createRadialGradient(0, 0, 1, 0, 0, radius);
      ink.addColorStop(0, 'rgba(255,252,248,0.9)');
      ink.addColorStop(0.4, 'rgba(143,174,158,0.38)');
      ink.addColorStop(1, 'rgba(143,174,158,0)');
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      const petals = b.strong ? 8 : 5;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2 + p * 0.9;
        const dist = 5 + p * (b.strong ? 34 : 22);
        ctx.globalAlpha = alpha * 0.52;
        ctx.fillStyle = i % 2 ? 'rgba(196,144,144,0.55)' : 'rgba(143,174,158,0.45)';
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * dist, Math.sin(a) * dist, 3.2 * (1 - p * 0.5), 1.8, a, 0, Math.PI * 2);
        ctx.fill();
      }

      if (b.icon && p < 0.32) {
        ctx.globalAlpha = (1 - p / 0.32) * 0.85;
        const size = 24 * (1 + p * 0.1);
        drawFlowerTile(ctx, b.icon, -size / 2, -size / 2, size, size, false);
      }
      ctx.restore();
    });
  }

  function drawHold(ctx, game) {
    const C = palette();
    const F = FONT();
    if (!game.hold.length) return;
    const area = game.holdArea();
    ctx.fillStyle = C.inkFaint || '#8A918A';
    ctx.font = F.tip;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('移花暂寄', area.x, area.y - 6);
    game.hold.forEach((item, i) => {
      drawFlowerTile(ctx, item.icon, area.x + i * (area.tw + 5), area.y, area.tw, area.th, false);
    });
  }

  /** 青玉键：跟棋子同款温润质感，不搞多层彩虹渐变 */
  function drawJadeButton(ctx, btn, opts) {
    const { x, y, w, h } = btn;
    const pressed = opts.pressed > 0.05;
    const disabled = !!opts.disabled;
    const r = Math.min(11, h / 2 - 2);
    const bx = Math.round(x);
    const by = Math.round(y + (pressed ? 1.5 : 0));
    const cx = bx + w / 2;
    const cy = by + h / 2;

    if (!pressed) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      roundRect(ctx, bx + 0.5, by + 2.5, w, h, r);
      ctx.fillStyle = 'rgba(72,96,88,0.4)';
      ctx.fill();
      ctx.restore();
    }

    roundRect(ctx, bx, by, w, h, r);

    const body = ctx.createRadialGradient(
      cx - w * 0.2,
      cy - h * 0.24,
      1,
      cx,
      cy + h * 0.06,
      Math.max(w, h) * 0.72
    );
    if (disabled) {
      body.addColorStop(0, '#F0F4F0');
      body.addColorStop(0.55, '#DDE6DE');
      body.addColorStop(1, '#C4D0C6');
    } else if (pressed) {
      body.addColorStop(0, '#C8D8CE');
      body.addColorStop(0.5, '#A8BFB2');
      body.addColorStop(1, '#8AA898');
    } else {
      body.addColorStop(0, '#F6FAF7');
      body.addColorStop(0.48, '#E4EEE8');
      body.addColorStop(1, '#C8D8CE');
    }
    ctx.fillStyle = body;
    ctx.fill();

    ctx.save();
    roundRect(ctx, bx, by, w, h, r);
    ctx.clip();
    if (!disabled && !pressed) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(bx, by, w, h * 0.38);
    }
    if (pressed && !disabled) {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.1, cy - h * 0.06, w * 0.07, h * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    roundRect(ctx, bx, by, w, h, r);
    ctx.strokeStyle = disabled
      ? 'rgba(143,174,158,0.28)'
      : pressed
        ? 'rgba(94,136,120,0.5)'
        : 'rgba(143,174,158,0.36)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  /** 底栏：青玉 3D 键 */
  function drawSoftButtons(ctx, game) {
    const F = FONT();
    game.buttons.forEach((btn) => {
      const primary = !btn.secondary;
      let title = '重开';
      let count = 0;
      if (btn.key === 'undo') {
        title = '悔步';
        count = game.props.undo;
      } else if (btn.key === 'remove') {
        title = '移花';
        count = game.props.remove;
      } else if (btn.key === 'shuffle') {
        title = '洗牌';
        count = game.props.shuffle;
      }

      const disabled = primary && count <= 0 && btn.key !== 'restart';
      const pressAmt = game.buttonPressAmount ? game.buttonPressAmount(btn.key) : 0;

      drawJadeButton(ctx, btn, {
        pressed: pressAmt,
        disabled: disabled && btn.key !== 'restart',
      });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const ty = btn.y + btn.h / 2 + (pressAmt > 0.05 ? 2 : 0);
      ctx.fillStyle = disabled ? textColor('muted') : textColor('primary');
      ctx.font = F.btn;
      if (primary && btn.key !== 'restart') {
        fillBoldText(ctx, title, btn.x + btn.w / 2 - 6, ty);
        ctx.fillStyle = disabled ? textColor('muted') : '#4A7264';
        ctx.font = makeFont(14);
        fillBoldText(ctx, String(count), btn.x + btn.w / 2 + 17, ty);
      } else {
        fillBoldText(ctx, title, btn.x + btn.w / 2, ty);
      }
    });
  }

  function drawOverlay(ctx, game, L) {
    const C = palette();
    const F = FONT();
    if (game.status === 'playing') return;
    const { w, h } = L;
    ctx.fillStyle = 'rgba(58,52,72,0.18)';
    ctx.fillRect(0, 0, w, h);

    const boxW = Math.min(268, w - 52);
    const boxH = 138;
    const x = (w - boxW) / 2;
    const y = (h - boxH) / 2;

    drawWatercolorPanel(ctx, x, y, boxW, boxH, 16, {
      washPink: true,
      washGreen: true,
      fillTop: 'rgba(255,252,248,0.94)',
      fillBot: 'rgba(255,242,234,0.88)',
      edgeTop: 'rgba(232,168,168,0.22)',
      edgeBot: 'rgba(143,174,158,0.16)',
      bleed: 4,
    });

    const win = game.status === 'win';
    ctx.fillStyle = win ? C.celadon || '#8FAE9E' : C.rouge || '#C49090';
    ctx.font = makeFont(20);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(win ? '一局清欢' : '再理一局', w / 2, y + 46);

    ctx.fillStyle = C.inkSoft || '#6A726C';
    ctx.font = F.body;
    ctx.fillText(game.message || (win ? '轻点续下一折' : '轻点重开此局'), w / 2, y + 86);
  }

  function render(ctx, game) {
    const now = Date.now();
    game.tick(now);
    const t = now / 1000;
    const L = game.layout ? game.layout() : getLayout(game.width, game.height);

    drawLiteratiGround(ctx, L, t, game.status === 'home');

    if (game.status === 'home') {
      drawHomeScreen(ctx, game, t);
      return;
    }

    drawPaperBoard(ctx, game, L);
    drawAirHeader(ctx, game, L);

    const f = game.boardFrame;
    if (f) {
      ctx.save();
      roundRect(ctx, f.x, f.y, f.w, f.h, 16);
      ctx.clip();
    }

    game.tiles
      .filter((tile) => !tile.removed)
      .slice()
      .sort((a, b) => a.layer - b.layer || a.y - b.y || a.x - b.x)
      .forEach((tile) => drawTile(ctx, tile, t, game));

    if (f) ctx.restore();

    drawSoftDock(ctx, game, L);
    drawHold(ctx, game);
    drawFlies(ctx, game);
    drawImpacts(ctx, game);
    drawBursts(ctx, game);
    drawSoftButtons(ctx, game);
    drawOverlay(ctx, game, L);
  }

  return { render };
});
