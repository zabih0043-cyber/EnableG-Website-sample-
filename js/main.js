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

  const enquiryForm = document.querySelector("[data-enquiry-form]");
  const formStatus = document.querySelector("[data-form-status]");

  if (enquiryForm && formStatus) {
    const submitButton = enquiryForm.querySelector('button[type="submit"]');
    const submitLabel = submitButton?.querySelector(".btn-label");
    const defaultLabel = submitLabel?.textContent?.trim() || "Send Enquiry";

    const clearStatus = () => {
      formStatus.hidden = true;
      formStatus.className = "form-status";
      formStatus.textContent = "";
    };

    const showStatus = (tone, message) => {
      formStatus.hidden = false;
      formStatus.className = `form-status is-${tone}`;
      formStatus.textContent = message;
    };

    const setSubmitText = (text) => {
      if (!submitButton) return;

      const label = submitButton.querySelector(".btn-label");

      if (label) {
        label.textContent = text;
        return;
      }

      submitButton.textContent = text;
    };

    const params = new URLSearchParams(window.location.search);
    const formState = params.get("form");
    const formMessage = params.get("message");

    if (formState === "success") {
      showStatus(
        "success",
        formMessage ||
          "Thank you. Your enquiry has been sent and Enable G will be in touch soon."
      );
    } else if (formState === "error") {
      showStatus(
        "error",
        formMessage || "We could not send your enquiry right now. Please try again."
      );
    }

    if (formState && window.history.replaceState) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("form");
      cleanUrl.searchParams.delete("message");
      window.history.replaceState({}, "", cleanUrl);
    }

    enquiryForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!enquiryForm.reportValidity()) return;

      clearStatus();
      setSubmitText("Sending...");

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
      }

      try {
        const response = await fetch(enquiryForm.action, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "X-Requested-With": "fetch",
          },
          body: new FormData(enquiryForm),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.ok) {
          throw new Error(
            data.message ||
              "We could not send your enquiry right now. Please try again."
          );
        }

        enquiryForm.reset();
        showStatus(
          "success",
          data.message ||
            "Thank you. Your enquiry has been sent and Enable G will be in touch soon."
        );
      } catch (error) {
        showStatus(
          "error",
          error instanceof Error
            ? error.message
            : "We could not send your enquiry right now. Please try again."
        );
      } finally {
        setSubmitText(defaultLabel);

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
        }
      }
    });
  }

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
