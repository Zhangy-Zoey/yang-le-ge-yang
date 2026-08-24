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
    },
    // 清冷文人画 token（render 共用）
    palette: {
      paper: '#F3F5F2',
      paperDeep: '#E4EAE5',
      frost: 'rgba(255,252,248,0.58)',
      frostEdge: 'rgba(127,158,150,0.22)',
      ink: '#3A403C',
      inkSoft: '#5E6862',
      inkFaint: '#8A918A',
      celadon: '#7F9E96',
      celadonSoft: 'rgba(127,158,150,0.18)',
      ochre: '#A89478',
      rouge: '#B87A7C',
      vine: '#B8A86A',
      mist: 'rgba(140,160,155,0.09)',
    },
    ui: {
      side: 20,
      safeTop: 22,
      headerH: 42,
      gapHeaderBoard: 18,
      gapBoardDock: 16,
      dockLabelH: 14,
      dockPadX: 8,
      dockSlotGap: 2,
      dockPadY: 8,
      gapDockBtn: 12,
      btnH: 44,
      propBtnW: 72,
      restartBtnW: 56,
      btnGap: 10,
      safeBottom: 20,
      boardPad: 18,
      tileBiasY: 0.32,
    },
    levels: [
      {
        name: '第壹关 · 庭前初绽',
        typeCount: 6,
        triplesPerType: 3,
        layers: [
          { rows: 3, cols: 4, offsetX: 0, offsetY: 0 },
          { rows: 2, cols: 3, offsetX: 0.5, offsetY: 0.5 },
          { rows: 2, cols: 2, offsetX: 1, offsetY: 1 },
        ],
      },
      {
        name: '第贰关 · 花雨迷津',
        typeCount: 8,
        triplesPerType: 4,
        // 疏叠铺开后加至 6 层：底宽上窄，左右仍常露；牌量 45、开局可点 ~13
        layers: [
          { rows: 4, cols: 5, offsetX: 0, offsetY: 0 },
          { rows: 2, cols: 4, offsetX: 0.5, offsetY: 0.55 },
          { rows: 2, cols: 3, offsetX: 1, offsetY: 1.1 },
          { rows: 2, cols: 2, offsetX: 1.5, offsetY: 1.7 },
          { rows: 2, cols: 2, offsetX: 0.5, offsetY: 2.3 },
          { rows: 2, cols: 2, offsetX: 1, offsetY: 2.9 },
        ],
      },
      {
        name: '第叁关 · 绣阁深叠',
        typeCount: 11,
        triplesPerType: 5,
        // 6 列宽盘 + 5 层深叠：初始可点 ~7 张，牌种多、路径深，难度最高
        layers: [
          { rows: 4, cols: 6, offsetX: 0, offsetY: 0 },
          { rows: 4, cols: 5, offsetX: 0.45, offsetY: 0.45 },
          { rows: 3, cols: 4, offsetX: 0.15, offsetY: 0.95 },
          { rows: 2, cols: 3, offsetX: 0.65, offsetY: 1.45 },
          { rows: 2, cols: 2, offsetX: 1.05, offsetY: 1.95 },
        ],
      },
    ],
  };

  /**
   * 统一布局：game / render 共用，保证点击区与绘制一致
   */
  function getLayout(w, h) {
    const u = CONFIG.ui;
    const capacity = CONFIG.slotCapacity;
    const side = u.side;
    const maxDockInner = Math.max(200, w - side * 2 - u.dockPadX * 2);

    // 绣台与棋盘共用同一棋子尺寸（同形同大）
    let slotGap = u.dockSlotGap != null ? u.dockSlotGap : 2;
    let tw = CONFIG.tileW;
    let th = CONFIG.tileH;
    let slotRowW = capacity * tw + (capacity - 1) * slotGap;

    while (slotRowW > maxDockInner && tw > 44) {
      tw -= 1;
      th = tw;
      slotRowW = capacity * tw + (capacity - 1) * slotGap;
    }
    while (slotRowW > maxDockInner && slotGap > 1) {
      slotGap -= 1;
      slotRowW = capacity * tw + (capacity - 1) * slotGap;
    }

    const slotTw = tw;
    const slotTh = th;

    const btnY = h - u.safeBottom - u.btnH;
    const propTotal = 3 * u.propBtnW + 2 * u.btnGap;
    const rowW = Math.min(w - side * 2, propTotal + 10 + u.restartBtnW);
    const rowX = (w - rowW) / 2;
    const btnPropX = rowX;
    const btnRestartX = rowX + 3 * u.propBtnW + 2 * u.btnGap + 10;

    const dockInnerH = u.dockLabelH + slotTh + u.dockPadY;
    const dockH = dockInnerH + u.dockPadY;
    const dockW = Math.min(w - side * 2, slotRowW + u.dockPadX * 2);
    const dockX = (w - dockW) / 2;
    const dockY = btnY - u.gapDockBtn - dockH;

    const slotY = dockY + u.dockPadY + u.dockLabelH;
    const slotX = dockX + (dockW - slotRowW) / 2;

    const headerX = side;
    const headerY = u.safeTop;
    const headerW = w - side * 2;
    const headerH = u.headerH;

    const boardTop = headerY + headerH + u.gapHeaderBoard;
    const boardBottom = dockY - u.gapBoardDock;
    const boardX = side;
    const boardW = w - side * 2;
    const boardH = Math.max(140, boardBottom - boardTop);

    const holdTw = tw * 0.72;
    const holdTh = th * 0.72;
    const holdX = boardX + 10;
    const holdY = dockY - holdTh - 6;

    const buttons = [
      { key: 'undo', x: btnPropX, y: btnY, w: u.propBtnW, h: u.btnH },
      { key: 'remove', x: btnPropX + u.propBtnW + u.btnGap, y: btnY, w: u.propBtnW, h: u.btnH },
      { key: 'shuffle', x: btnPropX + (u.propBtnW + u.btnGap) * 2, y: btnY, w: u.propBtnW, h: u.btnH },
      { key: 'restart', x: btnRestartX, y: btnY, w: u.restartBtnW, h: u.btnH, secondary: true },
    ];

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
      boardX,
      boardY: boardTop,
      boardW,
      boardH,
      boardPad: u.boardPad,
      dockX,
      dockY,
      dockW,
      dockH,
      buttons,
      holdX,
      holdY,
      holdTw,
      holdTh,
      boardTop,
    };
  }

  return { CONFIG, TILE_ICONS, FLOWER_IDS: TILE_ICONS, getLayout };
});
