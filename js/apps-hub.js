/* ═══════════════════════════════════════════
   Enable G — Tools hub

   The registry below is the single place that knows where each tool lives.
   To connect one: set `ready: true` and point `url` at its folder.
   Everything else on the page follows from that.
   ═══════════════════════════════════════════ */

(function () {
  "use strict";

  /* The order is the recommended journey. "Your next step" walks it in
     sequence and stops at the first thing not finished. */
  var TOOLS = [
    {
      id: "life-balance",
      name: "the Life Balance Wheel",
      url: "apps/life-balance/",
      ready: false,
      nudge: "Ten areas of life, rated one to ten. It takes about five minutes and shows you where to look first.",
    },
    {
      id: "blockages",
      name: "What is blocking me",
      url: "apps/blockages/",
      ready: false,
      nudge: "Twenty questions on what is actually getting in the way, and three things to try about it.",
    },
    {
      id: "personality",
      name: "How you work",
      url: "apps/personality/",
      ready: false,
      nudge: "Twenty statements about your mindset, setbacks, and how you handle change.",
    },
    {
      id: "spending-income",
      name: "Spending & Income",
      url: "apps/spending-income/",
      ready: true,
      nudge: "Work out what your month costs, what is coming in, and how to close the gap.",
    },
    {
      id: "budget",
      name: "the Budget tool",
      url: "apps/budget/",
      ready: false,
      nudge: "Turn the numbers into a plan, with goals and an emergency fund.",
    },
    {
      id: "get-paid",
      name: "Get Paid",
      url: "apps/get-paid/",
      ready: true,
      nudge: "Price a job properly, check it is worth taking, then send the quote.",
    },
    {
      id: "progress-tracker",
      name: "the Progress Tracker",
      url: "apps/progress-tracker/",
      ready: false,
      nudge: "Set a few goals and check in weekly to see whether things are moving.",
    },
  ];

  var byId = {};
  TOOLS.forEach(function (tool) {
    byId[tool.id] = tool;
  });

  var LABELS = {
    new: "Not started",
    started: "In progress",
    done: "Done",
  };

  var progress =
    (window.EnableG && window.EnableG.progress) || null;

  /* ── Cards ─────────────────────────────────────────────────────── */

  function paintCard(card) {
    var id = card.getAttribute("data-tool");
    var tool = byId[id];
    if (!tool) return;

    var record = progress ? progress.get(id) : null;
    var state = record ? record.status : "new";

    var badge = card.querySelector(".status");
    if (badge) {
      badge.setAttribute("data-state", state);
      badge.textContent = LABELS[state] || LABELS.new;
    }

    /* A one-line result, if the tool left one behind. */
    var result = card.querySelector("[data-result]");
    if (result) {
      var headline =
        record && record.summary && record.summary.headline
          ? record.summary.headline
          : null;
      if (headline) {
        result.textContent = headline;
        result.hidden = false;
      } else {
        result.hidden = true;
      }
    }

    card.setAttribute("data-ready", String(tool.ready));

    var launch = card.querySelector("[data-launch]");
    if (!launch) return;

    if (!tool.ready) {
      /* Honest about what is not connected yet, rather than a dead link. */
      launch.classList.remove("btn-primary");
      launch.classList.add("btn-secondary");
      launch.textContent = "Coming shortly";
      launch.setAttribute("aria-disabled", "true");
      launch.setAttribute("href", "#");
      launch.addEventListener("click", function (e) {
        e.preventDefault();
      });
      return;
    }

    launch.setAttribute("href", tool.url);
    launch.textContent =
      state === "done" ? "Do it again" : state === "started" ? "Continue" : "Start";

    /* Opening a tool counts as starting it, so a half-finished session is
       not shown as untouched when someone comes back. */
    launch.addEventListener("click", function () {
      if (progress && state === "new") progress.start(id);
    });
  }

  /* ── "Your next step" ──────────────────────────────────────────── */

  function paintNextStep() {
    var panel = document.querySelector("[data-next-step]");
    if (!panel || !progress) return;

    var order = TOOLS.filter(function (t) {
      return t.ready;
    }).map(function (t) {
      return t.id;
    });

    /* Nothing is connected yet — no honest suggestion to make. */
    if (!order.length) return;

    var nextId = progress.next(order);
    var title = panel.querySelector("[data-next-title]");
    var copy = panel.querySelector("[data-next-copy]");
    var link = panel.querySelector("[data-next-link]");

    if (!nextId) {
      title.textContent = "You have been through all of them.";
      copy.textContent =
        "Worth coming back to these in six weeks. The useful part is what changes, not the first score.";
      link.textContent = "Open the tracker";
      link.setAttribute("href", byId["progress-tracker"].url);
      panel.hidden = false;
      return;
    }

    var tool = byId[nextId];
    var record = progress.get(nextId);
    var resumed = record && record.status === "started";

    title.textContent = resumed
      ? "Pick up " + tool.name + " where you left off."
      : "Start with " + tool.name + ".";
    copy.textContent = tool.nudge;
    link.textContent = resumed ? "Continue" : "Start";
    link.setAttribute("href", tool.url);
    panel.hidden = false;
  }

  /* ── Boot ──────────────────────────────────────────────────────── */

  function init() {
    document.querySelectorAll("[data-tool]").forEach(function (el) {
      /* The companion block puts data-tool on the button itself. */
      if (el.classList.contains("tool-card")) paintCard(el);
      else if (el.hasAttribute("data-launch")) {
        var tool = byId[el.getAttribute("data-tool")];
        if (tool && tool.ready) {
          el.setAttribute("href", tool.url);
        } else if (tool) {
          el.classList.remove("btn-primary");
          el.classList.add("btn-secondary");
          el.textContent = "Coming shortly";
          el.setAttribute("aria-disabled", "true");
          el.addEventListener("click", function (e) {
            e.preventDefault();
          });
        }
      }
    });

    paintNextStep();

    /* Only mention on-device storage if it is actually doing something. */
    var note = document.querySelector("[data-storage-note]");
    if (note && progress && progress.isAvailable()) note.hidden = false;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
