(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const hero = document.querySelector("[data-motion-hero]");
  const heroLayer = document.querySelector("[data-parallax-layer]");
  const progress = document.querySelector("[data-site-progress]");
  const sections = Array.from(document.querySelectorAll("[data-motion-section]"));
  const cards = Array.from(document.querySelectorAll("[data-motion-card]"));

  const showEverything = () => {
    sections.forEach((section) => section.classList.add("is-in-view"));
    body.classList.add("motion-loaded");
  };

  if (reduceMotion) {
    root.classList.add("motion-reduced");
    showEverything();
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => body.classList.add("motion-loaded"));
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in-view");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px 10%", threshold: 0.04 }
  );
  sections.forEach((section) => observer.observe(section));

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let heroVisible = true;

  const paintParallax = () => {
    currentX += (targetX - currentX) * 0.055;
    currentY += (targetY - currentY) * 0.055;
    if (heroLayer) {
      heroLayer.style.setProperty("--hero-shift-x", `${currentX.toFixed(2)}px`);
      heroLayer.style.setProperty("--hero-shift-y", `${currentY.toFixed(2)}px`);
    }
    if (heroVisible || Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
      window.requestAnimationFrame(paintParallax);
    }
  };

  if (hero && heroLayer && finePointer) {
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * -18;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * -12;
    });
    hero.addEventListener("pointerleave", () => {
      targetX = 0;
      targetY = 0;
      window.requestAnimationFrame(paintParallax);
    });
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible) window.requestAnimationFrame(paintParallax);
    }).observe(hero);
    window.requestAnimationFrame(paintParallax);
  }

  if (finePointer) {
    cards.forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        card.style.setProperty("--card-tilt-x", `${((0.5 - y) * 2.4).toFixed(2)}deg`);
        card.style.setProperty("--card-tilt-y", `${((x - 0.5) * 3.2).toFixed(2)}deg`);
        card.style.setProperty("--card-light", `${(x * 100).toFixed(1)}%`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--card-tilt-x", "0deg");
        card.style.setProperty("--card-tilt-y", "0deg");
      });
    });
  }

  let scrollTicking = false;
  const paintScroll = () => {
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const ratio = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    body.classList.toggle("site-scrolled", window.scrollY > 18);
    if (hero) {
      const heroProgress = Math.min(Math.max(window.scrollY / Math.max(hero.offsetHeight, 1), 0), 1);
      hero.style.setProperty("--hero-scroll", `${heroProgress * 26}px`);
      hero.style.setProperty("--hero-copy-scroll", `${heroProgress * -8}px`);
    }
    scrollTicking = false;
  };

  window.addEventListener("scroll", () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(paintScroll);
  }, { passive: true });
  paintScroll();

  document.querySelectorAll("[data-page-transition]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      body.classList.add("page-leaving");
      window.setTimeout(() => {
        window.location.href = link.href;
      }, 160);
    });
  });
})();
