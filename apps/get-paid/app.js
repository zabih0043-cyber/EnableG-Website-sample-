/* ==========================================================================
   Enable G — Get Paid
   Price a job, check it is worth doing, send a quote or invoice.

   No dependencies, no build step. Everything is kept in this browser's
   local storage; nothing is uploaded anywhere.
   ========================================================================== */

(function () {
  "use strict";

  /* ----------------------------- Constants ------------------------------ */

  const STORAGE_KEY = "enableg.getpaid.v1";
  const LOCALE = "en-ZA";
  const CURRENCY = "R";

  // Matches DEFAULT_MIN_RATE in the Spending & Income Tool (SA).
  const DEFAULT_FLOOR_RATE = 150;
  const DEFAULT_VALIDITY_DAYS = 14;

  // Below this share of the floor rate a job is called out as underpaid.
  const TIGHT_THRESHOLD = 0.7;

  /* ------------------------------- State -------------------------------- */

  const emptyProfile = () => ({
    bizName: "",
    bizPhone: "",
    bizEmail: "",
    bizAddress: "",
    payDetails: "",
    floorRate: DEFAULT_FLOOR_RATE,
    defaultRate: DEFAULT_FLOOR_RATE,
    quoteValidity: DEFAULT_VALIDITY_DAYS,
  });

  const emptyJob = () => ({
    id: "job_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clientName: "",
    clientPhone: "",
    jobDate: todayISO(),
    jobTitle: "",
    mode: "hourly",
    hours: 0,
    rate: 0,
    lines: [{ desc: "", qty: 1, price: 0 }],
    unitHours: 0,
    fixedPrice: 0,
    fixedHours: 0,
    materials: 0,
    travelCost: 0,
    travelHours: 0,
    deposit: 0,
    status: "draft",
    docType: "quote",
    docNo: { quote: "", invoice: "" },
  });

  let state = {
    version: 1,
    profile: emptyProfile(),
    counters: { quote: 0, invoice: 0 },
    jobs: [],
  };

  let currentJob = null; // the job being edited or sent
  let listFilter = "all";

  /* ------------------------------ Helpers ------------------------------- */

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }

  function addDays(iso, days) {
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + days);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }

  function prettyDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(LOCALE, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function num(value) {
    const n = parseFloat(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function money(value) {
    const n = Number.isFinite(value) ? value : 0;
    const whole = Math.abs(n % 1) < 0.005;
    return (
      CURRENCY +
      Math.abs(n).toLocaleString(LOCALE, {
        minimumFractionDigits: whole ? 0 : 2,
        maximumFractionDigits: whole ? 0 : 2,
      })
    );
  }

  function signedMoney(value) {
    return (value > 0 ? "−" : "") + money(value);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]
    );
  }

  /**
   * Turn a locally-typed South African number into the international form
   * wa.me expects. Leaves anything already international alone.
   */
  function waNumber(raw) {
    let digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith("0")) digits = "27" + digits.slice(1);
    return digits;
  }

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.hidden = true;
    }, 2600);
  }

  /* ---------------------------- Persistence ----------------------------- */

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      toast("Could not save on this device.");
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      state.profile = Object.assign(emptyProfile(), parsed.profile || {});
      state.counters = Object.assign({ quote: 0, invoice: 0 }, parsed.counters || {});
      state.jobs = Array.isArray(parsed.jobs)
        ? parsed.jobs.map((j) => Object.assign(emptyJob(), j))
        : [];
    } catch (err) {
      /* A corrupt record should not stop the app from opening. */
    }
  }

  /* --------------------------- Calculations ----------------------------- */

  /**
   * The heart of the app. Works out what the client pays, what the job costs
   * to do, and what the person is genuinely left with per hour of their time.
   */
  function calculate(job) {
    const floor = num(state.profile.floorRate) || DEFAULT_FLOOR_RATE;

    let subtotal = 0;
    let workHours = 0;
    let items = [];

    if (job.mode === "hourly") {
      workHours = num(job.hours);
      const rate = num(job.rate);
      subtotal = workHours * rate;
      items.push({
        desc: job.jobTitle || "Work done",
        qty: workHours,
        unit: rate,
        amount: subtotal,
        qtyLabel: workHours ? workHours + (workHours === 1 ? " hour" : " hours") : "",
      });
    } else if (job.mode === "unit") {
      workHours = num(job.unitHours);
      (job.lines || []).forEach((line) => {
        const qty = num(line.qty);
        const price = num(line.price);
        const amount = qty * price;
        if (!line.desc && !amount) return;
        subtotal += amount;
        items.push({
          desc: line.desc || "Item",
          qty: qty,
          unit: price,
          amount: amount,
          qtyLabel: qty ? String(qty) : "",
        });
      });
    } else {
      workHours = num(job.fixedHours);
      subtotal = num(job.fixedPrice);
      items.push({
        desc: job.jobTitle || "Agreed work",
        qty: 1,
        unit: subtotal,
        amount: subtotal,
        qtyLabel: "1",
      });
    }

    const materials = num(job.materials);
    const travelCost = num(job.travelCost);
    const travelHours = num(job.travelHours);
    const deposit = Math.min(num(job.deposit), subtotal);

    const costs = materials + travelCost;
    const keep = subtotal - costs;
    const totalHours = workHours + travelHours;
    const perHour = totalHours > 0 ? keep / totalHours : 0;

    let verdict = "none";
    if (totalHours > 0 && subtotal > 0) {
      if (perHour >= floor) verdict = "good";
      else if (perHour >= floor * TIGHT_THRESHOLD) verdict = "tight";
      else verdict = "bad";
    }

    return {
      items,
      subtotal,
      materials,
      travelCost,
      travelHours,
      workHours,
      totalHours,
      costs,
      keep,
      perHour,
      deposit,
      balance: subtotal - deposit,
      floor,
      verdict,
    };
  }

  /* ------------------------------ Routing ------------------------------- */

  const VIEWS = {
    jobs: "#viewJobs",
    job: "#viewJob",
    doc: "#viewDoc",
    setup: "#viewSetup",
  };

  function show(view) {
    Object.entries(VIEWS).forEach(([name, sel]) => {
      $(sel).hidden = name !== view;
    });

    const tabFor = view === "job" ? "new" : view === "doc" ? "jobs" : view;
    $$(".tab").forEach((t) =>
      t.classList.toggle("is-active", t.dataset.go === tabFor)
    );

    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  function go(target) {
    if (target === "jobs") {
      renderJobs();
      show("jobs");
    } else if (target === "new") {
      currentJob = emptyJob();
      currentJob.rate = num(state.profile.defaultRate) || DEFAULT_FLOOR_RATE;
      fillJobForm(currentJob);
      $("#jobFormTitle").textContent = "Price a job";
      $("#btnDeleteJob").hidden = true;
      show("job");
    } else if (target === "setup") {
      fillSetupForm();
      show("setup");
    }
  }

  /* --------------------------- Jobs list view --------------------------- */

  function renderJobs() {
    const list = $("#jobList");
    const jobs = state.jobs
      .slice()
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

    const visible = jobs.filter((j) => {
      if (listFilter === "unpaid") return j.status !== "paid";
      if (listFilter === "paid") return j.status === "paid";
      return true;
    });

    // Money band — outstanding is everything sent but not yet paid.
    let outstanding = 0;
    let paidThisMonth = 0;
    const thisMonth = new Date().toISOString().slice(0, 7);

    jobs.forEach((j) => {
      const calc = calculate(j);
      if (j.status === "sent") outstanding += calc.balance;
      if (j.status === "paid" && (j.jobDate || "").slice(0, 7) === thisMonth) {
        paidThisMonth += calc.subtotal;
      }
    });

    $("#statOutstanding").textContent = money(outstanding);
    $("#statPaid").textContent = money(paidThisMonth);

    const hasAny = jobs.length > 0;
    $("#jobsEmpty").hidden = hasAny;
    list.hidden = !hasAny;

    if (!visible.length && hasAny) {
      list.innerHTML =
        '<p class="hint" style="text-align:center;padding:22px 0">Nothing here yet.</p>';
      return;
    }

    list.innerHTML = visible
      .map((job) => {
        const calc = calculate(job);
        const label =
          { draft: "Draft", sent: "Sent", paid: "Paid" }[job.status] || "Draft";
        return `
          <button class="job-card" type="button" data-job="${escapeHtml(job.id)}">
            <span class="job-main">
              <span class="job-client">${escapeHtml(job.clientName || "No name yet")}</span>
              <span class="job-desc">${escapeHtml(job.jobTitle || "No description")} &middot; ${escapeHtml(prettyDate(job.jobDate))}</span>
            </span>
            <span class="job-right">
              <span class="job-amount">${money(calc.subtotal)}</span><br />
              <span class="pill-status st-${escapeHtml(job.status)}">${label}</span>
            </span>
          </button>`;
      })
      .join("");
  }

  /* ---------------------------- Job form view --------------------------- */

  const JOB_FIELDS = [
    ["clientName", "#clientName", "text"],
    ["clientPhone", "#clientPhone", "text"],
    ["jobDate", "#jobDate", "text"],
    ["jobTitle", "#jobTitle", "text"],
    ["hours", "#hours", "number"],
    ["rate", "#rate", "number"],
    ["unitHours", "#unitHours", "number"],
    ["fixedPrice", "#fixedPrice", "number"],
    ["fixedHours", "#fixedHours", "number"],
    ["materials", "#materials", "number"],
    ["travelCost", "#travelCost", "number"],
    ["travelHours", "#travelHours", "number"],
    ["deposit", "#deposit", "number"],
  ];

  function fillJobForm(job) {
    JOB_FIELDS.forEach(([key, sel, type]) => {
      const el = $(sel);
      if (!el) return;
      const value = job[key];
      el.value = type === "number" ? (num(value) ? value : "") : value || "";
    });

    setMode(job.mode);
    renderLines(job);
    updateVerdict();
  }

  function readJobForm(job) {
    JOB_FIELDS.forEach(([key, sel, type]) => {
      const el = $(sel);
      if (!el) return;
      job[key] = type === "number" ? num(el.value) : el.value.trim();
    });

    job.lines = $$("#unitLines .line").map((row) => ({
      desc: row.querySelector(".l-desc").value.trim(),
      qty: num(row.querySelector(".l-qty").value),
      price: num(row.querySelector(".l-price").value),
    }));

    return job;
  }

  function setMode(mode) {
    if (currentJob) currentJob.mode = mode;
    $$("[data-mode]").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.mode === mode)
    );
    $("#modeHourly").hidden = mode !== "hourly";
    $("#modeUnit").hidden = mode !== "unit";
    $("#modeFixed").hidden = mode !== "fixed";
  }

  function renderLines(job) {
    const wrap = $("#unitLines");
    const lines = job.lines && job.lines.length ? job.lines : [{ desc: "", qty: 1, price: 0 }];

    wrap.innerHTML = lines
      .map(
        (line) => `
        <div class="line">
          <input class="l-desc" type="text" placeholder="What it is" value="${escapeHtml(line.desc)}" />
          <input class="l-qty" type="number" inputmode="decimal" min="0" step="1" placeholder="Qty" value="${num(line.qty) || ""}" />
          <input class="l-price" type="number" inputmode="decimal" min="0" step="10" placeholder="Price" value="${num(line.price) || ""}" />
          <button class="line-del" type="button" aria-label="Remove this item">&times;</button>
        </div>`
      )
      .join("");
  }

  function updateVerdict() {
    if (!currentJob) return;
    readJobForm(currentJob);
    const calc = calculate(currentJob);

    $("#vTotal").textContent = money(calc.subtotal);
    $("#vCosts").textContent = signedMoney(calc.costs);
    $("#vKeep").textContent = money(calc.keep);
    $("#vPerHour").innerHTML =
      money(Math.max(0, calc.perHour)) + "<small>/hr</small>";

    // The floor sits at the halfway mark, so a full bar is twice your minimum.
    const pct = Math.max(
      0,
      Math.min(100, (calc.perHour / (calc.floor * 2)) * 100)
    );
    const fill = $("#vMeter");
    fill.style.width = pct + "%";
    fill.classList.toggle("is-tight", calc.verdict === "tight");
    fill.classList.toggle("is-bad", calc.verdict === "bad");

    const badge = $("#verdictBadge");
    badge.classList.remove("is-good", "is-tight", "is-bad");

    const floorText = money(calc.floor) + "/hr";
    let badgeText = "Add your hours";
    let text =
      "Enter your hours and price to see what this job really pays you.";

    if (calc.verdict === "good") {
      badge.classList.add("is-good");
      badgeText = "Worth doing";
      text = `After materials and transport you keep ${money(calc.keep)} for ${calc.totalHours} ${calc.totalHours === 1 ? "hour" : "hours"} of your time. That is above your ${floorText} minimum.`;
    } else if (calc.verdict === "tight") {
      badge.classList.add("is-tight");
      badgeText = "Tight";
      text = `This pays ${money(calc.perHour)}/hr once materials and travel come off — under your ${floorText} minimum. Raise the price by about ${money(Math.ceil((calc.floor * calc.totalHours - calc.keep) / 10) * 10)} or cut a cost.`;
    } else if (calc.verdict === "bad") {
      badge.classList.add("is-bad");
      badgeText = "Below your rate";
      text = `You would earn ${money(calc.perHour)}/hr — well under your ${floorText} minimum. Charge at least ${money(Math.ceil((calc.floor * calc.totalHours + calc.costs) / 10) * 10)} for this job, or turn it down.`;
    }

    badge.textContent = badgeText;
    $("#verdictText").textContent = text;

    // Nudge on the rate field itself while typing.
    const rateEl = $("#rate");
    const hint = $("#rateHint");
    const rate = num(currentJob.rate);
    rateEl.classList.toggle("is-low", rate > 0 && rate < calc.floor);
    if (rate > 0 && rate < calc.floor) {
      hint.textContent = `That is below your ${floorText} minimum.`;
      hint.classList.add("is-warn");
    } else {
      hint.textContent = `Your minimum is ${floorText}. Change it under Details.`;
      hint.classList.remove("is-warn");
    }
  }

  /* --------------------------- Document view ---------------------------- */

  function nextDocNo(type) {
    state.counters[type] = (state.counters[type] || 0) + 1;
    const prefix = type === "invoice" ? "INV-" : "Q-";
    return prefix + String(state.counters[type]).padStart(4, "0");
  }

  function openDoc(job) {
    currentJob = job;
    $$("[data-doc]").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.doc === job.docType)
    );
    $$("[data-status]").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.status === job.status)
    );
    renderDoc();
    show("doc");
  }

  function renderDoc() {
    const job = currentJob;
    if (!job) return;

    const p = state.profile;
    const calc = calculate(job);
    const isInvoice = job.docType === "invoice";

    // Numbers are issued once and then kept, so a resent document matches.
    if (!job.docNo[job.docType]) {
      job.docNo[job.docType] = nextDocNo(job.docType);
      save();
    }

    $("#pBiz").textContent = p.bizName || "Your business";
    $("#pFrom").textContent = [p.bizPhone, p.bizEmail, p.bizAddress]
      .filter(Boolean)
      .join("\n");

    $("#pDocType").textContent = isInvoice ? "INVOICE" : "QUOTE";
    $("#pDocNo").textContent = job.docNo[job.docType];

    const validity = num(p.quoteValidity) || DEFAULT_VALIDITY_DAYS;
    $("#pDates").textContent = isInvoice
      ? `Date: ${prettyDate(job.jobDate)}`
      : `Date: ${prettyDate(job.jobDate)}\nValid until: ${prettyDate(addDays(job.jobDate, validity))}`;

    $("#pClient").textContent = job.clientName || "Client";
    $("#pClientPhone").textContent = job.clientPhone || "";

    $("#pRows").innerHTML = calc.items
      .map(
        (item) => `
        <tr>
          <td>${escapeHtml(item.desc)}</td>
          <td class="ta-r">${escapeHtml(item.qtyLabel)}</td>
          <td class="ta-r">${item.unit ? money(item.unit) : ""}</td>
          <td class="ta-r">${money(item.amount)}</td>
        </tr>`
      )
      .join("");

    const rows = [`<div class="ptot ptot-grand"><span>Total</span><strong>${money(calc.subtotal)}</strong></div>`];
    if (calc.deposit > 0) {
      rows.push(
        `<div class="ptot"><span>Deposit${isInvoice ? " received" : " on booking"}</span><strong>${money(calc.deposit)}</strong></div>`,
        `<div class="ptot ptot-due"><span>${isInvoice ? "Still due" : "Balance on completion"}</span><strong>${money(calc.balance)}</strong></div>`
      );
    }
    $("#pTotals").innerHTML = rows.join("");

    $("#pPay").innerHTML =
      isInvoice && p.payDetails
        ? "<strong>How to pay</strong>" + escapeHtml(p.payDetails)
        : "";

    $("#pNote").innerHTML = isInvoice
      ? "<strong>Thank you</strong>Thank you for your business."
      : `<strong>Please note</strong>This quote holds for ${validity} days. Prices may change after that.`;

    $("#sendHint").textContent = job.clientPhone
      ? `Opens WhatsApp to ${job.clientPhone}.`
      : "No client number saved — WhatsApp will ask you who to send it to.";
  }

  function docMessage() {
    const job = currentJob;
    const p = state.profile;
    const calc = calculate(job);
    const isInvoice = job.docType === "invoice";

    const lines = [];
    lines.push(`*${p.bizName || "Get Paid"}*`);
    lines.push(`${isInvoice ? "Invoice" : "Quote"} ${job.docNo[job.docType]}`);
    lines.push("");
    if (job.clientName) lines.push(`Hi ${job.clientName},`);
    lines.push(
      isInvoice
        ? "Here is your invoice:"
        : "Here is your quote:"
    );
    lines.push("");

    calc.items.forEach((item) => {
      // Only spell out the sum when there is more than one of something,
      // otherwise "1 × R900 = R900" just adds noise.
      const showSum = item.qty && item.qty !== 1 && item.unit;
      const sum = showSum ? `${item.qtyLabel} × ${money(item.unit)} = ` : "";
      lines.push(`• ${item.desc} — ${sum}${money(item.amount)}`);
    });

    lines.push("");
    lines.push(`*Total: ${money(calc.subtotal)}*`);

    if (calc.deposit > 0) {
      lines.push(`Deposit: ${money(calc.deposit)}`);
      lines.push(`${isInvoice ? "Still due" : "Balance"}: ${money(calc.balance)}`);
    }

    if (isInvoice && p.payDetails) {
      lines.push("");
      lines.push("*How to pay*");
      lines.push(p.payDetails);
    } else if (!isInvoice) {
      const validity = num(p.quoteValidity) || DEFAULT_VALIDITY_DAYS;
      lines.push("");
      lines.push(`Valid until ${prettyDate(addDays(job.jobDate, validity))}.`);
    }

    if (p.bizPhone) {
      lines.push("");
      lines.push(`Any questions, call or WhatsApp ${p.bizPhone}.`);
    }

    return lines.join("\n");
  }

  /* ----------------------------- Setup view ----------------------------- */

  const SETUP_FIELDS = [
    ["bizName", "#bizName", "text"],
    ["bizPhone", "#bizPhone", "text"],
    ["bizEmail", "#bizEmail", "text"],
    ["bizAddress", "#bizAddress", "text"],
    ["payDetails", "#payDetails", "text"],
    ["floorRate", "#floorRate", "number"],
    ["defaultRate", "#defaultRate", "number"],
    ["quoteValidity", "#quoteValidity", "number"],
  ];

  function fillSetupForm() {
    SETUP_FIELDS.forEach(([key, sel, type]) => {
      const el = $(sel);
      if (!el) return;
      const value = state.profile[key];
      el.value = type === "number" ? (num(value) ? value : "") : value || "";
    });
  }

  function readSetupForm() {
    SETUP_FIELDS.forEach(([key, sel, type]) => {
      const el = $(sel);
      if (!el) return;
      state.profile[key] = type === "number" ? num(el.value) : el.value.trim();
    });
    if (!state.profile.floorRate) state.profile.floorRate = DEFAULT_FLOOR_RATE;
    if (!state.profile.quoteValidity)
      state.profile.quoteValidity = DEFAULT_VALIDITY_DAYS;
  }

  /* ------------------------------- Events ------------------------------- */

  function bind() {
    // Navigation
    document.addEventListener("click", (e) => {
      const goBtn = e.target.closest("[data-go]");
      if (goBtn) {
        go(goBtn.dataset.go);
        return;
      }

      const jobBtn = e.target.closest("[data-job]");
      if (jobBtn) {
        const job = state.jobs.find((j) => j.id === jobBtn.dataset.job);
        if (job) openDoc(job);
        return;
      }

      const filterBtn = e.target.closest("[data-filter]");
      if (filterBtn) {
        listFilter = filterBtn.dataset.filter;
        $$("[data-filter]").forEach((b) =>
          b.classList.toggle("is-active", b === filterBtn)
        );
        renderJobs();
        return;
      }

      const modeBtn = e.target.closest("[data-mode]");
      if (modeBtn) {
        setMode(modeBtn.dataset.mode);
        updateVerdict();
        return;
      }

      const docBtn = e.target.closest("[data-doc]");
      if (docBtn && currentJob) {
        currentJob.docType = docBtn.dataset.doc;
        $$("[data-doc]").forEach((b) =>
          b.classList.toggle("is-active", b === docBtn)
        );
        renderDoc();
        save();
        return;
      }

      const statusBtn = e.target.closest("[data-status]");
      if (statusBtn && currentJob) {
        currentJob.status = statusBtn.dataset.status;
        currentJob.updatedAt = new Date().toISOString();
        $$("[data-status]").forEach((b) =>
          b.classList.toggle("is-active", b === statusBtn)
        );
        save();
        toast("Marked as " + statusBtn.textContent.toLowerCase() + ".");
        return;
      }

      if (e.target.closest(".line-del")) {
        const row = e.target.closest(".line");
        const wrap = $("#unitLines");
        if (wrap.querySelectorAll(".line").length > 1) row.remove();
        else {
          row.querySelectorAll("input").forEach((i) => (i.value = ""));
        }
        updateVerdict();
      }
    });

    // Live recalculation on the job form
    $("#viewJob").addEventListener("input", updateVerdict);

    $("#btnAddLine").addEventListener("click", () => {
      readJobForm(currentJob);
      currentJob.lines.push({ desc: "", qty: 1, price: 0 });
      renderLines(currentJob);
      updateVerdict();
    });

    // Save a job
    $("#btnSaveJob").addEventListener("click", () => {
      readJobForm(currentJob);

      if (!currentJob.clientName && !currentJob.jobTitle) {
        toast("Add a client name or what the job is.");
        return;
      }

      currentJob.updatedAt = new Date().toISOString();
      const existing = state.jobs.findIndex((j) => j.id === currentJob.id);
      if (existing >= 0) state.jobs[existing] = currentJob;
      else state.jobs.push(currentJob);

      // Remember the rate they actually use.
      if (currentJob.mode === "hourly" && num(currentJob.rate)) {
        state.profile.defaultRate = num(currentJob.rate);
      }

      save();
      openDoc(currentJob);
      toast("Job saved.");
    });

    $("#btnDeleteJob").addEventListener("click", () => {
      if (!currentJob) return;
      if (!confirm("Delete this job? This cannot be undone.")) return;
      state.jobs = state.jobs.filter((j) => j.id !== currentJob.id);
      save();
      currentJob = null;
      go("jobs");
      toast("Job deleted.");
    });

    // Sending
    $("#btnWhatsApp").addEventListener("click", () => {
      const to = waNumber(currentJob.clientPhone);
      const text = encodeURIComponent(docMessage());
      const url = to
        ? `https://wa.me/${to}?text=${text}`
        : `https://wa.me/?text=${text}`;
      window.open(url, "_blank", "noopener");

      if (currentJob.status === "draft") {
        currentJob.status = "sent";
        currentJob.updatedAt = new Date().toISOString();
        $$("[data-status]").forEach((b) =>
          b.classList.toggle("is-active", b.dataset.status === "sent")
        );
        save();
      }
    });

    $("#btnPrint").addEventListener("click", () => window.print());

    $("#btnCopy").addEventListener("click", async () => {
      const text = docMessage();
      try {
        await navigator.clipboard.writeText(text);
        toast("Message copied.");
      } catch (err) {
        // Clipboard is blocked on some phone browsers over plain http.
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          toast("Message copied.");
        } catch (err2) {
          toast("Could not copy on this browser.");
        }
        document.body.removeChild(ta);
      }
    });

    // Setup
    $("#btnSaveSetup").addEventListener("click", () => {
      readSetupForm();
      save();
      fillSetupForm();
      toast("Details saved.");
    });

    $("#btnResetAll").addEventListener("click", () => {
      if (
        !confirm(
          "Erase every job and all your details from this phone? This cannot be undone."
        )
      )
        return;
      localStorage.removeItem(STORAGE_KEY);
      state = {
        version: 1,
        profile: emptyProfile(),
        counters: { quote: 0, invoice: 0 },
        jobs: [],
      };
      currentJob = null;
      go("jobs");
      toast("Everything erased.");
    });
  }

  /* -------------------------------- Boot -------------------------------- */

  function init() {
    load();
    bind();
    renderJobs();
    show("jobs");

    if (!state.profile.bizName && !state.jobs.length) {
      $("#saveStatus").textContent = "Add your details first";
    }

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {
          /* Offline support is a bonus; the app works without it. */
        });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
