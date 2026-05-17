// kitcut demo — vanilla, no deps.
(() => {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- timecode: HH:MM:SS:FF @ 24 fps ---- */
  const tc = document.getElementById("tc");
  if (tc) {
    const start = performance.now();
    const pad = (n) => String(n).padStart(2, "0");
    let raf;
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const f = Math.floor((t % 1) * 24);
      const s = Math.floor(t) % 60;
      const m = Math.floor(t / 60) % 60;
      const h = Math.floor(t / 3600) % 100;
      tc.textContent = `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else tick();
    });
  }

  /* ---- wordmark splice: hover + periodic auto-cut ---- */
  const wm = document.querySelector(".wordmark");
  if (wm) {
    let lock = false;
    const cut = (hold = 520) => {
      if (lock) return;
      lock = true;
      wm.classList.add("is-cut");
      setTimeout(() => {
        wm.classList.remove("is-cut");
        setTimeout(() => (lock = false), 380);
      }, hold);
    };
    wm.addEventListener("pointerenter", () => cut());
    wm.addEventListener("focus", () => cut());
    setTimeout(() => cut(680), 900); // splice on first paint
    if (!reduced) setInterval(() => cut(440), 6200);
  }

  /* ---- copy install command ---- */
  const cmd = document.getElementById("cmd");
  const cmdc = document.getElementById("cmdc");
  if (cmd && cmdc) {
    const code = cmd.querySelector("code")?.textContent ?? "";
    cmd.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code);
        cmd.classList.add("copied");
        cmdc.textContent = "copied ✓";
        setTimeout(() => {
          cmd.classList.remove("copied");
          cmdc.textContent = "copy";
        }, 1600);
      } catch {
        cmdc.textContent = "⌘C";
      }
    });
  }

  /* ---- scroll reveal ---- */
  const targets = document.querySelectorAll(".sec-head,.patchwrap,.grid,.ruler");
  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in-view"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
    );
    targets.forEach((el) => io.observe(el));
  }
})();
