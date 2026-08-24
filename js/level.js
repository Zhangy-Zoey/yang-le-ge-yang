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

  function buildTileSlots(levelCfg, tileW, tileH, boardWidth, boardTop) {
    const slots = [];
    levelCfg.layers.forEach((layer, layerIndex) => {
      const gridW = layer.cols * tileW;
      const baseX = (boardWidth - gridW) / 2 + layer.offsetX * tileW;
      const baseY = boardTop + layer.offsetY * tileH;
      for (let r = 0; r < layer.rows; r++) {
        for (let c = 0; c < layer.cols; c++) {
          slots.push({
            x: baseX + c * tileW,
            y: baseY + r * tileH,
            layer: layerIndex,
          });
        }
      }
    });
    return slots;
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
            rectsOverlap(tile, other)
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

  function centerTilesInBoard(tiles, boardY, boardH, padding, verticalBias) {
    if (!tiles.length) return;
    let minY = Infinity;
    let maxY = -Infinity;
    tiles.forEach((t) => {
      minY = Math.min(minY, t.y);
      maxY = Math.max(maxY, t.y + t.h);
    });
    const contentH = maxY - minY;
    const pad = padding || 16;
    const availH = boardH - pad * 2;
    const bias = verticalBias != null ? verticalBias : 0.28;
    const shift = boardY + pad + Math.max(0, (availH - contentH) * bias) - minY;
    tiles.forEach((t) => {
      t.y += shift;
    });
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

  function createLevel(levelIndex, boardWidth, boardArea) {
    const levelCfg = CONFIG.levels[levelIndex] || CONFIG.levels[0];
    const tileW = (boardArea && boardArea.tileW) || CONFIG.tileW;
    const tileH = (boardArea && boardArea.tileH) || CONFIG.tileH;
    const { boardTop } = CONFIG;
    const slots = buildTileSlots(levelCfg, tileW, tileH, boardWidth, boardTop);

    const types = TILE_ICONS.slice(0, levelCfg.typeCount);
    const count = slots.length - (slots.length % 3);
    const maxAttempts = Math.max(160, Math.floor(count / 3) * 14);
    const solvabilityBudget = Math.max(400000, count * 12000);
    // 第二关起要求开局至少有一对可消同花，降低「点几下就卡死」
    const minEarlyScore = levelIndex >= 1 ? 10 : 0;

    let best = null;
    let bestScore = -1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const pool = buildSolvablePool(count, types);
      assertSolvable(pool);

      const usedSlots = shuffle(slots).slice(0, pool.length).sort((a, b) => a.layer - b.layer);
      const tiles = buildTilesFromDeal(usedSlots, pool, tileW, tileH);

      if (boardArea) {
        centerTilesInBoard(
          tiles,
          boardArea.y,
          boardArea.h,
          boardArea.pad,
          boardArea.verticalBias
        );
      }
      refreshBlocked(tiles);

      if (!isLevelSolvable(tiles, solvabilityBudget)) continue;

      const score = earlyPlayScore(tiles);
      if (score > bestScore) {
        bestScore = score;
        best = tiles;
      }
      // 已够「好消」就收工，不必穷尽尝试
      if (score >= minEarlyScore + 20) {
        return { name: levelCfg.name, tiles, levelIndex };
      }
    }

    if (best && bestScore >= minEarlyScore) {
      return { name: levelCfg.name, tiles: best, levelIndex };
    }
    if (best) {
      return { name: levelCfg.name, tiles: best, levelIndex };
    }

    // 兜底：把完整三联优先分给上层槽位，再与位置一一对应
    const pool = buildSolvablePool(count, types);
    assertSolvable(pool);
    const chosenSlots = shuffle(slots).slice(0, pool.length);
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
    if (boardArea) {
      centerTilesInBoard(
        tiles,
        boardArea.y,
        boardArea.h,
        boardArea.pad,
        boardArea.verticalBias
      );
    }
    refreshBlocked(tiles);
    return { name: levelCfg.name, tiles, levelIndex };
  }

  /** 更高 layer 且矩形有实质重叠 → 被压住（半压也算压住，不可点消） */
  function refreshBlocked(tiles) {
    const alive = tiles.filter((t) => !t.removed);
    for (const tile of alive) {
      tile.blocked = alive.some(
        (other) =>
          other.id !== tile.id &&
          other.layer > tile.layer &&
          rectsOverlap(tile, other)
      );
    }
  }

  /** 任意方向重叠超过约 2px 即视为遮挡（兼容半格错位叠层） */
  function rectsOverlap(a, b) {
    const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return ox > 2 && oy > 2;
  }

  function findTileAt(tiles, x, y) {
    const candidates = tiles
      .filter((t) => !t.removed && x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h)
      .sort((a, b) => b.layer - a.layer);
    return candidates[0] || null;
  }

  return {
    createLevel,
    refreshBlocked,
    findTileAt,
    shuffle,
    centerTilesInBoard,
    isLevelSolvable,
  };
});
