(() => {
  const body = document.body;
  const header = document.querySelector(".site-header");
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");

  // Preloader: keep the brand splash visible briefly, then fade out on load.
  const preloader = document.getElementById("sitePreloader");
  if (preloader) {
    const MIN_VISIBLE_MS = 900;
    const startedAt = performance.now();
    let dismissed = false;

    const dismissPreloader = () => {
      if (dismissed) return;
      dismissed = true;
      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));
      window.setTimeout(() => {
        preloader.classList.add("is-hidden");
        preloader.addEventListener(
          "transitionend",
          () => preloader.remove(),
          { once: true }
        );
      }, wait);
    };

    if (document.readyState === "complete") {
      dismissPreloader();
    } else {
      window.addEventListener("load", dismissPreloader);
    }
    // Safety net in case the load event is delayed by a slow asset.
    window.setTimeout(dismissPreloader, 5000);
  }

  const syncHeader = () => {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 10);
  };

  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      body.classList.toggle("menu-open", !expanded);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        body.classList.remove("menu-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  document.querySelectorAll("[data-rail-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const rail = document.getElementById(button.dataset.railTarget);
      if (!rail) return;
      const direction = Number(button.dataset.railDir || 1);
      const amount = Math.max(rail.clientWidth * 0.82, 260);
      rail.scrollBy({ left: amount * direction, behavior: "smooth" });
    });
  });

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    reveals.forEach((item) => observer.observe(item));
  } else {
    reveals.forEach((item) => item.classList.add("is-visible"));
  }

  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  // ---- Hero swiping background slider ----
  const hero = document.querySelector("[data-hero-slider]");
  const track = hero && hero.querySelector(".hero-slide-track");
  if (hero && track && track.children.length > 1) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dotsWrap = hero.querySelector(".hero-slider-dots");
    const real = Array.from(track.children);
    const count = real.length;

    // Clone last → front and first → back for a seamless infinite loop.
    const headClone = real[count - 1].cloneNode(true);
    const tailClone = real[0].cloneNode(true);
    headClone.setAttribute("aria-hidden", "true");
    tailClone.setAttribute("aria-hidden", "true");
    track.insertBefore(headClone, real[0]);
    track.appendChild(tailClone);

    let index = 1; // first real slide (after head clone)
    const EASE = "transform 800ms cubic-bezier(.22,.61,.36,1)";

    // Per-slide headline / subline sync
    const copyEl = hero.querySelector(".hero-copy");
    const titleEl = copyEl && copyEl.querySelector("h1");
    const subEl = copyEl && copyEl.querySelector("p");
    const syncText = () => {
      if (!copyEl || !titleEl || !subEl) return;
      const slide = real[(index - 1 + count) % count];
      const title = slide.getAttribute("data-title");
      const sub = slide.getAttribute("data-sub");
      if (!title || (titleEl.textContent === title && subEl.textContent === sub)) return;
      copyEl.classList.add("is-swapping");
      window.setTimeout(() => {
        titleEl.textContent = title;
        subEl.textContent = sub;
        copyEl.classList.remove("is-swapping");
      }, 260);
    };

    const place = (animate) => {
      track.style.transition = animate ? EASE : "none";
      track.style.transform = "translateX(" + -index * 100 + "%)";
    };

    const dots = [];
    if (dotsWrap) {
      for (let i = 0; i < count; i += 1) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "hero-dot";
        dot.setAttribute("aria-label", "Go to slide " + (i + 1));
        dot.addEventListener("click", () => goTo(i + 1, true));
        dotsWrap.appendChild(dot);
        dots.push(dot);
      }
    }

    const syncDots = () => {
      const active = (index - 1 + count) % count;
      dots.forEach((d, i) => d.classList.toggle("active", i === active));
    };

    const goTo = (i, fromUser) => {
      index = i;
      place(true);
      syncDots();
      syncText();
      if (fromUser) restart();
    };

    const next = () => goTo(index + 1, false);
    const prev = () => goTo(index - 1, false);

    track.addEventListener("transitionend", () => {
      if (index >= count + 1) {
        index = 1;
        place(false);
      } else if (index <= 0) {
        index = count;
        place(false);
      }
      syncDots();
    });

    let timer = null;
    const start = () => {
      if (reduceMotion) return;
      stop();
      timer = window.setInterval(next, 2000);
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };
    const restart = () => {
      stop();
      start();
    };

    place(false);
    syncDots();
    start();

    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", start);

    // Touch / pointer swipe
    let startX = null;
    hero.addEventListener(
      "touchstart",
      (e) => {
        startX = e.touches[0].clientX;
        stop();
      },
      { passive: true }
    );
    hero.addEventListener(
      "touchend",
      (e) => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 45) (dx < 0 ? next : prev)();
        startX = null;
        start();
      },
      { passive: true }
    );
  }
})();
