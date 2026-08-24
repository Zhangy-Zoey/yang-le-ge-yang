---
name: wechat-ship
description: >-
  Build, pack, and ship 花鸟织绣 (yang-le-ge-yang) as a WeChat mini-game.
  Use when editing project.config.json, game.json, preparing upload, checking
  pack size, packOptions.ignore, or debugging wx-specific issues.
---

# 花鸟织绣 · 微信小游戏发布

## Project files

| File | Purpose |
|------|---------|
| `game.js` | WeChat entry (requires debug-log + main) |
| `game.json` | Mini-game manifest (portrait, status bar) |
| `project.config.json` | DevTools project + **pack ignore list** |
| `project.private.config.json` | Local overrides (libVersion, appid tweaks) |

`compileType: "minigame"`, entry is **not** `index.html`.

## Pack exclusions (already configured)

These must stay in `project.config.json` → `packOptions.ignore`:

- Dev-only: `index.html`, `sound-preview.html`, `scripts/`, `sounds/`, `.cursor/`, `.venv/`, `debug.log`
- Raw/large: `assets/flowers/_raw_white_bg/`, legacy `assets/bg*.png`

**Before upload:** confirm no dev files slipped into pack. Check DevTools pack preview size.

## Pre-upload checklist

```
- [ ] game.js loads without error on simulator
- [ ] All 12 flower PNGs present in assets/flowers/
- [ ] Font renders acceptably on wx (browser font is dev-only)
- [ ] Audio works (procedural Web Audio in game.js — no external MP3 shipped)
- [ ] Safe area OK on notched device (real device test)
- [ ] Three levels playable start-to-finish
- [ ] No console.error in wx log (pull via scripts/pull-debug-log.sh)
- [ ] Pack size reasonable (flower PNGs are largest assets)
```

## Upload workflow

1. Open folder in **微信开发者工具**
2. Preview on simulator → real device
3. Check **详情 → 本地代码** pack file list and size
4. Upload version → submit review (when ready)

Tourist mode: `isGameTourist: true` in public config (allows trial without full auth).

## Audio note

`sounds/` folder is **entirely pack-ignored**. In-game audio is procedural (`playJadeShatterSound`, `playTapSound` in `js/game.js`). To ship external audio, wire loader in game.js **and** remove sounds from ignore list.

## Adding new assets to pack

1. Place file under project root (e.g. `assets/…`)
2. Confirm it is **not** in `packOptions.ignore`
3. Reference with relative path from game root
4. Re-check pack preview

## Debug on device

```bash
./scripts/pull-debug-log.sh
# → debug.log in project root (from wx USER_DATA_PATH)
```

`js/debug-log.js` patches `console.*` on wx runtime only.

## Settings worth knowing

- `urlCheck: false` — local/dev URLs allowed
- `es6: true`, `minified: true` — ES6 + minify enabled
- `libVersion: 3.5.5` (public) — base library version for compatibility

Do not commit secrets to `project.private.config.json` if sharing repo.
