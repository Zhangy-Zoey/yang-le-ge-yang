---
name: dual-runtime
description: >-
  Develop 花鸟织绣 (yang-le-ge-yang) for both WeChat mini-game and browser.
  Use when editing js/*.js modules, adapter.js, main.js, index.html, fixing
  wx vs browser bugs, safe area, DPR, require/script loading, or touch input.
---

# 花鸟织绣 · 双端运行时

## Architecture

| Runtime | Entry | Canvas |
|---------|-------|--------|
| WeChat | `game.js` → `js/main.js` | `wx.createCanvas()` |
| Browser | `index.html` → script tags | `<canvas id="game">` |

**Browser dev only** — `index.html` is pack-ignored; never assume wx sees it.

## UMD module pattern (every js/*.js)

```javascript
(function (root, factory) {
  const exp = factory(/* deps from root or require */);
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(/* require deps */);
  } else Object.assign(root, exp);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // ...
});
```

When adding a module:
1. Support both `require()` (WeChat) and `<script>` + `globalThis` (browser).
2. Keep dependency order in `index.html` scripts matching require graph.
3. Do not import npm packages — no bundler.

## Module load order (browser)

```
adapter → flowers → config → level → slot → render → game → main
```

## Runtime differences

| Concern | WeChat | Browser |
|---------|--------|---------|
| DPR | full `pixelRatio` | capped at 2 in adapter |
| Safe area | `wx.getMenuButtonBoundingClientRect` | CSS `env(safe-area-inset-*)` |
| Images | `wx.createImage()` | `new Image()` |
| Offscreen canvas | `wx.createCanvas()` | `document.createElement('canvas')` |
| Font | system fallback | `assets/fonts/shoujinti.woff2` via `@font-face` |
| Debug log | `js/debug-log.js` → USER_DATA_PATH | browser console |

## Safe area

`adapter.js` reads safe insets → `main.js` writes `CONFIG.ui.safeTop/Bottom`.
Do not hardcode notch offsets in render modules; use `getLayout(w, h)`.

## Layout single source

**All screen regions** come from `config.js` → `getLayout(w, h)`.
Never compute header/dock/button positions independently in other modules.

## Testing checklist

```bash
# Browser (must use HTTP, not file://)
cd yang-le-ge-yang && python3 -m http.server 8765
# → http://localhost:8765
```

WeChat: open project folder in 微信开发者工具, preview on simulator + real device.

Debug log pull:
```bash
./scripts/pull-debug-log.sh   # copies wx log → debug.log
```

## Common pitfalls

- `file://` breaks asset loading in browser — always use local server.
- Font-only-in-browser: verify Chinese labels on wx separately.
- DPR change must call `setRenderDpr()` in `flowers.js` to invalidate sprite cache.
- Touch: `rt.onTouch` in adapter; game reads normalized coords from runtime.
