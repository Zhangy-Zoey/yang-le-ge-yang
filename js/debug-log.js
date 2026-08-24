/**
 * 调试日志：劫持 console，写入微信本地文件，便于排查预览/真机问题
 */
(function (root, factory) {
  const exp = factory();
  if (typeof module === 'object' && module.exports) module.exports = exp;
  else Object.assign(root, exp);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MAX_LINES = 800;
  const buffer = [];
  let logPath = '';
  let fs = null;

  function formatArg(a) {
    if (a instanceof Error) return a.stack || a.message;
    if (typeof a === 'object') {
      try {
        return JSON.stringify(a);
      } catch (_) {
        return String(a);
      }
    }
    return String(a);
  }

  function formatArgs(args) {
    return Array.from(args).map(formatArg).join(' ');
  }

  function append(level, args) {
    const line = `[${new Date().toISOString()}] [${level}] ${formatArgs(args)}`;
    buffer.push(line);
    if (buffer.length > MAX_LINES) buffer.shift();
    if (!fs || !logPath) return;
    try {
      fs.appendFileSync(logPath, line + '\n', 'utf8');
    } catch (_) {
      try {
        fs.writeFileSync(logPath, line + '\n', 'utf8');
      } catch (e) {
        /* ignore */
      }
    }
  }

  function init() {
    if (typeof wx === 'undefined' || !wx.getFileSystemManager || !wx.env) return;
    fs = wx.getFileSystemManager();
    logPath = `${wx.env.USER_DATA_PATH}/yang-debug.log`;
    try {
      fs.writeFileSync(
        logPath,
        `[${new Date().toISOString()}] [INFO] debug-log init\n`,
        'utf8'
      );
    } catch (_) {
      /* ignore */
    }
  }

  function patchConsole() {
    ['log', 'info', 'warn', 'error'].forEach((level) => {
      const orig = console[level] && console[level].bind(console);
      if (!orig) return;
      console[level] = function patchedConsole() {
        append(level.toUpperCase(), arguments);
        orig.apply(console, arguments);
      };
    });
  }

  function patchGlobalError() {
    if (typeof wx !== 'undefined' && wx.onError) {
      wx.onError((msg) => append('WX_ERROR', [msg]));
    }
    if (typeof wx !== 'undefined' && wx.onUnhandledRejection) {
      wx.onUnhandledRejection((res) => {
        append('WX_REJECTION', [res && (res.reason || res.message || res)]);
      });
    }
  }

  init();
  patchConsole();
  patchGlobalError();
  if (logPath) {
    append('INFO', ['debug-log path:', logPath]);
  }

  return {
    getBuffer: () => buffer.slice(),
    getLogPath: () => logPath,
  };
});
