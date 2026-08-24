/**
 * 花鸟织绣 UI · 江南文人画（清冷）
 *
 * 定调：清透 · 留白 · 低饱和 · 背景虚 / 棋子实
 * 禁忌：漆木厚框、大红大金、金属高光、仙侠炸裂
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const { CONFIG, getLayout } = require('./config');
    const flowers = require('./flowers');
    module.exports = factory(CONFIG, getLayout, flowers);
  } else {
    Object.assign(root, factory(root.CONFIG, root.getLayout, root));
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (CONFIG, getLayout, flowersApi) {
  const { drawFlowerTile, drawFlowerIcon, drawEmptyJadeSlot } = flowersApi;

  function palette() {
    return CONFIG.palette || {};
  }

  const FACE = '"SJshoujin", "宋徽宗瘦金体", "Songti SC", "STSong", serif';
  const FONT = {
    title: '500 17px ' + FACE,
    meta: '11px ' + FACE,
    tip: '10px ' + FACE,
    btn: '500 13px ' + FACE,
    body: '13px ' + FACE,
  };

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

  /** 半透明磨砂面板（轻量、无厚框） */
  function fillFrost(ctx, x, y, w, h, r) {
    const C = palette();
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = C.frost || 'rgba(255,252,248,0.58)';
    ctx.fill();
    ctx.strokeStyle = C.frostEdge || 'rgba(127,158,150,0.22)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  /** 虚化背景：冷宣纸 + 墨竹 / 远山（背景必须虚） */
  function drawLiteratiGround(ctx, L, t) {
    const C = palette();
    const { w, h } = L;

    ctx.fillStyle = C.paper || '#F3F5F2';
    ctx.fillRect(0, 0, w, h);

    const wash = ctx.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, '#F7F9F6');
    wash.addColorStop(0.45, '#EEF2EF');
    wash.addColorStop(1, C.paperDeep || '#E4EAE5');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);

    // 顶部汝窑天青晕（清冷）
    const topWash = ctx.createRadialGradient(w * 0.72, 0, 0, w * 0.72, h * 0.04, w * 0.55);
    topWash.addColorStop(0, 'rgba(127,158,150,0.14)');
    topWash.addColorStop(1, 'rgba(127,158,150,0)');
    ctx.fillStyle = topWash;
    ctx.fillRect(0, 0, w, h * 0.32);

    // 左侧极淡藕粉（点缀，不抢焦点）
    const blush = ctx.createRadialGradient(0, h * 0.08, 0, 0, h * 0.08, w * 0.35);
    blush.addColorStop(0, 'rgba(184,122,124,0.07)');
    blush.addColorStop(1, 'rgba(184,122,124,0)');
    ctx.fillStyle = blush;
    ctx.fillRect(0, 0, w * 0.45, h * 0.28);

    // 墨竹（虚、远）
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#4A5A4E';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    [
      [0.8, 0.18, 0.84, 0.52],
      [0.9, 0.14, 0.92, 0.48],
    ].forEach(([x0, y0, x1, y1]) => {
      ctx.beginPath();
      ctx.moveTo(w * x0, h * y0);
      ctx.lineTo(w * x1, h * y1);
      ctx.stroke();
    });
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 12; i++) {
      const bx = w * (0.76 + (i % 4) * 0.04);
      const by = h * (0.2 + Math.floor(i / 4) * 0.07);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + 16, by - 5, bx + 24, by + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx - 14, by + 3, bx - 20, by + 9);
      ctx.stroke();
    }
    ctx.restore();

    // 折枝（淡墨，少花）
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#6A7068';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.14);
    ctx.quadraticCurveTo(w * 0.1, h * 0.05, w * 0.2, h * 0.15);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const px = w * (0.05 + i * 0.03);
      const py = h * (0.09 + (i % 2) * 0.02);
      ctx.fillStyle = 'rgba(184,122,124,0.45)';
      ctx.beginPath();
      ctx.ellipse(px, py, 4, 2.5, i * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 远山淡影
    ctx.fillStyle = C.mist || 'rgba(140,160,155,0.09)';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.8);
    ctx.quadraticCurveTo(w * 0.3, h * 0.72, w * 0.52, h * 0.78);
    ctx.quadraticCurveTo(w * 0.78, h * 0.84, w, h * 0.76);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // 中部留白罩：棋子区更「实」
    const veil = ctx.createLinearGradient(0, L.headerY + L.headerH, 0, L.dockY);
    veil.addColorStop(0, 'rgba(243,245,242,0.2)');
    veil.addColorStop(0.35, 'rgba(243,245,242,0.62)');
    veil.addColorStop(1, 'rgba(243,245,242,0.4)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, L.headerY + L.headerH, w, L.dockY - L.headerY - L.headerH);

    // 极淡漂瓣（慢、稀）
    for (let i = 0; i < 3; i++) {
      const ph = t * 0.01 + i * 1.7;
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = i % 2 ? '#B87A7C' : '#7F9E96';
      ctx.translate(((0.35 + Math.sin(ph) * 0.2) % 1) * w, ((0.1 + ph * 0.05) % 0.35) * h);
      ctx.rotate(ph);
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** 顶栏：无框轻量 + 小印 */
  function drawAirHeader(ctx, game, L) {
    const C = palette();
    const { headerX: x, headerY: y, headerW: w, headerH: h } = L;

    fillFrost(ctx, x, y, w, h, 18);

    const sx = x + 12;
    const sy = y + (h - 20) / 2;
    roundRect(ctx, sx, sy, 16, 20, 2);
    ctx.fillStyle = 'rgba(184,122,124,0.78)';
    ctx.fill();
    ctx.fillStyle = '#F8FAF7';
    ctx.font = '600 7px ' + FACE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('花', sx + 8, sy + 6);
    ctx.fillText('鸟', sx + 8, sy + 14);

    const tx = sx + 24;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.ink || '#3A403C';
    ctx.font = FONT.title;
    ctx.fillText(game.levelName, tx, y + 18);

    ctx.font = FONT.meta;
    ctx.fillStyle = C.inkFaint || '#8A918A';
    const sub = (CONFIG.theme && CONFIG.theme.subtitle) || '淡彩三叠';
    ctx.fillText(sub + '  ·  余芳 ' + game.remainingCount(), tx, y + 34);

    if (game.message) {
      ctx.textAlign = 'right';
      ctx.fillStyle = C.rouge || '#B87A7C';
      ctx.font = FONT.tip;
      ctx.fillText(game.message, x + w - 12, y + 26);
    }
  }

  /** 棋盘：宣纸裁切 —— 占满可用棋区，不随棋子数量收缩 */
  function drawPaperBoard(ctx, L) {
    const { boardX: x, boardY: y, boardW: w, boardH: h } = L;

    ctx.save();
    ctx.shadowColor = 'rgba(70,90,80,0.05)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 3;
    roundRect(ctx, x, y, w, h, 20);
    ctx.fillStyle = 'rgba(255,252,248,0.48)';
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(127,158,150,0.38)';
    ctx.lineWidth = 0.9;
    roundRect(ctx, x, y, w, h, 20);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(127,158,150,0.16)';
    ctx.lineWidth = 0.55;
    roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 16);
    ctx.stroke();
  }

  function drawTile(ctx, tile, t, game) {
    const { x, y, w, h, blocked, icon, id } = tile;
    let dx = 0;
    if (game.fx.shakes[id] && game.now < game.fx.shakes[id]) {
      dx = Math.sin(game.now / 25) * 2.2;
    }
    ctx.save();
    if (!blocked) {
      const pulse = 1 + Math.sin(t * 1.2 + id) * 0.006;
      ctx.translate(x + w / 2 + dx, y + h / 2);
      ctx.scale(pulse, pulse);
      ctx.translate(-(x + w / 2 + dx), -(y + h / 2));
    }
    drawFlowerTile(ctx, icon, x + dx, y, w, h, blocked);
    ctx.restore();
  }

  /** 绣台：半透明磨砂 */
  function drawSoftDock(ctx, game, L) {
    const C = palette();
    const {
      dockX,
      dockY,
      dockW,
      dockH,
      slotX,
      slotY,
      slotTw,
      slotTh,
      tw,
      th,
      capacity,
      slotGap,
      w,
    } = L;
    const cellW = tw;
    const cellH = th;

    fillFrost(ctx, dockX, dockY, dockW, dockH, 16);

    ctx.fillStyle = C.inkFaint || '#8A918A';
    ctx.font = FONT.tip;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('绣台 · 三同则消', w / 2, dockY + CONFIG.ui.dockPadY + 7);

    for (let i = 0; i < capacity; i++) {
      const sx = slotX + i * (cellW + slotGap);
      const sy = slotY;

      const item = game.slotBar.slots[i];
      if (item && !game.isSlotHiddenByFly(i)) {
        drawFlowerTile(ctx, item.icon, sx, sy, cellW, cellH, false);
      } else {
        drawEmptyJadeSlot(ctx, sx, sy, cellW, cellH);
      }
    }

    if (game.matchFlash > 0) {
      ctx.save();
      ctx.globalAlpha = game.matchFlash * 0.18;
      const glow = ctx.createRadialGradient(w / 2, slotY + cellH / 2, 4, w / 2, slotY + cellH / 2, L.slotRowW * 0.48);
      glow.addColorStop(0, 'rgba(127,158,150,0.45)');
      glow.addColorStop(1, 'rgba(127,158,150,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(dockX, dockY, dockW, dockH);
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

  /** 消除：水彩晕开 + 花瓣飘（非爆炸） */
  function drawBursts(ctx, game) {
    game.fx.bursts.forEach((b) => {
      const p = Math.min(1, (game.now - b.t0) / b.dur);
      const alpha = 1 - p;
      ctx.save();
      ctx.translate(b.x, b.y);

      ctx.globalAlpha = alpha * 0.32;
      const ink = ctx.createRadialGradient(0, 0, 2, 0, 0, 10 + p * 38);
      ink.addColorStop(0, 'rgba(127,158,150,0.45)');
      ink.addColorStop(0.55, 'rgba(184,122,124,0.14)');
      ink.addColorStop(1, 'rgba(184,122,124,0)');
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(0, 0, 10 + p * 38, 0, Math.PI * 2);
      ctx.fill();

      // 涟漪
      ctx.globalAlpha = alpha * 0.25;
      ctx.strokeStyle = 'rgba(127,158,150,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 6 + p * 28, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + p * 0.7;
        const dist = 6 + p * 30;
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = i % 2 ? 'rgba(184,122,124,0.55)' : 'rgba(127,158,150,0.45)';
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(a) * dist,
          Math.sin(a) * dist - p * 10,
          4 * (1 - p * 0.35),
          2.2,
          a,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      if (p < 0.35) {
        ctx.globalAlpha = (1 - p / 0.35) * 0.75;
        const size = 20 * (1 + p * 0.15);
        drawFlowerTile(ctx, b.icon, -size / 2, -size / 2, size, size, false);
      }
      ctx.restore();
    });
  }

  function drawHold(ctx, game) {
    const C = palette();
    if (!game.hold.length) return;
    const area = game.holdArea();
    fillFrost(ctx, area.x - 10, area.y - 18, area.w + 20, area.h + 26, 12);
    ctx.fillStyle = C.inkFaint || '#8A918A';
    ctx.font = FONT.tip;
    ctx.textAlign = 'left';
    ctx.fillText('移花暂寄', area.x, area.y - 5);
    game.hold.forEach((item, i) => {
      const hx = area.x + i * (area.tw + 5);
      drawFlowerTile(ctx, item.icon, hx, area.y, area.tw + 1, area.th + 1, false);
    });
  }

  function drawSoftButtons(ctx, game) {
    const C = palette();
    game.buttons.forEach((btn) => {
      const primary = !btn.secondary;
      fillFrost(ctx, btn.x, btn.y, btn.w, btn.h, 14);
      if (primary) {
        ctx.strokeStyle = 'rgba(127,158,150,0.36)';
        ctx.lineWidth = 0.9;
        roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 14);
        ctx.stroke();
      }

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

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = primary ? C.ink || '#3A403C' : C.inkFaint || '#8A918A';
      ctx.font = FONT.btn;
      if (primary && count >= 0) {
        ctx.fillText(title, btn.x + btn.w / 2 - 6, btn.y + btn.h / 2);
        ctx.fillStyle = C.celadon || '#7F9E96';
        ctx.font = '500 11px ' + FACE;
        ctx.fillText(String(count), btn.x + btn.w / 2 + 16, btn.y + btn.h / 2);
      } else {
        ctx.fillText(title, btn.x + btn.w / 2, btn.y + btn.h / 2);
      }
    });
  }

  function drawOverlay(ctx, game, L) {
    const C = palette();
    if (game.status === 'playing') return;
    const { w, h } = L;
    ctx.fillStyle = 'rgba(70,80,75,0.26)';
    ctx.fillRect(0, 0, w, h);

    const boxW = Math.min(268, w - 48);
    const boxH = 140;
    const x = (w - boxW) / 2;
    const y = (h - boxH) / 2;

    fillFrost(ctx, x, y, boxW, boxH, 18);
    ctx.strokeStyle = 'rgba(127,158,150,0.32)';
    ctx.lineWidth = 0.9;
    roundRect(ctx, x, y, boxW, boxH, 18);
    ctx.stroke();

    const win = game.status === 'win';
    ctx.fillStyle = win ? C.celadon || '#7F9E96' : C.rouge || '#B87A7C';
    ctx.font = '500 22px ' + FACE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(win ? '一局清欢' : '再理一局', w / 2, y + 48);

    ctx.fillStyle = C.inkSoft || '#5E6862';
    ctx.font = FONT.body;
    ctx.fillText(game.message || (win ? '轻点续下一折' : '轻点重开此局'), w / 2, y + 92);
  }

  function render(ctx, game) {
    const now = Date.now();
    game.tick(now);
    const t = now / 1000;
    const L = game.layout ? game.layout() : getLayout(game.width, game.height);

    drawLiteratiGround(ctx, L, t);
    drawPaperBoard(ctx, L);
    drawAirHeader(ctx, game, L);

    game.tiles
      .filter((tile) => !tile.removed)
      .slice()
      .sort((a, b) => a.layer - b.layer || a.y - b.y || a.x - b.x)
      .forEach((tile) => drawTile(ctx, tile, t, game));

    drawSoftDock(ctx, game, L);
    drawHold(ctx, game);
    drawFlies(ctx, game);
    drawBursts(ctx, game);
    drawSoftButtons(ctx, game);
    drawOverlay(ctx, game, L);
  }

  return { render };
});
