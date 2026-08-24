---
name: flower-assets
description: >-
  Add, replace, or process flower tile PNGs for 花鸟织绣 (yang-le-ge-yang).
  Use when working with assets/flowers/, FLOWER_CATALOG in js/flowers.js,
  jade tile rendering, AI image prompts, or PNG cache busting.
---

# 花鸟织绣 · 花卉棋子资产

## Pipeline

```
_raw_white_bg/ (gitignored raw) → process → assets/flowers/{id}.png → flowers.js catalog → sprite cache
```

## Add or replace a flower

1. Save PNG to `assets/flowers/{id}.png` (id = catalog key, e.g. `plum.png`).
2. Update `FLOWER_CATALOG` in `js/flowers.js`:
   ```javascript
   { id: 'plum', name: '梅', src: 'assets/flowers/plum.png?v=6', tint: ['#FBEEEE', '#F0C4C0'] }
   ```
3. **Bump `?v=`** on `src` to bust WeChat/browser cache.
4. `tint: [玉心, 玉边]` — jade base gradient behind transparent flower.
5. Test: browser reload + wx DevTools recompile.

PNG missing → `drawFlowerGlyph()` fallback draws Chinese character on jade base.

## Image requirements

| Property | Spec |
|----------|------|
| Background | Transparent |
| Style | Watercolor petal, soft edges, 工笔画质感 |
| Size | ~256–512px square; runtime scales via `FLOWER_INSET = 0.24` |
| Pack size | Keep under ~150KB per PNG when possible |

## AI generation prompt (棋子)

> 古风消消乐游戏棋子，玉石质感，琉璃质感，花瓣形状，水彩边缘晕染，淡粉色和浅青色，工笔画质感，透明背景，清新淡雅

Per-flower: specify the flower (梅/牡丹/兰…) and keep palette aligned with `tint` pair.

## Raw asset workflow

- Drop white-background sources in `assets/flowers/_raw_white_bg/` (gitignored).
- Process offline with Pillow (`.venv` available): remove white bg, soften edges.
- No automated script in repo yet — process manually or add script under `scripts/`.

## Rendering chain (`js/flowers.js`)

1. `preloadFlowers()` — load all PNGs
2. `getTileSprite()` — render to offscreen canvas at DPR → cache key `{id}_{size}_{blocked}@{dpr}`
3. `drawFlowerTile()` — blit sprite; blocked tiles get desaturation filter
4. `drawJadeBase()` — radial gradient using `tint` pair

## Do not break

- Catalog `id` must match filename stem and `FLOWER_IDS` order matters for level `typeCount`.
- Max 12 types in catalog; level `typeCount` cannot exceed available ids.
- After visual changes, invalidate is automatic via DPR cache key; bump `?v=` for source PNG changes.

## Related skill

Visual style rules: see `jiangnan-ui` skill. Palette tokens: `js/config.js` → `CONFIG.palette`.
