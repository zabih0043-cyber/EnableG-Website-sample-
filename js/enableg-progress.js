/* ═══════════════════════════════════════════
   Enable G — shared progress store

   Every tool lives on the same domain, so they all share one localStorage
   bucket. That is the whole trick: the hub can tell someone where they are
   without accounts, a database, or anything leaving their device.

   From inside a tool:
     EnableG.progress.mark("blockages", { status: "done", summary: {...} });

   From the hub:
     EnableG.progress.all();
     EnableG.progress.next(["life-balance", "blockages", ...]);
   ═══════════════════════════════════════════ */

(function (global) {
  "use strict";

  var KEY = "enableg.progress.v1";

  /* localStorage throws in private mode on some browsers, and is simply
     absent inside sandboxed frames. A tool must never break because its
     progress could not be saved, so every access is guarded. */
  function read() {
    try {
      var raw = global.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  }

  function write(data) {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      return false;
    }
  }

  var progress = {
    /** Everything we know, keyed by tool id. */
    all: function () {
      return read();
    },

    /** One tool's record, or null if untouched. */
    get: function (id) {
      return read()[id] || null;
    },

    /**
     * Record where someone is in a tool.
     * status: "started" | "done"
     * summary: anything small and JSON-safe worth showing on the hub.
     */
    mark: function (id, detail) {
      if (!id) return false;
      detail = detail || {};

      var data = read();
      var existing = data[id] || {};

      data[id] = {
        status: detail.status || existing.status || "started",
        summary:
          detail.summary !== undefined ? detail.summary : existing.summary,
        startedAt: existing.startedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return write(data);
    },

    /** Convenience wrappers, so tools do not hand-write status strings. */
    start: function (id) {
      return progress.mark(id, { status: "started" });
    },

    complete: function (id, summary) {
      return progress.mark(id, { status: "done", summary: summary });
    },

    /**
     * The first tool in `order` that is not finished — what the hub should
     * put forward as the next step. Returns null once everything is done.
     */
    next: function (order) {
      var data = read();
      for (var i = 0; i < order.length; i++) {
        var record = data[order[i]];
        if (!record || record.status !== "done") return order[i];
      }
      return null;
    },

    /** Forget one tool, or everything if no id is given. */
    clear: function (id) {
      if (!id) return write({});
      var data = read();
      delete data[id];
      return write(data);
    },

    /** True when the browser will actually keep what we save. */
    isAvailable: function () {
      try {
        var probe = KEY + ".probe";
        global.localStorage.setItem(probe, "1");
        global.localStorage.removeItem(probe);
        return true;
      } catch (err) {
        return false;
      }
    },
  };

  global.EnableG = global.EnableG || {};
  global.EnableG.progress = progress;
})(window);
