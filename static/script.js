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

  function idFor(cp) { return cp.getAttribute('data-id'); }
  function branchFor(cp) { return cp.getAttribute('data-branch') || 'main'; }
  function orderFor(cp) { return parseInt(cp.getAttribute('data-order') || '0', 10); }

  function getProgress() {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  function setProgress(progress) {
    localStorage.setItem(key, JSON.stringify(progress));
  }

  // Group checkpoints by branch and order within each
  function groupByBranch() {
    const byBranch = {};
    checkpoints.forEach(cp => {
      const b = branchFor(cp);
      (byBranch[b] ||= []).push(cp);
    });
    Object.values(byBranch).forEach(arr => arr.sort((a, b) => orderFor(a) - orderFor(b)));
    return byBranch;
  }

  function updateLocks() {
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
        updateLocks();
        updateGlowAndFog();
        // Scroll next checkpoint into view (horizontal)
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
    // Reveal only first 4-5 by default; reveal more with progress
    const byBranch = groupByBranch();
    const progress = getProgress();

    // Compute overall completion ratio by position in each branch
    let total = 0, completed = 0;
    Object.values(byBranch).forEach(arr => {
      total += arr.length;
      arr.forEach(cp => { if (progress.includes(idFor(cp))) completed++; });
    });
    const pct = total > 0 ? (completed / total) * 100 : 0;
    if (glowStop) glowStop.setAttribute('offset', `${pct}%`);

    // Fog: start after ~4 items worth of width
    // Estimate first 4 items -> about 25% reveal baseline plus progress factor
    const baseline = 25; // initial reveal
    const extra = Math.min(70, (completed * 12)); // each completion adds ~12%
    const reveal = Math.min(95, baseline + extra);
    if (fog) fog.style.setProperty('--fog-reveal', `${reveal}%`);
  }

  updateLocks();
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
