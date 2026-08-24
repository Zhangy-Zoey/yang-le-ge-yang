/**
 * 游戏主状态机 + 轻动效
 * 三消：第三枚飞入落地后三朵同消；击打感短促对齐
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const { CONFIG, getLayout } = require('./config');
    const level = require('./level');
    const { SlotBar } = require('./slot');
    module.exports = factory(CONFIG, getLayout, level, SlotBar);
  } else {
    Object.assign(root, factory(root.CONFIG, root.getLayout, root, root.SlotBar));
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (CONFIG, getLayout, levelApi, SlotBar) {
  const { createLevel, refreshBlocked, findTileAt, shuffle } = levelApi;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeOutBack(t) {
    const c1 = 1.7;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  class Game {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.slotBar = new SlotBar();
      this.hold = [];
      this.history = [];
      this.status = 'playing';
      this.message = '';
      this.props = { undo: 3, remove: 1, shuffle: 2 };
      this.buttons = [];
      this.levelIndex = 0;
      this.now = 0;
      this.fx = { flies: [], bursts: [], shakes: {}, impacts: [] };
      this.matchFlash = 0;
      this.slotShake = 0;
      this.combo = 0;
      this._audioCtx = null;
      this.startLevel(0);
    }

    layout() {
      return getLayout(this.width, this.height);
    }

    startLevel(index) {
      this.levelIndex = Math.min(index, CONFIG.levels.length - 1);
      const L = this.layout();
      CONFIG.boardTop = L.boardTop;
      const level = createLevel(this.levelIndex, this.width, {
        y: L.boardY,
        h: L.boardH,
        pad: L.boardPad,
        verticalBias: CONFIG.ui.tileBiasY,
        tileW: L.tw,
        tileH: L.th,
      });
      this.tiles = level.tiles;
      this.levelName = level.name;
      this.slotBar.clear();
      this.hold = [];
      this.history = [];
      this.status = 'playing';
      this.message = '';
      this.props = { undo: 3, remove: 1, shuffle: 2 };
      this.fx = { flies: [], bursts: [], shakes: {}, impacts: [] };
      this.matchFlash = 0;
      this.slotShake = 0;
      this.combo = 0;
      refreshBlocked(this.tiles);
      this.layoutUI();
    }

    layoutUI() {
      const L = this.layout();
      this.buttons = L.buttons.map((b) => ({ ...b }));
    }

    remainingCount() {
      return this.tiles.filter((t) => !t.removed).length;
    }

    slotOrigin() {
      const L = this.layout();
      return {
        x: L.slotX,
        y: L.slotY,
        tw: L.slotTw || L.tw,
        th: L.slotTh || L.th,
        gap: L.slotGap,
      };
    }

    slotPos(index) {
      const o = this.slotOrigin();
      const i = Math.max(0, Math.min(index, CONFIG.slotCapacity - 1));
      return { x: o.x + i * (o.tw + o.gap), y: o.y, w: o.tw, h: o.th };
    }

    ensureAudio() {
      if (this._audioCtx) return this._audioCtx;
      try {
        const AC = typeof AudioContext !== 'undefined' ? AudioContext : window.webkitAudioContext;
        if (!AC) return null;
        this._audioCtx = new AC();
      } catch (_) {
        return null;
      }
      return this._audioCtx;
    }

    /** 短促击打音：头音硬、尾音短 */
    playHitSound(pitch = 1) {
      const ctx = this.ensureAudio();
      if (!ctx) return;
      try {
        if (ctx.state === 'suspended') ctx.resume();
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(520 * pitch, t0);
        osc.frequency.exponentialRampToValueAtTime(180 * pitch, t0 + 0.045);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.11, t0 + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.08);
      } catch (_) {
        /* ignore */
      }
    }

    playTapSound() {
      const ctx = this.ensureAudio();
      if (!ctx) return;
      try {
        if (ctx.state === 'suspended') ctx.resume();
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, t0);
        osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.03);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.045, t0 + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.045);
      } catch (_) {
        /* ignore */
      }
    }

    vibrate(ms = 14) {
      try {
        if (typeof wx !== 'undefined' && wx.vibrateShort) {
          wx.vibrateShort({ type: ms > 18 ? 'medium' : 'light' });
        } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(ms);
        }
      } catch (_) {
        /* ignore */
      }
    }

    tick(now) {
      this.now = now;
      const flies = [];
      for (const f of this.fx.flies) {
        if (now - f.t0 < f.dur) {
          flies.push(f);
        } else if (f.matched && !f.burstSpawned) {
          f.burstSpawned = true;
          this.resolveMatch(f);
        }
      }
      this.fx.flies = flies;

      const bursts = [];
      for (const b of this.fx.bursts) {
        if (now - b.t0 < b.dur) bursts.push(b);
      }
      this.fx.bursts = bursts;

      const impacts = [];
      for (const im of this.fx.impacts) {
        if (now - im.t0 < im.dur) impacts.push(im);
      }
      this.fx.impacts = impacts;

      if (this.matchFlash > 0) this.matchFlash = Math.max(0, this.matchFlash - 0.09);
      if (this.slotShake > 0) this.slotShake = Math.max(0, this.slotShake - 0.12);

      // 兜底：若有遗留 matching 且没有进行中的匹配飞行动画，强制清除
      if (
        this.slotBar.hasMatching() &&
        !this.fx.flies.some((f) => f.matched && this.now - f.t0 < f.dur)
      ) {
        const pending = this.slotBar.slots
          .map((s, i) => (s.matching ? i : -1))
          .filter((i) => i >= 0);
        const group = this.slotBar.slots.find((s) => s.matching)?.matchGroup || 0;
        const icon = this.slotBar.slots[pending[0]]?.icon;
        if (pending.length >= CONFIG.matchCount && icon) {
          const popSlots = this.buildMatchPopSlots(pending.slice(0, CONFIG.matchCount), icon);
          this.slotBar.finalizeMatch(group, pending.slice(0, CONFIG.matchCount));
          this.playMatchFx(popSlots, icon);
          this.checkEnd();
        }
      }
    }

    pushHistory() {
      this.history.push({
        tiles: this.tiles.map((t) => ({ ...t })),
        slots: this.slotBar.snapshot(),
        hold: this.hold.map((h) => ({ ...h })),
        props: { ...this.props },
      });
      if (this.history.length > 30) this.history.shift();
    }

    spawnFly(icon, from, to, matched, slotIndex, matchGroup, matchIndexes, fxDone) {
      this.fx.flies.push({
        icon,
        x0: from.x,
        y0: from.y,
        x1: to.x,
        y1: to.y,
        w: from.w,
        h: from.h,
        t0: this.now || Date.now(),
        dur: matched ? 210 : 300,
        matched,
        burstSpawned: !!fxDone,
        fxDone: !!fxDone,
        slotIndex: matched ? -1 : slotIndex,
        matchGroup: matchGroup || 0,
        matchIndexes: matchIndexes || [],
      });
    }

    spawnBurst(x, y, icon, strong) {
      this.fx.bursts.push({
        x,
        y,
        icon,
        t0: this.now || Date.now(),
        dur: strong ? 200 : 160,
        strong: !!strong,
      });
    }

    spawnImpact(slots) {
      const t0 = this.now || Date.now();
      slots.forEach((s, i) => {
        this.fx.impacts.push({
          x: s.x,
          y: s.y,
          w: s.w,
          h: s.h,
          icon: s.icon,
          t0: t0 + i * 12,
          dur: 130,
        });
      });
    }

    playMatchFx(popSlots, icon) {
      if (!popSlots.length) return;

      this.combo += 1;
      const pitch = 1 + Math.min(this.combo - 1, 4) * 0.08;

      this.spawnImpact(popSlots);
      popSlots.forEach((s, i) => {
        this.spawnBurst(s.x + s.w / 2, s.y + s.h / 2, s.icon || icon, i === 1);
      });

      const mid = popSlots[Math.floor(popSlots.length / 2)];
      this.fx.bursts.push({
        x: mid.x + mid.w / 2,
        y: mid.y + mid.h / 2,
        icon: mid.icon || icon,
        t0: this.now || Date.now(),
        dur: 110,
        strong: true,
        ringOnly: true,
      });

      this.matchFlash = 1;
      this.slotShake = 1;
      this.vibrate(this.combo > 1 ? 22 : 14);
      this.playHitSound(pitch);
      this.message = this.combo > 1 ? `连消 ×${this.combo}` : '花开三联';
    }

    buildMatchPopSlots(indexes, icon) {
      return indexes.map((index) => {
        const p = this.slotPos(index);
        return { ...p, icon, index };
      });
    }

    /** 第三枚入槽后立即消除；飞行动画仅作表现，落地不再二次 commit */
    resolveMatch(fly) {
      if (fly.fxDone) return;

      const indexes =
        fly.matchIndexes && fly.matchIndexes.length
          ? fly.matchIndexes
          : this.slotBar.slots
              .map((s, i) => (s.matchGroup === fly.matchGroup ? i : -1))
              .filter((i) => i >= 0);

      const popSlots = this.buildMatchPopSlots(indexes, fly.icon);
      this.slotBar.finalizeMatch(fly.matchGroup, indexes);
      this.playMatchFx(popSlots, fly.icon);
      this.checkEnd();
    }

    afterInsert(icon, fromRect, result) {
      const destIndex = result.matched
        ? Math.max(0, Math.min(result.index, CONFIG.slotCapacity - 1))
        : Math.min(result.index, CONFIG.slotCapacity - 1);
      const dest = this.slotPos(destIndex);

      let fxDone = false;
      if (result.matched) {
        const popSlots = this.buildMatchPopSlots(result.matchIndexes, icon);
        this.slotBar.finalizeMatch(result.matchGroup, result.matchIndexes);
        this.playMatchFx(popSlots, icon);
        fxDone = true;
      } else {
        this.combo = 0;
        this.message = '';
      }

      this.spawnFly(
        icon,
        fromRect,
        dest,
        result.matched,
        result.index,
        result.matchGroup,
        result.matchIndexes,
        fxDone
      );
      this.checkEnd();
    }

    /** 飞行中的那一格先不画，避免「叠影」 */
    isSlotHiddenByFly(index) {
      return this.fx.flies.some((f) => {
        if (this.now - f.t0 >= f.dur) return false;
        return !f.matched && f.slotIndex === index;
      });
    }

    impactState(im) {
      const p = Math.min(1, (this.now - im.t0) / im.dur);
      let sx = 1;
      let sy = 1;
      let alpha = 1;
      if (p < 0.28) {
        // 压扁：横向胀、纵向缩
        const k = p / 0.28;
        sx = 1 + k * 0.28;
        sy = 1 - k * 0.42;
      } else {
        const k = (p - 0.28) / 0.72;
        sx = 1.28 - k * 0.5;
        sy = 0.58 + k * 0.2;
        alpha = 1 - k;
      }
      return { sx, sy, alpha, progress: p };
    }

    checkEnd() {
      if (this.remainingCount() === 0 && this.slotBar.length === 0 && this.hold.length === 0) {
        this.status = 'win';
        this.message = '满园 · 轻点续折';
        return;
      }
      // 有待消组时不判负，等落地同消腾位
      if (this.slotBar.isFull() && !this.slotBar.hasMatching()) {
        this.status = 'lose';
        this.message = '花台已满 · 轻点重开';
      }
    }

    tap(x, y) {
      if (this.status === 'win') {
        if (this.levelIndex < CONFIG.levels.length - 1) this.startLevel(this.levelIndex + 1);
        else this.startLevel(0);
        return;
      }
      if (this.status === 'lose') {
        this.startLevel(this.levelIndex);
        return;
      }

      const btn = this.buttons.find(
        (b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
      );
      if (btn) {
        this.useProp(btn.key);
        return;
      }

      if (this.hitHold(x, y)) return;

      // 待消组落地前不插入，保证三朵同消、槽位不错位
      if (this.slotBar.hasMatching() && this.fx.flies.some((f) => f.matched && this.now - f.t0 < f.dur)) {
        return;
      }

      const tile = findTileAt(this.tiles, x, y);
      if (!tile) return;
      if (tile.blocked) {
        this.message = '花被压住了';
        this.fx.shakes[tile.id] = (this.now || Date.now()) + 280;
        this.vibrate(8);
        return;
      }
      if (this.slotBar.isFull()) return;

      this.pushHistory();
      const fromRect = { x: tile.x, y: tile.y, w: tile.w, h: tile.h };
      tile.removed = true;
      const result = this.slotBar.insert(tile.icon, tile.id);
      refreshBlocked(this.tiles);
      this.playTapSound();
      this.vibrate(result.matched ? 10 : 6);
      this.afterInsert(tile.icon, fromRect, result);
    }

    hitHold(x, y) {
      if (!this.hold.length) return false;
      const area = this.holdArea();
      if (x < area.x || x > area.x + area.w || y < area.y || y > area.y + area.h) return false;
      if (this.slotBar.hasMatching() && this.fx.flies.some((f) => f.matched && this.now - f.t0 < f.dur)) {
        return true;
      }
      if (this.slotBar.isFull()) return true;

      this.pushHistory();
      const item = this.hold.shift();
      const fromRect = { x: area.x, y: area.y, w: area.tw, h: area.th };
      const result = this.slotBar.insert(item.icon, item.fromTileId);
      this.playTapSound();
      this.afterInsert(item.icon, fromRect, result);
      return true;
    }

    holdArea() {
      const L = this.layout();
      const tw = L.holdTw;
      const th = L.holdTh;
      const w = Math.max(this.hold.length, 1) * (tw + 5);
      return { x: L.holdX, y: L.holdY, w, h: th, tw, th };
    }

    flyState(f) {
      const p = Math.min(1, (this.now - f.t0) / f.dur);
      const e = f.matched ? easeOutBack(Math.min(1, p * 1.02)) : easeOutCubic(p);
      const lift = Math.sin(p * Math.PI) * (f.matched ? 28 : 36);
      let scale = 1 - e * 0.1;
      if (f.matched && p > 0.75) {
        // 落地前微压，衔接下一段三消击打
        scale = 0.92 - (p - 0.75) * 0.2;
      }
      return {
        x: f.x0 + (f.x1 - f.x0) * Math.min(1, e),
        y: f.y0 + (f.y1 - f.y0) * Math.min(1, e) - lift,
        scale,
        alpha: 1,
        progress: p,
        icon: f.icon,
        w: f.w,
        h: f.h,
      };
    }

    useProp(key) {
      if (key === 'restart') {
        this.startLevel(this.levelIndex);
        return;
      }
      if (this.status !== 'playing') return;

      if (key === 'undo') {
        if (this.props.undo <= 0 || this.history.length === 0) {
          this.message = '无步可悔';
          return;
        }
        const snap = this.history.pop();
        this.tiles = snap.tiles;
        this.slotBar.restore(snap.slots);
        this.hold = snap.hold;
        this.props = snap.props;
        this.props.undo -= 1;
        this.message = '已悔一步';
        this.fx.flies = [];
        this.fx.bursts = [];
        this.fx.impacts = [];
        this.combo = 0;
        refreshBlocked(this.tiles);
        return;
      }

      if (key === 'remove') {
        if (this.props.remove <= 0 || this.slotBar.length === 0) {
          this.message = '无可移之花';
          return;
        }
        this.pushHistory();
        this.props.remove -= 1;
        this.hold.push(...this.slotBar.eject(3));
        this.message = '已移花暂寄';
        return;
      }

      if (key === 'shuffle') {
        if (this.props.shuffle <= 0) {
          this.message = '洗牌已尽';
          return;
        }
        this.pushHistory();
        this.props.shuffle -= 1;
        const alive = this.tiles.filter((t) => !t.removed);
        const icons = shuffle(alive.map((t) => t.icon));
        alive.forEach((t, i) => {
          t.icon = icons[i];
        });
        refreshBlocked(this.tiles);
        this.message = '花序已乱';
      }
    }
  }

  return { Game };
});
