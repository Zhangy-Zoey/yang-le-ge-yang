/**
 * 游戏字体：默认启功体（方正启体 / 启功行楷等 TTF）
 * 微信须 wx.loadFont + TTF；woff2 常报 NOT_WHITELIST_FILE
 */
(function (root, factory) {
  const exp = factory();
  if (typeof module === 'object' && module.exports) module.exports = exp;
  else Object.assign(root, exp);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SYSTEM_STACK = '"STKaiti", "Kaiti SC", "Songti SC", "STSong", "PingFang SC", serif';

  /** 改这里切换主题：qigong | shoujin */
  const ACTIVE_THEME = 'qigong';

  const FONT_THEMES = {
    qigong: {
      label: '启功体',
      browserFamily: 'GameQigong',
      candidates: ['assets/fonts/qigongti.ttf', 'assets/fonts/shoujinti.ttf'],
    },
    shoujin: {
      label: '瘦金体',
      browserFamily: 'GameShoujin',
      candidates: ['assets/fonts/shoujinti.ttf'],
    },
  };

  const theme = FONT_THEMES[ACTIVE_THEME] || FONT_THEMES.qigong;
  const FONT_CANDIDATES = theme.candidates;
  const BROWSER_FAMILY = theme.browserFamily;
  const BROWSER_STACK = '"' + BROWSER_FAMILY + '", ' + SYSTEM_STACK;

  /** 小字库缺字时逐字回退（完整 GB2312 启功体一般不需要） */
  const RARE_GLYPHS = '秾葳蕤蓊萋菀彧翾瓔琬瑳翯';

  let fontStack = SYSTEM_STACK;
  let loadedFamily = '';
  let loadedPath = '';

  function getFontTheme() {
    return ACTIVE_THEME;
  }

  function getFontStack() {
    return fontStack;
  }

  function getLoadedFamily() {
    return loadedFamily;
  }

  function getLoadedPath() {
    return loadedPath;
  }

  function getBrowserFamily() {
    return BROWSER_FAMILY;
  }

  function isRareGlyph(ch) {
    return ch && RARE_GLYPHS.indexOf(ch) >= 0;
  }

  function getSystemStack() {
    return SYSTEM_STACK;
  }

  function wxFontExists(path) {
    if (typeof wx === 'undefined' || !wx.getFileSystemManager) return false;
    try {
      wx.getFileSystemManager().accessSync(path);
      return true;
    } catch (_) {
      return false;
    }
  }

  function resolveWxFontPath() {
    for (let i = 0; i < FONT_CANDIDATES.length; i++) {
      if (wxFontExists(FONT_CANDIDATES[i])) return FONT_CANDIDATES[i];
    }
    return '';
  }

  /** 复制到用户目录再 load，规避部分版本对包内路径的限制 */
  function wxFontLoadPath(packagePath) {
    if (typeof wx === 'undefined' || !wx.getFileSystemManager || !wx.env) return packagePath;
    const fs = wx.getFileSystemManager();
    const name = packagePath.split('/').pop();
    const dest = wx.env.USER_DATA_PATH + '/' + name;
    try {
      fs.accessSync(dest);
      return dest;
    } catch (_) {
      /* not copied yet */
    }
    try {
      fs.copyFileSync(packagePath, dest);
      return dest;
    } catch (err) {
      console.warn('[font] copyFileSync failed, use package path', err && (err.message || err));
      return packagePath;
    }
  }

  function loadGameFont() {
    if (typeof wx !== 'undefined' && typeof wx.loadFont === 'function') {
      const packagePath = resolveWxFontPath();
      if (!packagePath) {
        fontStack = SYSTEM_STACK;
        console.warn('[font] no font file in package, use system kaiti/serif');
        return Promise.resolve(fontStack);
      }

      const loadPath = wxFontLoadPath(packagePath);
      return new Promise((resolve) => {
        try {
          const family = wx.loadFont(loadPath);
          if (family && typeof family === 'string') {
            loadedFamily = family;
            loadedPath = packagePath;
            fontStack = '"' + family + '", ' + SYSTEM_STACK;
            console.info('[font] wx.loadFont ok', theme.label, loadPath, '->', family);
            resolve(fontStack);
            return;
          }
          console.warn('[font] wx.loadFont returned empty, path=', loadPath);
        } catch (err) {
          console.warn('[font] wx.loadFont error:', err && (err.message || err));
        }
        fontStack = SYSTEM_STACK;
        resolve(fontStack);
      });
    }

    if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
      return document.fonts
        .load('16px ' + BROWSER_FAMILY)
        .then(() => document.fonts.ready)
        .then(() => {
          fontStack = BROWSER_STACK;
          loadedPath = FONT_CANDIDATES[0];
          return fontStack;
        })
        .catch(() => {
          fontStack = SYSTEM_STACK;
          return fontStack;
        });
    }

    fontStack = SYSTEM_STACK;
    return Promise.resolve(fontStack);
  }

  return {
    loadGameFont,
    getFontStack,
    getLoadedFamily,
    getLoadedPath,
    getBrowserFamily,
    getFontTheme,
    getSystemStack,
    isRareGlyph,
    SYSTEM_STACK,
    BROWSER_STACK,
    FONT_CANDIDATES,
  };
});
