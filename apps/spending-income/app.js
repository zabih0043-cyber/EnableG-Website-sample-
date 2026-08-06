(() => {
  "use strict";

  const WEEKS_PER_MONTH = 52 / 12;
  const DEFAULT_TARGET = 20000;
  const DEFAULT_MIN_RATE = 150;
  const STORAGE_KEY = "enable-g-spending-income-sa-v1";
  const SAVE_DEBOUNCE_MS = 240;
  const IDEA_REFRESH_DEBOUNCE_MS = 160;

  // Tier: "free" | "premium" — driven by ?tier=premium in the URL for now
  const TIER = (
    new URLSearchParams(window.location.search).get("tier") === "premium" ||
    window.location.pathname.endsWith("premium.html")
  ) ? "premium" : "free";
  const FREE_IDEAS_LIMIT = 3;
  const IDEA_REFRESH_IDS = new Set(["currentJob", "skillsList", "experienceList"]);
  const LOCALE = "en-ZA";
  const CURRENCY_SYMBOL = "R";
  const RATE_ROUNDING_STEP = 10;
  const PDF_SCRIPT_URLS = [
    "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
    "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js",
  ];
  const IDEA_LIBRARY = [
    {
      id: "admin",
      keywords: [
        "admin",
        "office",
        "data",
        "typing",
        "organizing",
        "assistant",
        "reception",
        "clerical",
        "secretary",
        "booking",
      ],
      title: "Virtual admin support",
      description: "Inbox help, booking support, quotes, & simple document work.",
      rate: 160,
      hours: 4,
    },
    {
      id: "writing",
      keywords: ["writing", "writer", "content", "copy", "cv", "resume", "editing", "proofreading"],
      title: "CV & writing support",
      description: "Help people with CVs, cover letters, bios, or short business copy.",
      rate: 200,
      hours: 3,
    },
    {
      id: "social",
      keywords: ["social", "marketing", "facebook", "instagram", "content", "tiktok", "promo", "advertising"],
      title: "Social media content help",
      description: "Create captions, basic calendars, & posting support for small brands.",
      rate: 180,
      hours: 4,
    },
    {
      id: "driving",
      keywords: ["driving", "driver", "delivery", "transport", "errand", "courier", "uber", "parcel", "van"],
      title: "Errands & delivery runs",
      description: "Offer local errands, collections, or delivery support on flexible hours.",
      rate: 140,
      hours: 5,
    },
    {
      id: "property",
      keywords: ["property", "estate", "real estate", "letting", "listing", "viewing", "realtor", "agent"],
      title: "Property admin & viewing support",
      description: "Help with listings, viewing prep, follow-up calls, & simple admin for agents or landlords.",
      rate: 180,
      hours: 4,
    },
    {
      id: "beauty",
      keywords: ["manicure", "beauty", "hair", "nails", "makeup", "braiding", "barber", "lashes", "facial"],
      title: "Mobile beauty side hustle",
      description: "Use beauty skills for home visits, event prep, or quick weekend sessions.",
      rate: 240,
      hours: 4,
    },
    {
      id: "care",
      keywords: ["child", "care", "babysit", "elder", "support", "carer", "caregiver", "nanny", "companion"],
      title: "Care support sessions",
      description: "Offer after-school care, babysitting, or practical support visits.",
      rate: 150,
      hours: 6,
    },
    {
      id: "pets",
      keywords: ["pet", "dog", "animal", "cat", "walking"],
      title: "Pet sitting & dog walking",
      description: "Turn reliability & routine into short paid visits during the week.",
      rate: 140,
      hours: 4,
    },
    {
      id: "cleaning",
      keywords: ["cleaning", "organizing", "house", "home", "laundry", "cleaner", "domestic", "housekeeping"],
      title: "Home reset & organizing",
      description: "Offer decluttering, cupboard resets, or move-in support sessions.",
      rate: 150,
      hours: 5,
    },
    {
      id: "laundry",
      keywords: ["laundry", "ironing", "washing", "linen", "uniform", "clothes"],
      title: "Laundry & ironing help",
      description: "Offer wash, fold, ironing, or linen refresh support for busy households.",
      rate: 140,
      hours: 5,
    },
    {
      id: "garden",
      keywords: ["garden", "gardening", "lawn", "mowing", "weeding", "hedge", "outdoor", "yard"],
      title: "Garden tidy & outdoor help",
      description: "Take on mowing, weeding, leaf clearing, & simple outdoor tidy-up jobs.",
      rate: 150,
      hours: 5,
    },
    {
      id: "handyman",
      keywords: ["handyman", "repair", "maintenance", "diy", "assembly", "flatpack", "fixing", "painting", "labour"],
      title: "Handy help & flat-pack assembly",
      description: "Offer simple repairs, flat-pack assembly, painting prep, & practical home setup help.",
      rate: 180,
      hours: 4,
    },
    {
      id: "tech",
      keywords: ["tech", "computer", "phone", "device", "support", "it", "setup", "wifi", "printer"],
      title: "Basic tech support",
      description: "Help with phone setup, app installs, printer issues, & troubleshooting.",
      rate: 250,
      hours: 3,
    },
    {
      id: "teaching",
      keywords: ["teach", "tutor", "school", "education", "homework", "teaching assistant", "reading", "maths", "english"],
      title: "Tutoring & homework help",
      description: "Support school learners with revision, reading, & homework structure.",
      rate: 220,
      hours: 4,
    },
    {
      id: "food",
      keywords: ["cook", "baking", "food", "meal", "kitchen", "chef", "catering", "baker", "cafe"],
      title: "Meal prep or baking orders",
      description: "Package what you make best into pre-orders for families or offices.",
      rate: 160,
      hours: 4,
    },
    {
      id: "hospitality",
      keywords: ["hospitality", "waiter", "waitress", "server", "restaurant", "bar", "catering", "event", "events"],
      title: "Event & hospitality support",
      description: "Pick up setup, serving, clearing, or hosting support for local events & functions.",
      rate: 150,
      hours: 5,
    },
    {
      id: "sewing",
      keywords: ["sewing", "alteration", "alterations", "tailor", "hemming", "stitch", "fashion"],
      title: "Clothing repairs & alterations",
      description: "Turn sewing skills into simple repairs, hemming, & clothing adjustment jobs.",
      rate: 160,
      hours: 4,
    },
    {
      id: "moving",
      keywords: ["moving", "removals", "packing", "unpacking", "furniture", "lifting"],
      title: "Moving & packing help",
      description: "Help with packing, lifting, furniture setup, & move-day support.",
      rate: 150,
      hours: 5,
    },
    {
      id: "sales",
      keywords: ["sales", "retail", "customer", "promotion", "shop", "cashier", "store", "market", "stall", "merchandising"],
      title: "Weekend sales support",
      description: "Help small businesses with pop-ups, markets, or promotion shifts.",
      rate: 140,
      hours: 5,
    },
    {
      id: "bookkeeping",
      keywords: ["bookkeeping", "bookkeeper", "accounts", "accounting", "invoice", "invoicing", "finance", "payroll", "quickbooks", "sage"],
      title: "Bookkeeping & invoice support",
      description: "Help sole traders or small businesses stay on top of invoices, receipts, and simple monthly records.",
      rate: 180,
      hours: 4,
    },
    {
      id: "translation",
      keywords: ["translation", "translator", "interpreting", "interpreter", "bilingual", "language", "arabic", "french", "spanish", "urdu"],
      title: "Translation & interpreting help",
      description: "Use language skills for document translation, call support, or short interpreting sessions.",
      rate: 220,
      hours: 3,
    },
    {
      id: "photo",
      keywords: ["photo", "photography", "photographer", "camera", "portrait", "photoshoot", "wedding", "event photo", "product photo", "editing photos"],
      title: "Photography sessions & product shots",
      description: "Offer portraits, event photos, or simple product shots for local sellers and small brands.",
      rate: 280,
      hours: 3,
    },
    {
      id: "video",
      keywords: ["video", "videography", "video editing", "editing video", "reels", "youtube", "podcast", "capcut", "premiere", "short-form"],
      title: "Video editing & short clips",
      description: "Edit reels, TikToks, YouTube clips, or simple promo videos for creators and small businesses.",
      rate: 220,
      hours: 4,
    },
    {
      id: "web",
      keywords: ["website", "wordpress", "wix", "squarespace", "shopify", "web design", "web developer", "seo", "landing page", "no-code"],
      title: "Website setup & updates",
      description: "Build simple pages, update listings, or refresh websites for local businesses that need quick support.",
      rate: 240,
      hours: 3,
    },
    {
      id: "transcription",
      keywords: ["transcription", "transcribe", "audio", "captions", "subtitles", "notes", "typing fast", "minute taking", "dictation", "proofread audio"],
      title: "Transcription & typing help",
      description: "Turn audio into notes, captions, or typed records for meetings, interviews, and online content.",
      rate: 140,
      hours: 4,
    },
    {
      id: "valeting",
      keywords: ["car wash", "valet", "valeting", "detailing", "car cleaning", "vehicle cleaning", "polish", "interior cleaning", "mobile wash", "cars"],
      title: "Car cleaning & valeting",
      description: "Offer basic mobile washes, interior cleans, and tidy-up services for busy drivers.",
      rate: 160,
      hours: 4,
    },
    {
      id: "music",
      keywords: ["music", "piano", "guitar", "singing", "voice", "violin", "drums", "music lesson", "instrument", "choir"],
      title: "Music lessons & practice support",
      description: "Teach beginner lessons or help learners with regular practice, technique, and confidence.",
      rate: 220,
      hours: 3,
    },
    {
      id: "fitness",
      keywords: ["fitness", "gym", "exercise", "workout", "coach", "personal trainer", "yoga", "pilates", "running", "wellness"],
      title: "Fitness coaching & walk sessions",
      description: "Offer beginner-friendly workouts, walking sessions, or accountability support if you have fitness experience.",
      rate: 200,
      hours: 4,
    },
    {
      id: "crafts",
      keywords: ["craft", "crochet", "knitting", "jewellery", "candles", "soap", "handmade", "etsy", "gift", "personalised"],
      title: "Craft orders & handmade gifts",
      description: "Turn making skills into paid custom orders for gifts, decorations, or personal items.",
      rate: 160,
      hours: 4,
    },
    {
      id: "housesitting",
      keywords: ["house sitting", "house sitter", "key holding", "keyholder", "home check", "property check", "airbnb", "guest check-in", "check in", "check-out"],
      title: "House sitting & key handovers",
      description: "Help with key collection, guest check-ins, and short home-check visits for landlords or travellers.",
      rate: 150,
      hours: 4,
    },
    {
      id: "calls",
      keywords: ["call handling", "customer support", "phone support", "appointment setting", "appointments", "telemarketing", "lead generation", "crm", "follow-up calls", "call centre"],
      title: "Call handling & appointment setting",
      description: "Support trades, clinics, or small businesses with call-backs, lead follow-up, and diary booking.",
      rate: 170,
      hours: 4,
    },
  ];

  const DEFAULT_IDEAS = ["admin", "driving", "cleaning", "sales"]
    .map((id) => IDEA_LIBRARY.find((idea) => idea.id === id))
    .filter(Boolean);

  function isPremium() { return TIER === "premium"; }

  function openUpgradeModal() {
    document.getElementById("upgradeModal")?.classList.add("modal-open");
  }

  function closeUpgradeModal() {
    document.getElementById("upgradeModal")?.classList.remove("modal-open");
  }

  const $ = (selector) => document.querySelector(selector);

  const elements = {
    needRent: $("#needRent"),
    needFood: $("#needFood"),
    needBills: $("#needBills"),
    needDebt: $("#needDebt"),
    needDependencies: $("#needDependencies"),
    needsTotal: $("#needsTotal"),
    salaryAfterTax: $("#salaryAfterTax"),
    hoursPerWeek: $("#hoursPerWeek"),
    currentHourlyRate: $("#currentHourlyRate"),
    currentMonthlyIncome: $("#currentMonthlyIncome"),
    targetMonthlyIncome: $("#targetMonthlyIncome"),
    minHourlyRate: $("#minHourlyRate"),
    targetMonthly: $("#targetMonthly"),
    extraIncomeNeeded: $("#extraIncomeNeeded"),
    extraHoursPerWeek: $("#extraHoursPerWeek"),
    servicesTbody: $("#servicesTbody"),
    servicesTotal: $("#servicesTotal"),
    btnAddServiceRow: $("#btnAddServiceRow"),
    btnReset: $("#btnReset"),
    btnPrint: $("#btnPrint"),
    year: $("#year"),
    saveStatus: $("#saveStatus"),
    currentJob: $("#currentJob"),
    name: $("#name"),
    date: $("#date"),
    reference: $("#reference"),
    skillsList: $("#skillsList"),
    experienceList: $("#experienceList"),
    targetHint: $("#targetHint"),
    minRateHint: $("#minRateHint"),
    incomeSyncHint: $("#incomeSyncHint"),
    heroExtraIncome: $("#heroExtraIncome"),
    heroExtraHours: $("#heroExtraHours"),
    heroServices: $("#heroServices"),
    sumNeeds: $("#sumNeeds"),
    sumHourly: $("#sumHourly"),
    sumTarget: $("#sumTarget"),
    sumExtraIncome: $("#sumExtraIncome"),
    sumExtraHours: $("#sumExtraHours"),
    sumServices: $("#sumServices"),
    sumRemainingGap: $("#sumRemainingGap"),
    sumIncomeWithServices: $("#sumIncomeWithServices"),
    summaryCurrentIncome: $("#summaryCurrentIncome"),
    summaryServicePlan: $("#summaryServicePlan"),
    summaryGoalPercent: $("#summaryGoalPercent"),
    summaryGoalFill: $("#summaryGoalFill"),
    summaryPlanMessage: $("#summaryPlanMessage"),
    planStatusBadge: $("#planStatusBadge"),
    planStatusText: $("#planStatusText"),
    goalMeterFill: $("#goalMeterFill"),
    goalProgressValue: $("#goalProgressValue"),
    gapRemainingValue: $("#gapRemainingValue"),
    totalIncomeValue: $("#totalIncomeValue"),
    needsCoverage: $("#needsCoverage"),
    needsCoverageText: $("#needsCoverageText"),
    recommendedRate: $("#recommendedRate"),
    rateGuidanceText: $("#rateGuidanceText"),
    remainingGapInline: $("#remainingGapInline"),
    remainingGapText: $("#remainingGapText"),
    servicesHoursPlanned: $("#servicesHoursPlanned"),
    servicesCoverage: $("#servicesCoverage"),
    remainingGap: $("#remainingGap"),
    serviceIdeas: $("#serviceIdeas"),
    serviceIdeasEmpty: $("#serviceIdeasEmpty"),
    nextStepsList: $("#nextStepsList"),
  };

  const staticFieldIds = [
    "name",
    "date",
    "reference",
    "currentMonthlyIncome",
    "targetMonthlyIncome",
    "needRent",
    "needFood",
    "needBills",
    "needDebt",
    "needDependencies",
    "currentJob",
    "salaryAfterTax",
    "hoursPerWeek",
    "minHourlyRate",
    "targetMonthly",
    "skillsList",
    "experienceList",
  ];

  const mirroredFields = {
    currentMonthlyIncome: "salaryAfterTax",
    salaryAfterTax: "currentMonthlyIncome",
    targetMonthlyIncome: "targetMonthly",
    targetMonthly: "targetMonthlyIncome",
  };

  let nextServiceIndex = 1;
  let saveTimer = 0;
  let ideasRefreshTimer = 0;
  let lastIdeasSignature = "";
  let pdfLibraryPromise = null;

  function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function readNumber(element) {
    if (!element) return 0;
    return toNumber(element.value);
  }

  function formatCurrency(amount) {
    const value = Number.isFinite(amount) ? amount : 0;
    const rounded = Math.round(value);
    const sign = rounded < 0 ? "-" : "";
    const formatted = Math.abs(rounded)
      .toLocaleString(LOCALE, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      .replace(/\s/g, " ");
    return `${sign}${CURRENCY_SYMBOL}${formatted}`;
  }

  function formatHours(hours) {
    const value = Number.isFinite(hours) ? hours : 0;
    const rounded = value > 0 ? Math.ceil(value) : 0;
    return rounded
      .toLocaleString(LOCALE, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      .replace(/\s/g, " ");
  }

  function formatPercent(value) {
    const safeValue = Number.isFinite(value) ? value : 0;
    const formatted = safeValue
      .toLocaleString(LOCALE, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      .replace(/\s/g, " ");
    return `${formatted}%`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function roundUpToNearestStep(value, step = 1) {
    if (value <= 0) return DEFAULT_MIN_RATE;
    return Math.ceil(value / step) * step;
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  function setMeter(node, percent) {
    if (node) node.style.width = `${clamp(percent, 0, 100)}%`;
  }

  function todayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getIncomeValue() {
    return readNumber(elements.salaryAfterTax) || readNumber(elements.currentMonthlyIncome);
  }

  function getTargetValue() {
    return readNumber(elements.targetMonthly) || readNumber(elements.targetMonthlyIncome) || DEFAULT_TARGET;
  }

  function getMinimumRateInput() {
    return readNumber(elements.minHourlyRate);
  }

  function getEffectiveMinimumRate() {
    return getMinimumRateInput() || DEFAULT_MIN_RATE;
  }

  function getServiceRows() {
    return elements.servicesTbody
      ? Array.from(elements.servicesTbody.querySelectorAll("tr.service-row"))
      : [];
  }

  function getServiceRowData(row) {
    if (!row) return { description: "", hours: 0, rate: 0, monthly: 0 };

    const description = row.querySelector('input[id^="svcDesc"]')?.value?.trim() || "";
    const hours = toNumber(row.querySelector('input[id^="svcHours"]')?.value || 0);
    const rate = toNumber(row.querySelector('input[id^="svcRate"]')?.value || 0);
    const monthly = Math.max(0, hours) * Math.max(0, rate) * WEEKS_PER_MONTH;

    return { description, hours, rate, monthly };
  }

  function createServiceRow(index, values = {}) {
    const row = document.createElement("tr");
    row.className = "service-row";
    row.dataset.index = String(index);

    row.innerHTML = `
      <td>
        <label class="sr-only" for="svcDesc${index}">Side hustle description</label>
        <input id="svcDesc${index}" type="text" placeholder="e.g. Admin" />
      </td>
      <td class="right">
        <label class="sr-only" for="svcHours${index}">Hours per week</label>
        <input id="svcHours${index}" type="number" inputmode="numeric" min="0" max="100" step="1" placeholder="0" />
      </td>
      <td class="right">
        <label class="sr-only" for="svcRate${index}">Hourly rate</label>
        <input id="svcRate${index}" type="number" inputmode="decimal" min="0" step="1" placeholder="0" />
      </td>
      <td class="right">
        <output id="svcMonthly${index}" aria-live="polite">${CURRENCY_SYMBOL}0</output>
      </td>
      <td class="right">
        <button class="btn btn-ghost btn-remove" type="button" data-action="remove-service">
          Remove
        </button>
      </td>
    `;

    row.querySelector(`#svcDesc${index}`).value = values.description || "";
    row.querySelector(`#svcHours${index}`).value =
      values.hours || values.hours === 0 ? String(values.hours) : "";
    row.querySelector(`#svcRate${index}`).value =
      values.rate || values.rate === 0 ? String(values.rate) : "";

    return row;
  }

  function getHighestServiceIndex() {
    return getServiceRows().reduce((highest, row) => {
      const current = toNumber(row.dataset.index);
      return Math.max(highest, current);
    }, 0);
  }

  function appendServiceRow(values) {
    if (!elements.servicesTbody) return null;

    const row = createServiceRow(nextServiceIndex, values);
    nextServiceIndex += 1;
    elements.servicesTbody.appendChild(row);
    updateRemoveButtons();
    return row;
  }

  function resetToSingleServiceRow() {
    if (!elements.servicesTbody) return;

    elements.servicesTbody.innerHTML = "";
    elements.servicesTbody.appendChild(createServiceRow(0));

    nextServiceIndex = Math.max(1, getHighestServiceIndex() + 1);
    updateRemoveButtons();
  }

  function updateRemoveButtons() {
    const rows = getServiceRows();

    rows.forEach((row) => {
      const button = row.querySelector('[data-action="remove-service"]');
      if (!button) return;

      if (rows.length <= 1) {
        button.disabled = true;
        button.setAttribute("aria-disabled", "true");
        button.title = "Add another side hustle before removing this row";
      } else {
        button.disabled = false;
        button.setAttribute("aria-disabled", "false");
        button.title = "Remove this side hustle";
      }
    });
  }

  function syncMirroredField(source) {
    const targetId = mirroredFields[source.id];
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (target) target.value = source.value;
  }

  function getNeedsTotal() {
    return (
      readNumber(elements.needRent) +
      readNumber(elements.needFood) +
      readNumber(elements.needBills) +
      readNumber(elements.needDebt) +
      readNumber(elements.needDependencies)
    );
  }

  function getCurrentHourlyRate(income) {
    const hours = readNumber(elements.hoursPerWeek);
    if (income <= 0 || hours <= 0) return 0;
    return income / (hours * WEEKS_PER_MONTH);
  }

  function getServicesTotals() {
    return getServiceRows().reduce(
      (totals, row) => {
        const data = getServiceRowData(row);
        setText(row.querySelector('output[id^="svcMonthly"]'), formatCurrency(data.monthly));
        totals.monthly += data.monthly;
        totals.hours += Math.max(0, data.hours);
        return totals;
      },
      { monthly: 0, hours: 0 }
    );
  }

  function buildPlanSnapshot() {
    const currentIncome = getIncomeValue();
    const targetIncome = getTargetValue();
    const needsTotal = getNeedsTotal();
    const currentHourlyRate = getCurrentHourlyRate(currentIncome);
    const minimumRateInput = getMinimumRateInput();
    const effectiveMinimumRate = getEffectiveMinimumRate();
    const services = getServicesTotals();
    const extraIncomeNeeded = Math.max(0, targetIncome - currentIncome);
    const extraHoursNeeded =
      extraIncomeNeeded > 0 ? extraIncomeNeeded / (effectiveMinimumRate * WEEKS_PER_MONTH) : 0;
    const totalIncomeWithServices = currentIncome + services.monthly;
    const remainingGap = Math.max(0, targetIncome - totalIncomeWithServices);
    const remainingServiceGap = Math.max(0, extraIncomeNeeded - services.monthly);
    const remainingServiceHours =
      remainingServiceGap > 0
        ? remainingServiceGap / (effectiveMinimumRate * WEEKS_PER_MONTH)
        : 0;
    const needsCoverage = currentIncome - needsTotal;
    const goalProgress =
      targetIncome > 0 ? clamp((totalIncomeWithServices / targetIncome) * 100, 0, 100) : 0;
    const serviceCoverage =
      extraIncomeNeeded > 0 ? clamp((services.monthly / extraIncomeNeeded) * 100, 0, 100) : 0;
    const recommendedRate = Math.max(
      DEFAULT_MIN_RATE,
      roundUpToNearestStep(currentHourlyRate || DEFAULT_MIN_RATE, RATE_ROUNDING_STEP)
    );

    return {
      currentIncome,
      targetIncome,
      needsTotal,
      currentHourlyRate,
      minimumRateInput,
      effectiveMinimumRate,
      servicesMonthly: services.monthly,
      servicesHours: services.hours,
      extraIncomeNeeded,
      extraHoursNeeded,
      totalIncomeWithServices,
      remainingGap,
      remainingServiceGap,
      remainingServiceHours,
      needsCoverage,
      goalProgress,
      serviceCoverage,
      recommendedRate,
    };
  }

  function updateStatus(plan) {
    let badgeText = "Setup needed";
    let badgeClass = "tone-neutral";
    let statusText = "Add your income, target, & rate to unlock a full plan view.";
    let summaryMessage =
      "Start with your income, needs, & weekly hours to build a realistic plan.";

    if (!plan.currentIncome) {
      badgeText = "Income needed";
      badgeClass = "tone-warning";
      statusText = "Add your current income to see the gap between where you are & your goal.";
    } else if (plan.needsCoverage < 0) {
      badgeText = "Needs not covered";
      badgeClass = "tone-danger";
      statusText = `Your current income is ${formatCurrency(
        Math.abs(plan.needsCoverage)
      )} below your monthly needs.`;
      summaryMessage =
        "Covering essentials comes first. Focus on closing the needs gap before stretching the target.";
    } else if (plan.remainingGap > 0 && plan.servicesMonthly > 0) {
      badgeText = "Plan in progress";
      badgeClass = "tone-warning";
      statusText = `Your side hustle plan has closed ${formatPercent(
        plan.serviceCoverage
      )} of the extra-income gap.`;
      summaryMessage = `You still need ${formatCurrency(
        plan.remainingGap
      )} more each month to hit the target.`;
    } else if (plan.remainingGap > 0) {
      badgeText = "Gap open";
      badgeClass = "tone-warning";
      statusText = `You need ${formatCurrency(
        plan.extraIncomeNeeded
      )} extra each month, or about ${formatHours(plan.extraHoursNeeded)} extra hours per week.`;
      summaryMessage =
        "Add one or two side hustles below to see how your target becomes more realistic.";
    } else {
      badgeText = "Target covered";
      badgeClass = "tone-success";
      statusText =
        "Your current income plus planned side hustles cover the target. Focus on consistency & scheduling.";
      summaryMessage =
        "Your plan currently meets the target. Keep checking that hours & rates stay realistic.";
    }

    if (plan.minimumRateInput > 0 && plan.minimumRateInput < DEFAULT_MIN_RATE) {
      statusText += ` Raise your minimum rate to at least ${CURRENCY_SYMBOL}${DEFAULT_MIN_RATE}/hr for a healthier plan.`;
    }

    if (elements.planStatusBadge) {
      elements.planStatusBadge.className = `status-badge ${badgeClass}`;
      elements.planStatusBadge.textContent = badgeText;
    }

    setText(elements.planStatusText, statusText);
    setText(elements.summaryPlanMessage, summaryMessage);
  }

  function updateHints(plan) {
    elements.targetMonthly?.classList.toggle(
      "input-warning",
      readNumber(elements.targetMonthly) > 0 && readNumber(elements.targetMonthly) < DEFAULT_TARGET
    );

    if (!isPremium()) {
      setText(
        elements.minRateHint,
        `Rate is fixed at ${CURRENCY_SYMBOL}${DEFAULT_MIN_RATE}/hr on the free plan. Upgrade to Premium to set a custom rate.`
      );
    } else {
      elements.minHourlyRate?.classList.toggle(
        "input-warning",
        plan.minimumRateInput > 0 && plan.minimumRateInput < DEFAULT_MIN_RATE
      );
      setText(
        elements.minRateHint,
        plan.minimumRateInput <= 0
          ? `Suggested minimum: ${CURRENCY_SYMBOL}${DEFAULT_MIN_RATE}/h based on your current earnings hourly rate.`
          : plan.minimumRateInput < DEFAULT_MIN_RATE
            ? `Rate is below ${CURRENCY_SYMBOL}${DEFAULT_MIN_RATE}/hr. Try and raise it to at least ${CURRENCY_SYMBOL}${DEFAULT_MIN_RATE}.`
            : plan.minimumRateInput > DEFAULT_MIN_RATE
              ? "Your hourly rate is good. It is above the recommended minimum."
              : "Your hourly rate is fine. It meets the recommended minimum."
      );
    }

    setText(
      elements.targetHint,
      getTargetValue() < DEFAULT_TARGET
        ? `This target is below the Enable G recommendation of ${CURRENCY_SYMBOL}20,000 per month.`
        : `Enable G recommends aiming for at least ${CURRENCY_SYMBOL}20,000 per month.`
    );

    setText(
      elements.incomeSyncHint,
      "This stays in sync with the current income field above."
    );
  }

  function buildNextSteps(plan) {
    const steps = [];

    if (!plan.currentIncome) {
      steps.push("Add your current monthly income so the app can calculate the real gap.");
    }

    if (!readNumber(elements.hoursPerWeek)) {
      steps.push("Enter weekly working hours to calculate your current hourly rate.");
    }

    if (plan.needsCoverage < 0 && plan.currentIncome > 0) {
      steps.push(
        `Close the ${formatCurrency(Math.abs(plan.needsCoverage))} gap between current income & monthly needs.`
      );
    }

    if (plan.minimumRateInput > 0 && plan.minimumRateInput < DEFAULT_MIN_RATE) {
      steps.push(`Lift your minimum side hustle rate to at least ${CURRENCY_SYMBOL}${DEFAULT_MIN_RATE}/hr.`);
    }

    if (plan.remainingServiceGap > 0 && plan.currentIncome > 0) {
      steps.push(
        `Add about ${formatHours(plan.remainingServiceHours)} more side hustle hours per week or increase pricing to close the remaining ${formatCurrency(
          plan.remainingServiceGap
        )}.`
      );
    }

    if (!elements.skillsList?.value.trim() && !elements.experienceList?.value.trim()) {
      steps.push("Add skills or past roles to unlock more targeted side hustle ideas.");
    }

    if (!steps.length) {
      steps.push("Your plan is on track. Next, confirm the schedule, customers, & pricing.");
      steps.push("Export the PDF when you are ready to share or review the plan.");
    }

    return steps.slice(0, 4);
  }

  function renderNextSteps(plan) {
    if (!elements.nextStepsList) return;

    elements.nextStepsList.innerHTML = "";
    buildNextSteps(plan).forEach((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      elements.nextStepsList.appendChild(item);
    });
  }

  function normalizeIdeaText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getIdeaProfileText() {
    return normalizeIdeaText(
      [
        elements.currentJob?.value || "",
        elements.skillsList?.value || "",
        elements.experienceList?.value || "",
      ].join(" ")
    );
  }

  function scoreIdeaMatch(idea, profileText, tokenSet) {
    let score = 0;

    idea.keywords.forEach((keyword) => {
      const normalizedKeyword = normalizeIdeaText(keyword);
      if (!normalizedKeyword) return;

      const keywordParts = normalizedKeyword.split(" ");

      if (keywordParts.length > 1) {
        if (profileText.includes(normalizedKeyword)) {
          score += 8 + keywordParts.length;
        } else if (keywordParts.every((part) => tokenSet.has(part))) {
          score += 5 + keywordParts.length;
        }
        return;
      }

      if (tokenSet.has(normalizedKeyword)) {
        score += 4;
      }
    });

    return score;
  }

  function getIdeaMatches(profileText = getIdeaProfileText()) {
    if (!profileText.trim()) return DEFAULT_IDEAS;

    const tokenSet = new Set(profileText.split(" ").filter(Boolean));
    const matches = IDEA_LIBRARY
      .map((idea, index) => ({
        idea,
        index,
        score: scoreIdeaMatch(idea, profileText, tokenSet),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, 6)
      .map((entry) => entry.idea);

    return matches.length ? matches : DEFAULT_IDEAS;
  }

  function renderIdeas(force = false) {
    if (!elements.serviceIdeas || !elements.serviceIdeasEmpty) return;

    const profileText = getIdeaProfileText();
    if (!force && profileText === lastIdeasSignature) return;

    lastIdeasSignature = profileText;
    const ideas = getIdeaMatches(profileText);
    elements.serviceIdeas.innerHTML = "";

    if (!ideas.length) {
      elements.serviceIdeasEmpty.style.display = "block";
      return;
    }

    elements.serviceIdeasEmpty.style.display = "none";

    const visibleIdeas = isPremium() ? ideas : ideas.slice(0, FREE_IDEAS_LIMIT);

    visibleIdeas.forEach((idea) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "idea-card";
      button.dataset.ideaId = idea.id;
      button.innerHTML = `
        <h4>${idea.title}</h4>
        <p>${idea.description}</p>
        <div class="idea-meta">
          <span class="idea-chip">${formatHours(idea.hours)} hrs/wk</span>
          <span class="idea-chip">${CURRENCY_SYMBOL}${idea.rate}/hr</span>
        </div>
      `;
      elements.serviceIdeas.appendChild(button);
    });

    if (!isPremium() && ideas.length > FREE_IDEAS_LIMIT) {
      const locked = document.createElement("div");
      locked.className = "idea-card-locked";
      locked.innerHTML = `
        <span class="lock-title">+ ${ideas.length - FREE_IDEAS_LIMIT} more ideas</span>
        <p class="lock-sub">Upgrade to Premium to unlock all suggestions</p>
      `;
      locked.addEventListener("click", openUpgradeModal);
      elements.serviceIdeas.appendChild(locked);
    }
  }

  function findIdeaById(id) {
    return IDEA_LIBRARY.find((idea) => idea.id === id) || null;
  }

  function getFirstEmptyServiceRow() {
    return getServiceRows().find((row) => {
      const data = getServiceRowData(row);
      return !data.description && data.hours === 0 && data.rate === 0;
    });
  }

  function applyIdeaToServices(idea) {
    if (!idea) return;

    let row = getFirstEmptyServiceRow();
    if (!row) {
      row = appendServiceRow({
        description: idea.title,
        hours: idea.hours,
        rate: idea.rate,
      });
    }

    if (!row) return;

    row.querySelector('input[id^="svcDesc"]').value = idea.title;
    row.querySelector('input[id^="svcHours"]').value = String(idea.hours);
    row.querySelector('input[id^="svcRate"]').value = String(idea.rate);

    recalcAndPersist();

    if (isPremium()) {
      const ideaBtn = elements.serviceIdeas?.querySelector(`[data-idea-id="${idea.id}"]`);
      if (ideaBtn && !ideaBtn.querySelector(".idea-added-tag")) {
        ideaBtn.classList.add("is-added");
        const tag = document.createElement("span");
        tag.className = "idea-added-tag";
        tag.textContent = `✓ Added — ${formatCurrency(idea.hours * idea.rate * WEEKS_PER_MONTH)}/month`;
        ideaBtn.insertBefore(tag, ideaBtn.firstChild);
      }
    } else {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function updateOutputs(plan) {
    setText(elements.needsTotal, formatCurrency(plan.needsTotal));
    setText(elements.sumNeeds, formatCurrency(plan.needsTotal));
    setText(elements.currentHourlyRate, formatCurrency(plan.currentHourlyRate));
    setText(elements.sumHourly, formatCurrency(plan.currentHourlyRate));
    setText(elements.extraIncomeNeeded, formatCurrency(plan.extraIncomeNeeded));
    setText(elements.sumExtraIncome, formatCurrency(plan.extraIncomeNeeded));
    setText(elements.heroExtraIncome, formatCurrency(plan.extraIncomeNeeded));
    setText(elements.extraHoursPerWeek, formatHours(plan.extraHoursNeeded));
    setText(elements.sumExtraHours, formatHours(plan.extraHoursNeeded));
    setText(elements.heroExtraHours, formatHours(plan.extraHoursNeeded));
    setText(elements.sumTarget, formatCurrency(plan.targetIncome));
    setText(elements.servicesTotal, formatCurrency(plan.servicesMonthly));
    setText(elements.sumServices, formatCurrency(plan.servicesMonthly));
    setText(elements.heroServices, formatCurrency(plan.servicesMonthly));
    setText(elements.sumRemainingGap, formatCurrency(plan.remainingGap));
    setText(elements.sumIncomeWithServices, formatCurrency(plan.totalIncomeWithServices));
    setText(elements.summaryCurrentIncome, formatCurrency(plan.currentIncome));
    setText(elements.summaryServicePlan, formatCurrency(plan.servicesMonthly));
    setText(elements.summaryGoalPercent, formatPercent(plan.goalProgress));
    setText(elements.goalProgressValue, formatPercent(plan.goalProgress));
    setText(elements.gapRemainingValue, formatCurrency(plan.remainingGap));
    setText(elements.totalIncomeValue, formatCurrency(plan.totalIncomeWithServices));
    setText(elements.needsCoverage, formatCurrency(plan.needsCoverage));
    setText(elements.recommendedRate, `${CURRENCY_SYMBOL}${plan.recommendedRate}/hr`);
    setText(elements.remainingGapInline, formatCurrency(plan.remainingGap));
    setText(elements.servicesHoursPlanned, formatHours(plan.servicesHours));
    setText(elements.servicesCoverage, formatPercent(plan.serviceCoverage));
    setText(elements.remainingGap, formatCurrency(plan.remainingGap));

    elements.needsCoverage?.classList.toggle(
      "value-negative",
      plan.currentIncome > 0 && plan.needsCoverage < 0
    );
    elements.needsCoverageText?.classList.toggle(
      "copy-negative",
      plan.currentIncome > 0 && plan.needsCoverage < 0
    );

    setMeter(elements.goalMeterFill, plan.goalProgress);
    setMeter(elements.summaryGoalFill, plan.goalProgress);

    if (plan.needsCoverage >= 0 && plan.currentIncome > 0) {
      setText(elements.needsCoverageText, "Your current income covers monthly essentials.");
    } else if (plan.currentIncome > 0) {
      setText(
        elements.needsCoverageText,
        `You are short by ${formatCurrency(Math.abs(plan.needsCoverage))} against essentials.`
      );
    } else {
      setText(
        elements.needsCoverageText,
        "Add your current income & needs to see whether essentials are covered."
      );
    }

    if (isPremium()) {
      // KPI cards
      setText(document.getElementById("kpiIncome"), formatCurrency(plan.currentIncome));
      setText(document.getElementById("kpiNeeds"), formatCurrency(plan.needsTotal));
      setText(document.getElementById("kpiRate"),
        plan.currentHourlyRate > 0 ? `${formatCurrency(plan.currentHourlyRate)}/hr` : `${CURRENCY_SYMBOL}0`);

      const disp = plan.needsCoverage;
      const kpiDisp = document.getElementById("kpiDisposable");
      if (kpiDisp) {
        kpiDisp.textContent = formatCurrency(disp);
        kpiDisp.className = `kpi-value ${disp < 0 ? "val-red" : disp > 0 ? "val-green" : "val-neutral"}`;
      }
      const kpiDispCard = document.getElementById("kpiDisposableCard");
      if (kpiDispCard) {
        kpiDispCard.className = `kpi-card ${disp < 0 ? "kpi-red" : disp > 0 ? "kpi-green" : "kpi-grey"}`;
      }

      // Goal banner
      setText(document.getElementById("goalBannerIncome"), formatCurrency(plan.currentIncome));
      setText(document.getElementById("goalBannerTarget"), formatCurrency(plan.targetIncome));
      setText(document.getElementById("goalBannerPercent"), formatPercent(plan.goalProgress));
      const bannerFill = document.getElementById("goalBannerFill");
      if (bannerFill) bannerFill.style.width = `${clamp(plan.goalProgress, 0, 100)}%`;
      setText(document.getElementById("goalBannerGap"), formatCurrency(plan.remainingGap));
      const callout = document.getElementById("goalGapCallout");
      if (callout) callout.classList.toggle("is-covered", plan.remainingGap === 0 && plan.totalIncomeWithServices > 0);
    }

    if (plan.currentHourlyRate > 0 && Math.round(plan.currentHourlyRate) >= DEFAULT_MIN_RATE) {
      setText(
        elements.rateGuidanceText,
        `Your current hourly rate is about ${formatCurrency(
          plan.currentHourlyRate
        )}. Use that as a baseline when pricing side hustles.`
      );
    } else if (plan.currentHourlyRate > 0) {
      setText(
        elements.rateGuidanceText,
        `Your current hourly rate is about ${formatCurrency(
          plan.currentHourlyRate
        )}. That is below the recommended rate, so use ${CURRENCY_SYMBOL}${plan.recommendedRate}/hr as your baseline when pricing side hustles.`
      );
    } else {
      setText(
        elements.rateGuidanceText,
        "Add weekly hours & income to estimate a fair minimum rate."
      );
    }

    if (plan.currentIncome > 0 && plan.needsCoverage < 0) {
      setText(
        elements.remainingGapText,
        `Your income does not yet cover monthly needs. You are short by ${formatCurrency(
          Math.abs(plan.needsCoverage)
        )} before the wider target gap.`
      );
    } else if (plan.remainingGap > 0 && plan.servicesMonthly > 0) {
      setText(
        elements.remainingGapText,
        `Your current side hustle plan still leaves ${formatCurrency(
          plan.remainingGap
        )} to close.`
      );
    } else if (plan.remainingGap === 0 && plan.totalIncomeWithServices > 0) {
      setText(
        elements.remainingGapText,
        "Your current income & planned side hustles now cover the target."
      );
    } else {
      setText(
        elements.remainingGapText,
        "Add side hustle lines to see how much of the target is still open."
      );
    }
  }

  function collectState() {
    const fields = staticFieldIds.reduce((result, id) => {
      const element = document.getElementById(id);
      if (element) result[id] = element.value;
      return result;
    }, {});

    const services = getServiceRows().map((row) => {
      const description = row.querySelector('input[id^="svcDesc"]')?.value || "";
      const hours = row.querySelector('input[id^="svcHours"]')?.value || "";
      const rate = row.querySelector('input[id^="svcRate"]')?.value || "";
      return {
        index: toNumber(row.dataset.index),
        description,
        hours,
        rate,
      };
    });

    return {
      fields,
      services,
      nextServiceIndex,
      savedAt: Date.now(),
    };
  }

  function updateSaveStatus(timestamp) {
    const timeLabel = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));

    const msg = `Saved locally at ${timeLabel}`;
    setText(elements.saveStatus, msg);
    setText(document.getElementById("sidebarSaveStatus"), msg);
  }

  function queueSaveState() {
    if (saveTimer) window.clearTimeout(saveTimer);

    saveTimer = window.setTimeout(() => {
      saveTimer = 0;
      saveState();
    }, SAVE_DEBOUNCE_MS);
  }

  function flushPendingSave() {
    if (!saveTimer) return;

    window.clearTimeout(saveTimer);
    saveTimer = 0;
    saveState();
  }

  function queueIdeasRefresh() {
    if (ideasRefreshTimer) window.clearTimeout(ideasRefreshTimer);

    ideasRefreshTimer = window.setTimeout(() => {
      ideasRefreshTimer = 0;
      renderIdeas();
    }, IDEA_REFRESH_DEBOUNCE_MS);
  }

  function saveState() {
    try {
      const snapshot = collectState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      updateSaveStatus(snapshot.savedAt);
    } catch (error) {
      const errMsg = "Local save is unavailable in this browser";
      setText(elements.saveStatus, errMsg);
      setText(document.getElementById("sidebarSaveStatus"), errMsg);
    }
  }

  function restoreState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;

      const saved = JSON.parse(raw);
      if (saved?.fields) {
        Object.entries(saved.fields).forEach(([id, value]) => {
          const element = document.getElementById(id);
          if (element) element.value = value;
        });
      }

      if (elements.servicesTbody && Array.isArray(saved?.services) && saved.services.length) {
        elements.servicesTbody.innerHTML = "";
        saved.services.forEach((service) => {
          elements.servicesTbody.appendChild(createServiceRow(service.index, service));
        });
      }

      nextServiceIndex = Math.max(
        toNumber(saved?.nextServiceIndex),
        getHighestServiceIndex() + 1,
        1
      );
      updateRemoveButtons();

      if (saved?.savedAt) updateSaveStatus(saved.savedAt);
      return true;
    } catch (error) {
      return false;
    }
  }

  function recalcAndPersist(options = {}) {
    const { save = true } = options;
    const plan = buildPlanSnapshot();
    updateOutputs(plan);
    updateStatus(plan);
    updateHints(plan);
    renderNextSteps(plan);
    if (save) queueSaveState();
  }

  function resetAll() {
    if (!window.confirm("Clear all fields & remove the saved local copy of this worksheet?")) {
      return;
    }

    if (saveTimer) {
      window.clearTimeout(saveTimer);
      saveTimer = 0;
    }
    if (ideasRefreshTimer) {
      window.clearTimeout(ideasRefreshTimer);
      ideasRefreshTimer = 0;
    }

    staticFieldIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      if (id === "date") {
        element.value = todayString();
      } else if (id === "targetMonthlyIncome" || id === "targetMonthly") {
        element.value = String(DEFAULT_TARGET);
      } else if (id === "minHourlyRate") {
        element.value = isPremium() ? "" : String(DEFAULT_MIN_RATE);
      } else {
        element.value = "";
      }
    });

    resetToSingleServiceRow();

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Ignore storage errors during reset.
    }

    const resetMsg = "Private & autosaved locally";
    setText(elements.saveStatus, resetMsg);
    setText(document.getElementById("sidebarSaveStatus"), resetMsg);
    lastIdeasSignature = "";
    renderIdeas(true);
    if (isPremium()) navigateTo("section-dashboard");
    recalcAndPersist();
  }

  function imageElementToDataUrl(image) {
    return new Promise((resolve, reject) => {
      if (!image) {
        reject(new Error("Missing image"));
        return;
      }

      const exportImage = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth || image.width;
          canvas.height = image.naturalHeight || image.height;
          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Canvas is not supported"));
            return;
          }

          context.drawImage(image, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (error) {
          reject(error);
        }
      };

      if (image.complete && image.naturalWidth > 0) {
        exportImage();
      } else {
        image.addEventListener("load", exportImage, { once: true });
        image.addEventListener("error", () => reject(new Error("Image failed to load")), {
          once: true,
        });
      }
    });
  }

  function loadExternalScript(src) {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript?.dataset.state === "error") {
        existingScript.remove();
      }

      const reusableScript = document.querySelector(`script[src="${src}"]`);
      if (reusableScript) {
        if (reusableScript.dataset.state === "loaded") {
          resolve();
          return;
        }

        reusableScript.addEventListener("load", () => resolve(), { once: true });
        reusableScript.addEventListener(
          "error",
          () => reject(new Error(`Failed to load ${src}`)),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.state = "loading";
      script.addEventListener(
        "load",
        () => {
          script.dataset.state = "loaded";
          resolve();
        },
        { once: true }
      );
      script.addEventListener(
        "error",
        () => {
          script.dataset.state = "error";
          reject(new Error(`Failed to load ${src}`));
        },
        { once: true }
      );
      document.head.appendChild(script);
    });
  }

  async function ensurePdfLibraries() {
    if (window.jspdf?.jsPDF) return;

    if (!pdfLibraryPromise) {
      pdfLibraryPromise = PDF_SCRIPT_URLS.reduce(
        (promise, src) => promise.then(() => loadExternalScript(src)),
        Promise.resolve()
      ).catch((error) => {
        pdfLibraryPromise = null;
        throw error;
      });
    }

    await pdfLibraryPromise;
  }

  function getPdfTextLines(plan) {
    return [
      `Total monthly needs: ${formatCurrency(plan.needsTotal)}`,
      `Current income: ${formatCurrency(plan.currentIncome)}`,
      `Current hourly rate: ${formatCurrency(plan.currentHourlyRate)}`,
      `Target monthly income: ${formatCurrency(plan.targetIncome)}`,
      `Extra income needed: ${formatCurrency(plan.extraIncomeNeeded)}`,
      `Extra hours needed per week: ${formatHours(plan.extraHoursNeeded)}`,
      `Planned side hustle income: ${formatCurrency(plan.servicesMonthly)}`,
      `Remaining gap: ${formatCurrency(plan.remainingGap)}`,
      `Income with side hustles: ${formatCurrency(plan.totalIncomeWithServices)}`,
    ];
  }

  async function exportPdf() {
    if (!isPremium()) {
      openUpgradeModal();
      return;
    }
    flushPendingSave();

    const exportButton = document.getElementById("btnPrintSidebar") || elements.btnPrint;
    const originalLabel = exportButton?.textContent || "Export PDF";
    if (exportButton) { exportButton.disabled = true; exportButton.textContent = "Preparing…"; }

    try {
      await ensurePdfLibraries();
    } catch (_) {
      if (exportButton) { exportButton.disabled = false; exportButton.textContent = originalLabel; }
      window.print();
      return;
    }

    try {
      const plan = buildPlanSnapshot();
      const jsPdfModule = window.jspdf;
      if (!jsPdfModule?.jsPDF) { window.print(); return; }

      const { jsPDF } = jsPdfModule;
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      // ── Colour palette ──────────────────────────────────
      const G    = [22, 163, 74];    // forest green
      const GD   = [21, 128, 61];    // green dark
      const INK  = [10, 15, 30];     // near-black
      const MID  = [107, 114, 128];  // grey
      const BDR  = [226, 232, 224];  // border
      const SURF = [249, 250, 251];  // surface-2
      const RED  = [220, 38, 38];
      const WHT  = [255, 255, 255];

      const PW  = doc.internal.pageSize.getWidth();   // 210 mm
      const PH  = doc.internal.pageSize.getHeight();  // 297 mm
      const ML  = 14;
      const CW  = PW - ML * 2;  // 182 mm

      const name      = elements.name?.value?.trim() || "—";
      const date      = elements.date?.value || todayString();
      const reference = elements.reference?.value?.trim() || "—";

      // ── HEADER ─────────────────────────────────────────
      let y = 13;

      // Logo
      try {
        const logoDataUrl = await imageElementToDataUrl($(".brand-logo"));
        doc.addImage(logoDataUrl, "PNG", ML, y - 3, 22, 22);
      } catch (_) {}

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...GD);
      doc.text("Spending & Income Plan", ML + 19, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MID);
      doc.text("Enable G — South Africa", ML + 19, y + 7);

      // User details (right-aligned)
      doc.setFontSize(8.5);
      doc.setTextColor(...INK);
      doc.text(name,               PW - ML, y,      { align: "right" });
      doc.setTextColor(...MID);
      doc.text(`Ref: ${reference}`, PW - ML, y + 5,  { align: "right" });
      doc.text(`Date: ${date}`,     PW - ML, y + 10, { align: "right" });

      // Green rule
      y += 15;
      doc.setDrawColor(...G);
      doc.setLineWidth(0.5);
      doc.line(ML, y, PW - ML, y);
      y += 7;

      // ── SUMMARY GRID ───────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...INK);
      doc.text("Plan summary", ML, y);
      y += 3.5;

      const stats = [
        { label: "Current income",      val: formatCurrency(plan.currentIncome),    color: plan.currentIncome > 0 ? GD : MID },
        { label: "Monthly needs",       val: formatCurrency(plan.needsTotal),        color: INK },
        { label: "Target income",       val: formatCurrency(plan.targetIncome),      color: INK },
        { label: "Extra income needed", val: formatCurrency(plan.extraIncomeNeeded), color: plan.extraIncomeNeeded > 0 ? RED : GD },
        { label: "Gap remaining",       val: formatCurrency(plan.remainingGap),      color: plan.remainingGap > 0 ? RED : GD },
        { label: "Hours/week needed",   val: `${formatHours(plan.extraHoursNeeded)} hrs`, color: INK },
      ];

      const COLS = 3;
      const BW = (CW - (COLS - 1) * 1.5) / COLS;
      const BH = 15;
      const BP = 3;

      stats.forEach((s, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const bx = ML + col * (BW + 1.5);
        const by = y + row * (BH + 2);

        doc.setFillColor(...SURF);
        doc.setDrawColor(...BDR);
        doc.setLineWidth(0.25);
        doc.rect(bx, by, BW, BH, "FD");

        // top accent line
        doc.setDrawColor(...s.color);
        doc.setLineWidth(0.8);
        doc.line(bx, by, bx + BW, by);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...MID);
        doc.text(s.label, bx + BP, by + BP + 2);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...s.color);
        doc.text(s.val, bx + BP, by + BP + 8);
      });

      y += Math.ceil(stats.length / COLS) * (BH + 2) + 5;

      // ── GOAL PROGRESS ──────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...INK);
      doc.text("Goal progress", ML, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MID);
      doc.text(`${formatPercent(plan.goalProgress)} of target covered`, ML + 30, y);
      y += 3.5;

      // Bar track
      doc.setFillColor(...BDR);
      doc.setDrawColor(...BDR);
      doc.rect(ML, y, CW, 3.5, "F");

      // Bar fill
      const fillW = (plan.goalProgress / 100) * CW;
      if (fillW > 0.5) {
        doc.setFillColor(...G);
        doc.rect(ML, y, fillW, 3.5, "F");
      }
      y += 3.5 + 2.5;

      // Bar labels
      doc.setFontSize(7);
      doc.setTextColor(...MID);
      doc.text("R0", ML, y);
      doc.text(formatCurrency(plan.targetIncome), PW - ML, y, { align: "right" });
      y += 4;

      // Gap callout
      if (plan.remainingGap > 0) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...RED);
        doc.text(`Gap remaining: ${formatCurrency(plan.remainingGap)}`, ML, y);
      } else if (plan.currentIncome > 0) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...GD);
        doc.text("Target covered — great work.", ML, y);
      }
      doc.setFont("helvetica", "normal");
      y += 8;

      // ── SHARED TABLE STYLES ─────────────────────────────
      const tStyles = {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 },
        lineColor: BDR,
        lineWidth: 0.25,
        textColor: INK,
      };
      const hStyles = { fillColor: G,    textColor: WHT, fontStyle: "bold", fontSize: 8 };
      const fStyles = { fillColor: SURF, textColor: INK, fontStyle: "bold", fontSize: 8.5 };

      // ── MONTHLY NEEDS TABLE ─────────────────────────────
      doc.autoTable({
        startY: y,
        head: [["Monthly needs", "Amount"]],
        body: [
          ["Rent / Mortgage",                   formatCurrency(readNumber(elements.needRent))],
          ["Food & living essentials",           formatCurrency(readNumber(elements.needFood))],
          ["Bills, travel, petrol, utilities",   formatCurrency(readNumber(elements.needBills))],
          ["Debt costs",                         formatCurrency(readNumber(elements.needDebt))],
          ["Dependencies / people you support",  formatCurrency(readNumber(elements.needDependencies))],
        ],
        foot: [["Total monthly needs", formatCurrency(plan.needsTotal)]],
        theme: "plain",
        headStyles: hStyles,
        footStyles: fStyles,
        styles: tStyles,
        columnStyles: { 1: { halign: "right" } },
      });

      // ── CURRENT SITUATION TABLE ─────────────────────────
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 5,
        head: [["Current situation", ""]],
        body: [
          ["Current job",          elements.currentJob?.value?.trim() || "—"],
          ["Monthly income",       formatCurrency(plan.currentIncome)],
          ["Hours per week",       `${formatHours(readNumber(elements.hoursPerWeek))} hrs`],
          ["Effective hourly rate", formatCurrency(plan.currentHourlyRate)],
        ],
        theme: "plain",
        headStyles: hStyles,
        styles: tStyles,
        columnStyles: { 1: { halign: "right" } },
      });

      // ── SIDE HUSTLE PLAN TABLE ──────────────────────────
      const svcRows = getServiceRows()
        .map((row) => {
          const d = getServiceRowData(row);
          return d.description
            ? [d.description, `${formatHours(d.hours)} hrs/wk`, formatCurrency(d.rate), formatCurrency(d.monthly)]
            : null;
        })
        .filter(Boolean);

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 5,
        head: [["Side hustle plan", "Hours/week", "Rate", "Monthly total"]],
        body: svcRows.length ? svcRows : [["No side hustles added yet", "", "", ""]],
        foot: [["Total extra income (monthly)", "", "", formatCurrency(plan.servicesMonthly)]],
        theme: "plain",
        headStyles: hStyles,
        footStyles: fStyles,
        styles: tStyles,
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      });

      // ── FOOTER ─────────────────────────────────────────
      const fy = PH - 9;
      doc.setDrawColor(...BDR);
      doc.setLineWidth(0.25);
      doc.line(ML, fy - 3, PW - ML, fy - 3);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MID);
      doc.text("© 2026 Enable G. Built for clarity, privacy & practical planning.", ML, fy);
      doc.text(`Generated on ${date}`, PW - ML, fy, { align: "right" });

      const safeName = name.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");
      doc.save(`EnableG_IncomePlan_${safeName || "User"}_${date}.pdf`);

    } finally {
      if (exportButton) { exportButton.disabled = false; exportButton.textContent = originalLabel; }
    }
  }

  function handleDocumentInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (mirroredFields[target.id]) syncMirroredField(target);
    if (IDEA_REFRESH_IDS.has(target.id)) queueIdeasRefresh();
    recalcAndPersist();
  }

  function handleServicesClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const removeButton = target.closest('[data-action="remove-service"]');
    if (!removeButton) return;

    const row = removeButton.closest("tr.service-row");
    if (!row || getServiceRows().length <= 1) return;

    row.remove();
    updateRemoveButtons();
    recalcAndPersist();
  }

  function handleIdeasClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const ideaButton = target.closest("[data-idea-id]");
    if (!ideaButton) return;

    applyIdeaToServices(findIdeaById(ideaButton.getAttribute("data-idea-id") || ""));
  }

  function ensureDefaults() {
    setText(elements.year, String(new Date().getFullYear()));

    if (elements.date && !elements.date.value) elements.date.value = todayString();
    if (elements.targetMonthlyIncome && !elements.targetMonthlyIncome.value) {
      elements.targetMonthlyIncome.value = String(DEFAULT_TARGET);
    }
    if (elements.targetMonthly && !elements.targetMonthly.value) {
      elements.targetMonthly.value = String(DEFAULT_TARGET);
    }
    nextServiceIndex = Math.max(1, getHighestServiceIndex() + 1);
    updateRemoveButtons();
  }

  function navigateTo(sectionId) {
    document.querySelectorAll(".app-section").forEach((s) => { s.hidden = true; });
    const target = document.getElementById(sectionId);
    if (target) target.hidden = false;
    document.querySelectorAll(".nav-item[data-nav]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-nav") === sectionId);
    });
    if (sectionId === "section-projections") renderProjections();
  }

  function renderProjections() {
    const tbody = document.getElementById("projectionsTbody");
    if (!tbody) return;
    const plan = buildPlanSnapshot();
    const target = plan.targetIncome;
    tbody.innerHTML = "";
    ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"].forEach((label) => {
      const total = plan.currentIncome + plan.servicesMonthly;
      const gap = Math.max(0, target - total);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${label}</td>
        <td class="proj-current">${formatCurrency(plan.currentIncome)}</td>
        <td>${formatCurrency(plan.servicesMonthly)}</td>
        <td class="${total >= target ? "proj-covered" : ""}">${formatCurrency(total)}</td>
        <td class="${gap > 0 ? "proj-gap" : "proj-covered"}">${gap > 0 ? formatCurrency(gap) : "On target"}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function initPremiumNav() {
    if (!isPremium()) return;
    document.body.classList.add("is-premium");
    document.querySelectorAll(".app-section").forEach((s) => { s.hidden = true; });
    const dashboard = document.getElementById("section-dashboard");
    if (dashboard) dashboard.hidden = false;
    document.querySelectorAll(".nav-item[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => navigateTo(btn.getAttribute("data-nav") || ""));
    });
  }

  function initTierRestrictions() {
    if (isPremium()) return;

    const tierBadge = document.getElementById("tierBadge");
    if (tierBadge) tierBadge.hidden = false;

    if (elements.minHourlyRate) {
      elements.minHourlyRate.disabled = true;
      elements.minHourlyRate.value = String(DEFAULT_MIN_RATE);
      const field = elements.minHourlyRate.closest(".field");
      if (field) {
        field.classList.add("field-locked");
        const badge = document.createElement("span");
        badge.className = "field-lock-badge";
        badge.textContent = "Premium";
        field.appendChild(badge);
      }
    }

    if (elements.btnPrint) {
      const label = document.createElement("span");
      label.className = "btn-lock-label";
      label.textContent = "Premium";
      elements.btnPrint.appendChild(label);
    }
  }

  function wireEvents() {
    document.addEventListener("input", handleDocumentInput);
    elements.servicesTbody?.addEventListener("click", handleServicesClick);
    elements.serviceIdeas?.addEventListener("click", handleIdeasClick);
    window.addEventListener("pagehide", flushPendingSave);

    elements.btnAddServiceRow?.addEventListener("click", () => {
      appendServiceRow();
      recalcAndPersist();
    });

    elements.btnReset?.addEventListener("click", resetAll);
    elements.btnPrint?.addEventListener("click", exportPdf);

    document.getElementById("btnPrintSidebar")?.addEventListener("click", exportPdf);
    document.getElementById("btnResetSidebar")?.addEventListener("click", resetAll);

    document.getElementById("upgradeModalClose")?.addEventListener("click", closeUpgradeModal);
    document.getElementById("upgradeModalConfirm")?.addEventListener("click", closeUpgradeModal);
    document.getElementById("upgradeModal")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeUpgradeModal();
    });
  }

  function init() {
    initPremiumNav();
    const restored = restoreState();
    ensureDefaults();
    initTierRestrictions();
    wireEvents();
    renderIdeas(true);

    if (!restored) {
      const initMsg = "Private & autosaved locally";
      setText(elements.saveStatus, initMsg);
      setText(document.getElementById("sidebarSaveStatus"), initMsg);
    }
    recalcAndPersist({ save: false });

    const dateEl = document.getElementById("premiumPageDate");
    if (dateEl) {
      const now = new Date();
      dateEl.textContent = now.toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      dateEl.setAttribute("datetime", now.toISOString().split("T")[0]);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
