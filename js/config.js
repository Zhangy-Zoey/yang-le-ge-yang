/**
 * 花鸟织绣 - 配置 + 竖屏布局节奏
 *
 * 自上而下：顶栏 → 棋盘 → 绣台 → 道具栏 → 安全底
 * 间距统一，避免模块「各算各的」导致不协调
 */
(function (root, factory) {
  const exp = factory(root.FLOWER_IDS);
  if (typeof module === 'object' && module.exports) {
    const { FLOWER_IDS } = require('./flowers');
    module.exports = factory(FLOWER_IDS);
  } else Object.assign(root, exp);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (FLOWER_IDS) {
  const TILE_ICONS = FLOWER_IDS || [];

  const CONFIG = {
    slotCapacity: 7,
    matchCount: 3,
    // 近圆玉牌
    tileW: 64,
    tileH: 64,
    boardTop: 76,
    theme: {
      title: '花鸟织绣',
      subtitle: '淡彩三叠',
      tagline: '三同则消 · 江南淡彩',
      homeCta: '入画',
    },
    // 清雅水彩 token（render 共用）
    palette: {
      paper: '#FAF6F0',
      paperDeep: '#EDE4D8',
      paperWarm: '#FFF4E8',
      bg: '#F5F0E8',
      frost: 'rgba(255,252,246,0.96)',
      frostEdge: 'rgba(176,112,112,0.28)',
      boardFill: 'rgba(255,250,244,0.9)',
      boardEdge: 'rgba(152,96,96,0.38)',
      boardWash: 'rgba(216,144,144,0.12)',
      silk: 'rgba(255,248,240,0.96)',
      ink: '#504840',
      inkSoft: '#6A6258',
      inkFaint: '#8A8278',
      celadon: '#5E8878',
      celadonSoft: 'rgba(94,136,120,0.22)',
      ochre: '#C8A858',
      rouge: '#B06868',
      blossom: '#E09090',
      blossomDeep: '#C87070',
      sunlight: 'rgba(255,200,140,0.28)',
      sunlightCore: 'rgba(255,228,180,0.42)',
      eaveInk: 'rgba(48,42,62,0.2)',
      sageWash: 'rgba(94,136,120,0.16)',
      vine: '#A8B868',
      mist: 'rgba(216,144,144,0.1)',
    },
    ui: {
      side: 10,
      safeTop: 20,
      safeRight: 0,
      headerTopGap: 14,
      headerH: 68,
      gapHeaderBoard: 12,
      gapBoardDock: 14,
      dockLabelH: 30,
      dockPadX: 6,
      dockSlotGap: 3,
      dockPadY: 8,
      dockSlotBase: 58,
      dockSlotMin: 44,
      dockSlotMargin: 4,
      gapDockBtn: 10,
      btnH: 50,
      btnGap: 10,
      btnLift: 12,
      safeBottom: 12,
      boardPad: 4,
      boardFramePad: 8,
      boardBottomReserve: 4,
      boardFillRatio: 0.98,
      boardFillWidthBias: false,
      layerSpreadY: 1.08,
      tileBiasY: 0.5,
      tileScatter: 0.09,
      layerDrift: 0.2,
      homeDemoGap: 18,
      homeSectionGap: 40,
    },
    levels: [
      {
        name: '第壹关 · 疏影清浅',
        typeCount: 6,
        triplesPerType: 3,
        boardFillRatio: 0.96,
        layerSpreadY: 1.06,
        tileScatter: 0.07,
        layerDrift: 0.16,
        layers: [
          { rows: 3, cols: 4, offsetX: 0, offsetY: 0 },
          { rows: 2, cols: 3, offsetX: 0.55, offsetY: 0.78 },
        ],
      },
      {
        name: '第贰关 · 秾华葳蕤',
        typeCount: 8,
        triplesPerType: 4,
        boardFillRatio: 0.94,
        layerSpreadY: 1.12,
        tileScatter: 0.09,
        layerDrift: 0.18,
        layers: [
          { rows: 4, cols: 5, offsetX: 0, offsetY: 0 },
          { rows: 3, cols: 4, offsetX: 0.5, offsetY: 0.5 },
          { rows: 3, cols: 3, offsetX: 1, offsetY: 1 },
          { rows: 2, cols: 3, offsetX: 0.5, offsetY: 1.5 },
          { rows: 2, cols: 2, offsetX: 1.5, offsetY: 2 },
        ],
      },
      {
        name: '第叁关 · 天心月圆',
        typeCount: 10,
        triplesPerType: 5,
        boardFillRatio: 0.92,
        layerSpreadY: 1.1,
        tileScatter: 0.1,
        layerDrift: 0.2,
        layers: [
          { rows: 4, cols: 6, offsetX: 0, offsetY: 0 },
          { rows: 4, cols: 5, offsetX: 0.32, offsetY: 0.38 },
          { rows: 3, cols: 4, offsetX: 0.08, offsetY: 0.82 },
          { rows: 2, cols: 3, offsetX: 0.58, offsetY: 1.22 },
          { rows: 2, cols: 2, offsetX: 0.88, offsetY: 1.58 },
        ],
      },
    ],
  };

  /**
   * 首页构图：顶留白 → 居中题跋 → 示例棋子 → 入画按钮
   */
  function getHomeLayout(w, h) {
    const u = CONFIG.ui;
    const cx = w / 2;
    const padX = Math.max(u.side, 16);

    const sealW = 44;
    const sealH = 50;
    const sealX = cx - sealW / 2;

    const tileSize = Math.min(80, Math.floor((w - padX * 2 - 32) / 3.2));
    const demoIds = ['plum', 'orchid', 'lotus'];
    const demoGap = u.homeDemoGap || 18;
    const sectionGap = u.homeSectionGap || 40;
    const demoRowW = demoIds.length * tileSize + (demoIds.length - 1) * demoGap;

    const btnW = Math.min(240, w - padX * 2 - 28);
    const btnH = 48;

    const stackH =
      sealH +
      28 +
      34 +
      20 +
      sectionGap +
      tileSize +
      36 +
      24 +
      btnH +
      28;

    const topInset = u.safeTop + 12;
    const bottomInset = (u.safeBottom || 12) + 20;
    const avail = Math.max(320, h - topInset - bottomInset);
    const sealY = topInset + Math.max(0, (avail - stackH) / 2);

    const titleY = sealY + sealH + 28;
    const subtitleY = titleY + 34;
    const taglineY = subtitleY + 20;
    const demoY = taglineY + sectionGap;
    const demoX = cx - demoRowW / 2;
    const btnX = cx - btnW / 2;
    const ruleY = demoY + tileSize + 36;
    const btnY = ruleY + 24;
    const hintY = Math.min(btnY + btnH + 28, h - bottomInset);

    return {
      w,
      h,
      cx,
      sealX,
      sealY,
      sealW,
      sealH,
      titleY,
      subtitleY,
      taglineY,
      ruleY,
      demoIds,
      demoX,
      demoY,
      demoTileSize: tileSize,
      demoGap,
      hintY,
      homeBtn: { x: btnX, y: btnY, w: btnW, h: btnH },
    };
  }

  /**
   * 布局：底栏锚定，棋区填满中间留白
   */
  function getLayout(w, h) {
    const u = CONFIG.ui;
    const capacity = CONFIG.slotCapacity;
    const contentX = u.side;
    const contentW = w - u.side * 2;
    const headerRightPad = u.safeRight || 0;

    const btnH = u.btnH;
    const btnGap = u.btnGap;
    const btnLift = u.btnLift != null ? u.btnLift : 0;
    const btnBarY = Math.round(h - u.safeBottom - btnH - btnLift);
    const btnBarW = contentW;
    const btnBarX = contentX;
    const btnW = Math.floor((btnBarW - btnGap * 3) / 4);
    const btnLastW = btnBarW - btnGap * 3 - btnW * 3;
    const buttons = [
      { key: 'undo', x: btnBarX, y: btnBarY, w: btnW, h: btnH },
      { key: 'remove', x: btnBarX + (btnW + btnGap), y: btnBarY, w: btnW, h: btnH },
      { key: 'shuffle', x: btnBarX + (btnW + btnGap) * 2, y: btnBarY, w: btnW, h: btnH },
      { key: 'restart', x: btnBarX + (btnW + btnGap) * 3, y: btnBarY, w: btnLastW, h: btnH, secondary: true },
    ];

    const dockPadX = u.dockPadX != null ? u.dockPadX : 6;
    const slotMargin = u.dockSlotMargin != null ? u.dockSlotMargin : 4;
    const maxDockInner = contentW - dockPadX * 2 - slotMargin * 2;
    const slotGap = u.dockSlotGap != null ? u.dockSlotGap : 3;
    const slotMin = u.dockSlotMin != null ? u.dockSlotMin : 44;
    const slotMax = u.dockSlotBase != null ? u.dockSlotBase : 58;
    let slotTw = Math.floor((maxDockInner - slotGap * (capacity - 1)) / capacity);
    slotTw = Math.min(slotMax, Math.max(slotMin, slotTw));
    const slotRowW = capacity * slotTw + (capacity - 1) * slotGap;
    const slotTh = slotTw;

    const dockLabelH = u.dockLabelH != null ? u.dockLabelH : 28;
    const dockH = dockLabelH + slotTh + u.dockPadY * 2;
    const dockW = contentW;
    const dockX = contentX;
    const dockY = Math.round(btnBarY - u.gapDockBtn - dockH);
    const slotY = Math.round(dockY + dockLabelH + u.dockPadY);
    const slotX = Math.round(contentX + dockPadX + slotMargin + (maxDockInner - slotRowW) / 2);

    const headerTopGap = u.headerTopGap != null ? u.headerTopGap : 14;
    const headerX = contentX;
    const headerY = Math.round(u.safeTop + headerTopGap);
    const headerW = contentW;
    const headerH = u.headerH;
    const headerSealW = 18;
    const headerSealH = 24;
    const headerSealX = headerX + 2;
    const headerSealY = headerY + (headerH - headerSealH) / 2;
    const headerTitleY = headerY + 32;
    const headerMetaY = headerY + 56;
    const headerMsgY = headerY + 32;
    const headerMsgMaxW = Math.min(112, (headerW - headerRightPad) * 0.34);
    const boardTop = headerY + headerH + u.gapHeaderBoard;
    const boardBottom = dockY - u.gapBoardDock;
    const boardX = contentX;
    const boardW = contentW;
    const boardH = Math.max(200, boardBottom - boardTop);
    const boardY = boardTop;

    const boardPad = u.boardPad != null ? u.boardPad : 4;
    const estBoardH =
      h -
      (u.safeTop + headerTopGap) -
      u.headerH -
      u.gapHeaderBoard -
      dockH -
      u.gapDockBtn -
      btnH -
      btnLift -
      u.safeBottom -
      u.gapBoardDock;
    const availBoardW = contentW - boardPad * 2;
    const availBoardH = Math.max(220, estBoardH);
    const twFromW = Math.floor(availBoardW / 4.15);
    const twFromH = Math.floor(availBoardH / 3.6);
    const tw = Math.min(82, Math.max(60, Math.min(twFromW, twFromH)));
    const th = tw;

    const holdTw = Math.round(slotTw * 0.88);
    const holdTh = holdTw;
    const holdX = dockX + 8;
    const holdY = slotY - holdTh - 10;

    return {
      w,
      h,
      tw,
      th,
      capacity,
      slotGap,
      slotTw,
      slotTh,
      slotX,
      slotY,
      slotRowW,
      headerX,
      headerY,
      headerW,
      headerH,
      headerSealW,
      headerSealH,
      headerSealX,
      headerSealY,
      headerTitleY,
      headerMetaY,
      headerMsgY,
      headerMsgMaxW,
      headerRightPad,
      contentX,
      boardX,
      boardY,
      boardW,
      boardH,
      boardPad: u.boardPad,
      boardBottomReserve: u.boardBottomReserve || 10,
      boardTop,
      dockX,
      dockY,
      dockW,
      dockH,
      dockPadX,
      dockLabelH,
      dockInnerX: contentX + dockPadX + slotMargin,
      dockInnerW: maxDockInner,
      btnBarX,
      btnBarY,
      btnBarW,
      buttons,
      holdX,
      holdY,
      holdTw,
      holdTh,
    };
  }

  return { CONFIG, TILE_ICONS, FLOWER_IDS: TILE_ICONS, getLayout, getHomeLayout };
});
