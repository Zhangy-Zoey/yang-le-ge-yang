/**
 * 底部卡槽：容量 7，同图案聚拢，满 3 消除
 * 匹配先标记 matching，等第三枚飞入后再 commit，保证三朵同消
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const { CONFIG } = require('./config');
    module.exports = factory(CONFIG);
  } else {
    Object.assign(root, factory(root.CONFIG));
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (CONFIG) {
  let matchSeq = 1;

  class SlotBar {
    constructor() {
      this.slots = [];
      this.capacity = CONFIG.slotCapacity;
    }

    get length() {
      return this.slots.length;
    }

    isFull() {
      return this.slots.length >= this.capacity;
    }

    hasMatching() {
      return this.slots.some((s) => s.matching);
    }

    clear() {
      this.slots = [];
    }

    insert(icon, fromTileId) {
      let insertAt = this.slots.length;
      for (let i = this.slots.length - 1; i >= 0; i--) {
        if (this.slots[i].icon === icon && !this.slots[i].matching) {
          insertAt = i + 1;
          break;
        }
      }
      this.slots.splice(insertAt, 0, {
        icon,
        fromTileId,
        matching: false,
        matchGroup: 0,
      });
      const match = this.markMatch(icon);
      return {
        matched: !!match,
        index: insertAt,
        matchIndexes: match ? match.indexes : [],
        matchGroup: match ? match.groupId : 0,
      };
    }

    /** 标记三消，不立刻 splice，留给飞入落地时一起清 */
    markMatch(icon) {
      const indexes = [];
      this.slots.forEach((s, i) => {
        if (s.icon === icon && !s.matching) indexes.push(i);
      });
      if (indexes.length < CONFIG.matchCount) return null;
      const matchIndexes = indexes.slice(0, CONFIG.matchCount);
      const groupId = matchSeq++;
      matchIndexes.forEach((i) => {
        this.slots[i].matching = true;
        this.slots[i].matchGroup = groupId;
      });
      return { indexes: matchIndexes, groupId };
    }

    /** 真正移除匹配组；groupId 失效时按 indexes 兜底，避免三同卡住 */
    commitMatch(groupId) {
      const indexes = [];
      this.slots.forEach((s, i) => {
        if (s.matching && s.matchGroup === groupId) indexes.push(i);
      });
      const take = indexes.sort((a, b) => a - b);
      const cleared = take.map((i) => ({
        icon: this.slots[i].icon,
        index: i,
      }));
      for (let i = take.length - 1; i >= 0; i--) {
        this.slots.splice(take[i], 1);
      }
      return cleared;
    }

    finalizeMatch(groupId, indexes) {
      const cleared = groupId ? this.commitMatch(groupId) : [];
      if (cleared.length >= CONFIG.matchCount) return cleared;

      const pending = (indexes && indexes.length
        ? indexes.slice()
        : this.slots.map((s, i) => (s.matching ? i : -1)).filter((i) => i >= 0)
      )
        .sort((a, b) => a - b)
        .slice(0, CONFIG.matchCount);

      const out = pending
        .filter((i) => i >= 0 && i < this.slots.length)
        .map((i) => ({ icon: this.slots[i].icon, index: i }));

      for (let i = pending.length - 1; i >= 0; i--) {
        const idx = pending[i];
        if (idx >= 0 && idx < this.slots.length) this.slots.splice(idx, 1);
      }
      return out.length ? out : cleared;
    }

    eject(count = 3) {
      if (this.slots.length === 0) return [];
      const out = [];
      let i = 0;
      while (i < this.slots.length && out.length < count) {
        if (!this.slots[i].matching) {
          out.push(this.slots.splice(i, 1)[0]);
        } else {
          i += 1;
        }
      }
      return out;
    }

    snapshot() {
      return this.slots.map((s) => ({ ...s }));
    }

    restore(snap) {
      this.slots = snap.map((s) => ({
        ...s,
        matching: !!s.matching,
        matchGroup: s.matchGroup || 0,
      }));
    }
  }

  return { SlotBar };
});
