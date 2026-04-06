(() => {
  document.querySelectorAll(".btn").forEach((btn) => {
    if (btn.querySelector(".btn-label")) return;

    const text = btn.textContent.trim();
    if (!text) return;

    btn.textContent = "";
    const label = document.createElement("span");
    label.className = "btn-label";
    label.textContent = text;
    btn.appendChild(label);
  });

  document.querySelectorAll(".hero-frame, .page-hero-card").forEach((shell) => {
    const img = shell.querySelector("img");
    if (!img) return;

    const markReady = () => {
      shell.classList.add("media-ready");
    };

    if (img.complete && img.naturalWidth > 0) {
      markReady();
      return;
    }

    img.addEventListener("load", markReady, { once: true });
    img.addEventListener("error", markReady, { once: true });
  });

  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  document.querySelectorAll("[data-nav]").forEach(a => {
    const href = (a.getAttribute("href") || "").split("/").pop().toLowerCase();
    if (href === path) a.classList.add("active");
  });

  // mobile drawer
  const burger = document.querySelector("[data-burger]");
  const drawer = document.querySelector("[data-drawer]");
  if (burger && drawer) {
    const syncState = (isOpen) => {
      drawer.classList.toggle("open", isOpen);
      burger.setAttribute("aria-expanded", String(isOpen));
      document.body.style.overflow = isOpen ? "hidden" : "";
    };

    const close = () => {
      syncState(false);
    };
    const open = () => {
      syncState(true);
    };

    burger.addEventListener("click", () => {
      const isOpen = drawer.classList.contains("open");
      isOpen ? close() : open();
    });

    // Close drawer when clicking a link
    drawer.querySelectorAll("a").forEach(link => link.addEventListener("click", close));

    // Close on escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 980) close();
    });
  }
})();
