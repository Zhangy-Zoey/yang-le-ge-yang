---
name: level-design
description: >-
  Design and tune 花鸟织绣 (yang-le-ge-yang) match-3 levels: difficulty,
  solvability, layer layout, typeCount, scatter/drift. Use when adding levels,
  balancing difficulty, fixing unsolvable deals, or editing CONFIG.levels in
  js/config.js or js/level.js.
---

# 花鸟织绣 · 关卡设计

## Source of truth

| What | Where |
|------|--------|
| Level definitions | `js/config.js` → `CONFIG.levels[]` |
| Generation + solvability | `js/level.js` |
| Tile icons pool | `js/flowers.js` → `FLOWER_IDS` (max 12 types) |
| Board fit | `level.js` → `fitTilesInBoard`, `refreshBlocked` |

## Level config shape

Each entry in `CONFIG.levels[]`:

```javascript
{
  name: '第X关 · 题名',
  typeCount: 6,           // how many flower types appear (≤ FLOWER_IDS.length)
  triplesPerType: 3,      // each type contributes this many triples
  boardFillRatio: 0.68,   // tile cluster scale within board area
  layerSpreadY: 1.18,     // vertical spacing between layers
  tileScatter: 0.06,      // per-tile random offset (0 = grid)
  layerDrift: 0.1,        // per-layer random shift
  layers: [
    { rows: 3, cols: 4, offsetX: 0, offsetY: 0 },
    // offsetX/Y in tile units; higher layer index = on top
  ],
}
```

**Tile count** = sum of `rows × cols` across all layers. Must be divisible by 3.

## Solvability rules (do not break)

1. **`buildSolvablePool`** — every icon count is a multiple of 3. Never shuffle-then-slice.
2. **`isLevelSolvable`** — DFS validates a full win path (memoized, up to ~400k nodes).
3. **`createLevel`** — retries up to ~160 attempts; prefers early playable deals.
4. Changing `typeCount` or layer grid without checking tile count % 3 → broken level.

## Difficulty levers

| Harder ↑ | Easier ↓ |
|----------|----------|
| More layers / more tiles | Fewer layers, fewer types |
| Higher `typeCount` | Lower `typeCount` |
| Higher `boardFillRatio` (denser) | Lower fill ratio |
| More overlap (offset layers) | Spread layers apart |
| Higher `layerDrift` / `tileScatter` | Lower drift/scatter |

Current progression: 关1 (6 types, 2 layers) → 关2 (8 types, 5 layers) → 关3 (11 types, 5 layers).

## Workflow: add or tune a level

1. Pick `typeCount` ≤ 12 and compute total slots; confirm `% 3 === 0`.
2. Edit `CONFIG.levels[]` in `config.js` — name, layers, tuning knobs.
3. Test in browser: `python3 -m http.server 8765` → replay level multiple times.
4. If deals feel impossible: reduce layers or types before touching solvability code.
5. If generation is slow: reduce slot count or layer count first.

## Blocked tile logic

`refreshBlocked`: tile A blocks tile B when A.layer > B.layer and rects overlap > 2px.
More overlapping layers = harder because fewer tiles are clickable at start.

## Naming convention

Use literary Chinese: `第X关 · 四字题名` (e.g. 庭前初绽, 花雨迷津, 绣阁深叠).
