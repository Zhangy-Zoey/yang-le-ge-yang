/**
 * 关卡生成 + 遮挡判定
 */
(function (root, factory) {
  const exp = factory(root.CONFIG, root.TILE_ICONS);
  if (typeof module === 'object' && module.exports) {
    const { CONFIG, TILE_ICONS } = require('./config');
    module.exports = factory(CONFIG, TILE_ICONS);
  } else Object.assign(root, exp);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (CONFIG, TILE_ICONS) {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildTileSlots(levelCfg, tileW, tileH, boardArea, layerDrift) {
    const slots = [];
    const boardX = (boardArea && boardArea.x) || 0;
    const boardW = (boardArea && boardArea.w) || 360;
    const boardY = (boardArea && boardArea.y) || 0;
    const spreadY =
      (levelCfg && levelCfg.layerSpreadY != null)
        ? levelCfg.layerSpreadY
        : (boardArea && boardArea.layerSpreadY) || 1;
    const drift =
      (levelCfg && levelCfg.layerDrift != null)
        ? levelCfg.layerDrift
        : layerDrift != null
          ? layerDrift
          : 0;
    levelCfg.layers.forEach((layer, layerIndex) => {
      const gridW = layer.cols * tileW;
      const driftX = drift ? (Math.random() - 0.5) * 2 * tileW * drift : 0;
      const driftY = drift ? (Math.random() - 0.5) * 2 * tileH * drift : 0;
      const rowStagger = drift ? (Math.random() - 0.5) * tileW * drift * 0.85 : 0;
      const baseX = boardX + (boardW - gridW) / 2 + layer.offsetX * tileW + driftX;
      const baseY = boardY + layer.offsetY * tileH * spreadY + driftY;
      for (let r = 0; r < layer.rows; r++) {
        for (let c = 0; c < layer.cols; c++) {
          const zig = rowStagger * (r % 2 === 0 ? 1 : -1);
          slots.push({
            x: baseX + c * tileW + zig,
            y: baseY + r * tileH + (Math.random() - 0.5) * tileH * drift * 0.35,
            layer: layerIndex,
          });
        }
      }
    });
    return slots;
  }

  /** 单牌微偏移，打破齐整网格 */
  function scatterSlots(slots, tileW, tileH, levelCfg) {
    const scatter =
      (levelCfg && levelCfg.tileScatter != null)
        ? levelCfg.tileScatter
        : (CONFIG.ui && CONFIG.ui.tileScatter) || 0.18;
    if (scatter <= 0) return slots;
    return slots.map((s) => ({
      ...s,
      x: s.x + (Math.random() - 0.5) * 2 * tileW * scatter,
      y: s.y + (Math.random() - 0.5) * 2 * tileH * scatter,
    }));
  }

  /**
   * 可解发牌：每种图案数量必须是 3 的倍数（以「三联」为单位填充）
   * 禁止先 shuffle 再 slice——截断会破坏品类倍数，导致永远消不完
   */
  function buildSolvablePool(tileCount, types) {
    const count = tileCount - (tileCount % 3);
    const triplesNeeded = count / 3;
    const tripleOwners = [];
    for (let i = 0; i < triplesNeeded; i++) {
      tripleOwners.push(types[i % types.length]);
    }
    // 打乱「哪几种多几组」，但不拆开三联
    const owners = shuffle(tripleOwners);
    const pool = [];
    for (const icon of owners) {
      pool.push(icon, icon, icon);
    }
    return shuffle(pool);
  }

  function assertSolvable(pool) {
    const counts = {};
    for (const icon of pool) counts[icon] = (counts[icon] || 0) + 1;
    for (const icon of Object.keys(counts)) {
      if (counts[icon] % 3 !== 0) {
        throw new Error(`unsolvable deal: ${icon} x${counts[icon]}`);
      }
    }
    return counts;
  }

  /** 模拟槽位插入 + 三消（与 SlotBar 规则一致，立即结算） */
  function insertSlot(slots, icon) {
    let insertAt = slots.length;
    for (let i = slots.length - 1; i >= 0; i--) {
      if (slots[i] === icon) {
        insertAt = i + 1;
        break;
      }
    }
    const next = slots.slice();
    next.splice(insertAt, 0, icon);
    if (next.length > CONFIG.slotCapacity) return null;

    const counts = {};
    for (const s of next) counts[s] = (counts[s] || 0) + 1;
    for (const ic of Object.keys(counts)) {
      if (counts[ic] >= CONFIG.matchCount) {
        let removed = 0;
        const out = [];
        for (const s of next) {
          if (s === ic && removed < CONFIG.matchCount) {
            removed += 1;
            continue;
          }
          out.push(s);
        }
        return out;
      }
    }
    return next;
  }

  function blockedMap(tiles, removed) {
    const alive = tiles.filter((t) => !removed.has(t.id));
    const map = new Map();
    for (const tile of alive) {
      map.set(
        tile.id,
        alive.some(
          (other) =>
            other.id !== tile.id &&
            other.layer > tile.layer &&
            tileIsBlockedBy(tile, other)
        )
      );
    }
    return map;
  }

  function solvabilityKey(tiles, removed, slots) {
    let mask = 0n;
    for (const t of tiles) {
      if (removed.has(t.id)) mask |= 1n << BigInt(t.id);
    }
    return `${mask.toString(36)}:${slots.join(',')}`;
  }

  /**
   * 深度搜索验证关卡是否可通过（考虑遮挡 + 7 槽位 + 三消）
   * 发牌失败时重试，直到找到可解布局
   */
  function isLevelSolvable(tiles, maxNodes = 400000) {
    const memo = new Set();
    let nodes = 0;

    function dfs(removed, slots) {
      nodes += 1;
      if (nodes > maxNodes) return false;

      const remaining = tiles.length - removed.size;
      if (remaining === 0 && slots.length === 0) return true;
      if (slots.length >= CONFIG.slotCapacity) return false;

      const key = solvabilityKey(tiles, removed, slots);
      if (memo.has(key)) return false;
      memo.add(key);

      const blocked = blockedMap(tiles, removed);
      const pickable = tiles.filter((t) => !removed.has(t.id) && !blocked.get(t.id));
      if (!pickable.length) return false;

      pickable.sort((a, b) => {
        const ca = slots.filter((s) => s === a.icon).length;
        const cb = slots.filter((s) => s === b.icon).length;
        return cb - ca;
      });

      for (const tile of pickable) {
        const nextSlots = insertSlot(slots, tile.icon);
        if (!nextSlots) continue;
        const nextRemoved = new Set(removed);
        nextRemoved.add(tile.id);
        if (dfs(nextRemoved, nextSlots)) return true;
      }
      return false;
    }

    return dfs(new Set(), []);
  }

  /** 开局牌群外框（消牌后裁纸尺寸不变） */
  function contentFrameFromTiles(tiles, margin) {
    if (!tiles.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    tiles.forEach((t) => {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + t.w);
      maxY = Math.max(maxY, t.y + t.h);
    });
    const m = margin != null ? margin : 18;
    return {
      x: minX - m,
      y: minY - m,
      w: maxX - minX + m * 2,
      h: maxY - minY + m * 2,
    };
  }

  /** 缩放 + 居中：牌群尽量撑满棋区 */
  function fitTilesInBoard(tiles, boardArea, baseTileW, baseTileH, levelCfg) {
    if (!tiles.length || !boardArea) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    tiles.forEach((t) => {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + t.w);
      maxY = Math.max(maxY, t.y + t.h);
    });
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    if (contentW <= 0 || contentH <= 0) return null;

    const pad = boardArea.pad != null ? boardArea.pad : 14;
    const bottomReserve = boardArea.bottomReserve != null ? boardArea.bottomReserve : 10;
    const fill =
      (levelCfg && levelCfg.boardFillRatio != null)
        ? levelCfg.boardFillRatio
        : boardArea.fillRatio != null
          ? boardArea.fillRatio
          : 0.94;
    const availW = boardArea.w - pad * 2;
    const availH = boardArea.h - pad * 2 - bottomReserve;
    const scaleW = availW / contentW;
    const scaleH = availH / contentH;
    let scale = Math.min(scaleW, scaleH) * fill;
    scale = Math.min(scale, 1.35);

    const bias = boardArea.verticalBias != null ? boardArea.verticalBias : 0.48;
    const boardLeft = boardArea.x + pad;
    const boardTop = boardArea.y + pad;
    const boardRight = boardArea.x + boardArea.w - pad;
    const boardBottom = boardArea.y + boardArea.h - pad - bottomReserve;
    const origins = tiles.map((t) => ({ x: t.x, y: t.y }));

    function applyScale(s) {
      const scaledW = contentW * s;
      const scaledH = contentH * s;
      const destX = boardLeft + (availW - scaledW) / 2;
      const destY = boardTop + (availH - scaledH) * bias;
      tiles.forEach((t, i) => {
        t.x = destX + (origins[i].x - minX) * s;
        t.y = destY + (origins[i].y - minY) * s;
        t.w = baseTileW * s;
        t.h = baseTileH * s;
        t.x = Math.round(t.x * 2) / 2;
        t.y = Math.round(t.y * 2) / 2;
        t.w = Math.round(t.w * 2) / 2;
        t.h = Math.round(t.h * 2) / 2;
      });
    }

    applyScale(scale);

    // 高密度关（如第三关）须能缩到棋区内，不可硬抬下限
    for (let guard = 0; guard < 12; guard += 1) {
      let oMinX = Infinity;
      let oMinY = Infinity;
      let oMaxX = -Infinity;
      let oMaxY = -Infinity;
      tiles.forEach((t) => {
        oMinX = Math.min(oMinX, t.x);
        oMinY = Math.min(oMinY, t.y);
        oMaxX = Math.max(oMaxX, t.x + t.w);
        oMaxY = Math.max(oMaxY, t.y + t.h);
      });
      if (oMinX >= boardLeft && oMinY >= boardTop && oMaxX <= boardRight && oMaxY <= boardBottom) {
        break;
      }
      scale *= 0.94;
      if (scale < 0.42) break;
      applyScale(scale);
    }

    return contentFrameFromTiles(tiles, boardArea.framePad);
  }

  function buildTilesFromDeal(usedSlots, pool, tileW, tileH) {
    return usedSlots.map((s, i) => ({
      id: i,
      icon: pool[i],
      x: s.x,
      y: s.y,
      w: tileW,
      h: tileH,
      layer: s.layer,
      removed: false,
      blocked: false,
    }));
  }

  /** 开局可点牌面的「好消」程度：同花成对/成三越多越好，避免点几下就塞满 */
  function earlyPlayScore(tiles) {
    const counts = {};
    for (const t of tiles) {
      if (t.removed || t.blocked) continue;
      counts[t.icon] = (counts[t.icon] || 0) + 1;
    }
    let score = 0;
    for (const n of Object.values(counts)) {
      if (n >= 3) score += 30;
      else if (n === 2) score += 8;
      else score += 1;
    }
    return score;
  }

  function createLevel(levelIndex, boardWidth, boardAreaIn) {
    const levelCfg = CONFIG.levels[levelIndex] || CONFIG.levels[0];
    const tileW = (boardAreaIn && boardAreaIn.tileW) || CONFIG.tileW;
    const tileH = (boardAreaIn && boardAreaIn.tileH) || CONFIG.tileH;
    const boardArea = boardAreaIn || null;
    const layerDrift = (CONFIG.ui && CONFIG.ui.layerDrift) || 0;
    const slotArea = boardArea || { x: 0, y: CONFIG.boardTop || 0, w: boardWidth };

    const types = TILE_ICONS.slice(0, levelCfg.typeCount);
    const slotCount = levelCfg.layers.reduce((n, l) => n + l.rows * l.cols, 0);
    const count = slotCount - (slotCount % 3);
    const maxAttempts = Math.max(160, Math.floor(count / 3) * 14);
    const solvabilityBudget = Math.max(400000, count * 12000);
    // 第二关起要求开局至少有一对可消同花，降低「点几下就卡死」
    const minEarlyScore = levelIndex >= 1 ? 10 : 0;

    let best = null;
    let bestScore = -1;
    let bestFrame = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const pool = buildSolvablePool(count, types);
      assertSolvable(pool);

      const baseSlots = buildTileSlots(levelCfg, tileW, tileH, slotArea, layerDrift);
      const usedSlots = scatterSlots(
        shuffle(baseSlots).slice(0, pool.length).sort((a, b) => a.layer - b.layer),
        tileW,
        tileH,
        levelCfg
      );
      const tiles = buildTilesFromDeal(usedSlots, pool, tileW, tileH);

      let contentFrame = null;
      if (boardArea) {
        contentFrame = fitTilesInBoard(tiles, boardArea, tileW, tileH, levelCfg);
      }
      refreshBlocked(tiles);

      if (!isLevelSolvable(tiles, solvabilityBudget)) continue;

      const score = earlyPlayScore(tiles);
      if (score > bestScore) {
        bestScore = score;
        best = tiles;
        bestFrame = contentFrame;
      }
      // 已够「好消」就收工，不必穷尽尝试
      if (score >= minEarlyScore + 20) {
        return { name: levelCfg.name, tiles, levelIndex, contentFrame };
      }
    }

    if (best && bestScore >= minEarlyScore) {
      return { name: levelCfg.name, tiles: best, levelIndex, contentFrame: bestFrame };
    }
    if (best) {
      return { name: levelCfg.name, tiles: best, levelIndex, contentFrame: bestFrame };
    }

    // 兜底：把完整三联优先分给上层槽位，再与位置一一对应
    const pool = buildSolvablePool(count, types);
    assertSolvable(pool);
    const fallbackSlots = buildTileSlots(levelCfg, tileW, tileH, slotArea, layerDrift);
    const chosenSlots = scatterSlots(
      shuffle(fallbackSlots).slice(0, pool.length),
      tileW,
      tileH,
      levelCfg
    );
    const triples = [];
    for (let i = 0; i < pool.length; i += 3) {
      triples.push(pool.slice(i, i + 3));
    }
    shuffle(triples);
    const rank = chosenSlots
      .map((slot, i) => ({ slot, i }))
      .sort((a, b) => b.slot.layer - a.slot.layer || a.i - b.i);
    const assignedPool = new Array(pool.length);
    let pick = 0;
    for (const triple of triples) {
      for (const icon of triple) {
        assignedPool[rank[pick].i] = icon;
        pick += 1;
      }
    }
    const tiles = buildTilesFromDeal(chosenSlots, assignedPool, tileW, tileH);
    let contentFrame = null;
    if (boardArea) {
      contentFrame = fitTilesInBoard(tiles, boardArea, tileW, tileH, levelCfg);
    }
    refreshBlocked(tiles);
    return { name: levelCfg.name, tiles, levelIndex, contentFrame };
  }

  /** 圆形棋子半径比例（与 jadeCircle inset 一致） */
  const TILE_RADIUS_INSET = 0.94;

  function tileRadius(tile) {
    return (Math.min(tile.w, tile.h) / 2) * TILE_RADIUS_INSET;
  }

  function tileCenter(tile) {
    return { cx: tile.x + tile.w / 2, cy: tile.y + tile.h / 2 };
  }

  /** 点是否在圆形棋子内 */
  function pointInTileCircle(tile, x, y) {
    const { cx, cy } = tileCenter(tile);
    const r = tileRadius(tile);
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  }

  /**
   * 两圆重叠深度；上层压住下层需超过较小半径的一定比例才算「被压住」
   * 避免方框角落微叠但肉眼不见叠层却点不了
   */
  function circlePenetration(a, b) {
    const { cx: ax, cy: ay } = tileCenter(a);
    const { cx: bx, cy: by } = tileCenter(b);
    const ra = tileRadius(a);
    const rb = tileRadius(b);
    const dist = Math.hypot(ax - bx, ay - by);
    return ra + rb - dist;
  }

  function tileIsBlockedBy( lower, upper, minRatio) {
    if (upper.layer <= lower.layer) return false;
    const pen = circlePenetration(lower, upper);
    if (pen <= 0) return false;
    const minR = Math.min(tileRadius(lower), tileRadius(upper));
    return pen >= minR * (minRatio != null ? minRatio : 0.22);
  }

  /** 更高 layer 且圆面实质重叠 → 被压住 */
  function refreshBlocked(tiles) {
    const alive = tiles.filter((t) => !t.removed);
    for (const tile of alive) {
      tile.blocked = alive.some((other) => tileIsBlockedBy(tile, other));
    }
  }

  function findTileAt(tiles, x, y) {
    const candidates = tiles
      .filter((t) => !t.removed && pointInTileCircle(t, x, y))
      .sort((a, b) => b.layer - a.layer);
    return candidates[0] || null;
  }

  return {
    createLevel,
    refreshBlocked,
    findTileAt,
    shuffle,
    centerTilesInBoard: fitTilesInBoard,
    fitTilesInBoard,
    contentFrameFromTiles,
    isLevelSolvable,
  };
});
