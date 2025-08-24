// Spotlight cursor effect
const spotlightOverlay = document.querySelector('.spotlight_chupao');
const spotlightSection = document.querySelector('.spotlight');

document.addEventListener('mousemove', (event) => {
  if (!spotlightOverlay || !spotlightSection) return;
  const rect = spotlightSection.getBoundingClientRect();
  const relativeX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
  const relativeY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
  spotlightOverlay.style.setProperty('--mask-x', relativeX + 'px');
  spotlightOverlay.style.setProperty('--mask-y', relativeY + 'px');
});

// Blog slider
document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("blog-track");
  const blogs = document.querySelectorAll(".blog-card");
  let current = 0;

  function updateSlide() {
    track.style.transform = `translateX(-${current * 100}%)`;
  }

  document.getElementById("nextBlog")?.addEventListener("click", () => {
    current = (current + 1) % blogs.length;
    updateSlide();
  });

  document.getElementById("prevBlog")?.addEventListener("click", () => {
    current = (current - 1 + blogs.length) % blogs.length;
    updateSlide();
  });

  updateSlide();
});

// Cursor tracking inside buttons
document.querySelectorAll("#changeBlog > *").forEach(btn => {
  btn.addEventListener("mousemove", e => {
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty("--x", `${e.clientX - rect.left}px`);
    btn.style.setProperty("--y", `${e.clientY - rect.top}px`);
  });
});

// GSAP scroll animations
gsap.registerPlugin(ScrollTrigger);

// About members sliding animation
let tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".about_members",
    start: "top 80%",
    end: "bottom 60%",
    scrub: true,
    markers: false
  }
});

tl.from(".members > div", {
  x: (i) => (i % 2 === 0 ? -200 : 200),
  opacity: 0,
  duration: 1,
  stagger: 1,
  ease: "power2.out"
});

// About page specific slide-in
if (document.body.classList.contains('about-page')) {
  gsap.utils.toArray('.about-slide').forEach((el) => {
    const fromX = el.classList.contains('from-left') ? -100 : 100;
    gsap.fromTo(el, { x: fromX, opacity: 0 }, {
      x: 0,
      opacity: 1,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      }
    });
  });
}

// Resources roadmap progression
if (document.body.classList.contains('resources-page')) {
  const key = 'void_roadmap_progress';
  const checkpoints = Array.from(document.querySelectorAll('.checkpoint'));
  const fog = document.querySelector('.fog-mask');
  const glowStop = document.getElementById('glow-stop');
  const scrollContainer = document.getElementById('road-scroll');
  const svg = document.getElementById('road-svg');
  const checkpointsWrap = document.querySelector('.checkpoints');

  const canvasWidth = svg ? parseFloat(svg.dataset.canvasWidth || '1200') : 1200;

  // Apply widths and absolute positions from data attributes
  if (svg) {
    svg.style.minWidth = canvasWidth + 'px';
  }
  if (checkpointsWrap) {
    checkpointsWrap.style.minWidth = canvasWidth + 'px';
  }
  checkpoints.forEach(cp => {
    const x = parseFloat(cp.dataset.x || '0');
    const y = parseFloat(cp.dataset.y || '60');
    cp.style.left = x + 'px';
    cp.style.top = y + '%';
  });

  function idFor(cp) { return cp.getAttribute('data-id'); }
  function branchFor(cp) { return cp.getAttribute('data-branch') || 'main'; }
  function orderFor(cp) { return parseInt(cp.getAttribute('data-order') || '0', 10); }
  function xFor(cp) { return parseFloat(cp.getAttribute('data-x') || '0'); }

  function getProgress() {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  function setProgress(progress) {
    localStorage.setItem(key, JSON.stringify(progress));
  }

  function groupByBranch() {
    const byBranch = {};
    checkpoints.forEach(cp => {
      const b = branchFor(cp);
      (byBranch[b] ||= []).push(cp);
    });
    Object.values(byBranch).forEach(arr => arr.sort((a, b) => orderFor(a) - orderFor(b)));
    return byBranch;
  }

  function wireButtons() {
    const progress = getProgress();
    const byBranch = groupByBranch();

    checkpoints.forEach(cp => {
      const done = progress.includes(idFor(cp));
      const b = branchFor(cp);
      const arr = byBranch[b] || [];
      const idx = arr.indexOf(cp);
      const prevCompleted = idx <= 0 || progress.includes(idFor(arr[idx - 1]));
      const btn = cp.querySelector('.mark-btn');

      cp.classList.toggle('locked', !(prevCompleted || done));
      btn.textContent = done ? 'Completed' : 'Mark complete';
      btn.disabled = done || !prevCompleted;
      btn.style.opacity = done ? '0.7' : (prevCompleted ? '1' : '0.5');

      btn.onclick = () => {
        if (cp.classList.contains('locked') || progress.includes(idFor(cp))) return;
        progress.push(idFor(cp));
        setProgress(progress);
        wireButtons();
        updateGlowAndFog();
        // Scroll next checkpoint into view
        const next = arr[idx + 1];
        if (next && scrollContainer) {
          const rect = next.getBoundingClientRect();
          const parentRect = scrollContainer.getBoundingClientRect();
          const delta = rect.left - parentRect.left - parentRect.width * 0.2;
          scrollContainer.scrollBy({ left: delta, behavior: 'smooth' });
        }
      };
    });
  }

  function updateGlowAndFog() {
    const progress = getProgress();
    let maxX = 0;
    checkpoints.forEach(cp => {
      if (progress.includes(idFor(cp))) {
        maxX = Math.max(maxX, xFor(cp));
      }
    });
    const pct = Math.min(100, (maxX / Math.max(1, canvasWidth)) * 100);
    if (glowStop) glowStop.setAttribute('offset', `${pct}%`);

    // Softer fog by default and lighter progression
    const totalCompleted = progress.length;
    const baseline = 65; // baseline reveal
    const extra = Math.min(25, totalCompleted * 5); // +5% per completion
    const reveal = Math.min(95, baseline + extra);
    if (fog) fog.style.setProperty('--fog-reveal', `${reveal}%`);
  }

  wireButtons();
  updateGlowAndFog();
}

// Blog reading progress bar
(function() {
  const bar = document.getElementById('read-progress');
  if (!bar) return;
  function onScroll() {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    bar.style.width = progress + '%';
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
