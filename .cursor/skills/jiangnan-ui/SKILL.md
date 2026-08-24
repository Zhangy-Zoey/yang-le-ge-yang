---
name: jiangnan-ui
description: >-
  Apply the 江南文人画 watercolor match-3 visual system to 花鸟织绣
  (yang-le-ge-yang). Use when editing this game's UI, render.js, config.js
  palette, flower tiles, HUD, or visual polish. Style: 清透留白低饱和, celadon
  paper, round jade tiles, soft dissolve FX — no xianxia gold/glow.
---

# 花鸟织绣 · 江南 UI

This project implements the look defined in personal skill `ui-design/looks/jiangnan-match3.md`.

## Source of truth

| What | Where |
|------|--------|
| Color tokens | `js/config.js` → `CONFIG.palette` |
| Layout rhythm | `js/config.js` → `CONFIG.ui` |
| Canvas draw | `js/render.js` |
| Flower tiles | `js/flowers.js` + `assets/flowers/*.png` |
| Browser shell | `index.html` |

## Rules (do not break)

1. **Background 虚，棋子 实** — decorative ink bamboo/peach stays low alpha; play area gets a light veil; tiles stay high contrast.
2. **No xianxia chrome** — no gold borders, heavy wood frames, neon glow, explosion VFX.
3. **Round / soft shapes** — tile radius ~36% of min(w,h); avoid sharp rects on tokens.
4. **Accent sparingly** — rouge `#B87A7C` for stamps, tips, lose state; celadon `#7F9E96` for lines and win.
5. **Vertical flow** — header → board (breathing gap) → dock → buttons; increase gaps before adding decoration.

## Flower assets

Drop PNGs into `assets/flowers/` using catalog ids (`plum.png`, `peony.png`, …). Until present, `flowers.js` draws watercolor jade fallbacks.

**Prompt (棋子):**

> 古风消消乐游戏棋子，玉石质感，琉璃质感，花瓣形状，水彩边缘晕染，淡粉色和浅青色，工笔画质感，透明背景，清新淡雅

## When changing visuals

1. Edit `CONFIG.palette` first — keep render reading from it.
2. Test in browser: `cd yang-le-ge-yang && python3 -m http.server 8765` → `http://localhost:8765`
3. WeChat: open folder in WeChat DevTools; `index.html` is ignored in `project.config.json`.
