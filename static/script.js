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

  function idFor(cp) { return cp.getAttribute('data-id'); }

  function getProgress() {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  function completedIndex() {
    const progress = getProgress();
    let highest = -1;
    checkpoints.forEach((cp, idx) => {
      if (progress.includes(idFor(cp))) highest = Math.max(highest, idx);
    });
    return highest;
  }

  function updateLocks() {
    const progress = getProgress();
    checkpoints.forEach((cp, idx) => {
      const prevCompleted = idx === 0 || progress.includes(idFor(checkpoints[idx - 1]));
      const done = progress.includes(idFor(cp));
      const btn = cp.querySelector('.mark-btn');

      cp.classList.toggle('locked', !(prevCompleted || done));
      btn.textContent = done ? 'Completed' : 'Mark complete';
      btn.disabled = done || !prevCompleted;
      btn.style.opacity = done ? '0.7' : (prevCompleted ? '1' : '0.5');

      btn.onclick = () => {
        if (cp.classList.contains('locked') || done) return;
        progress.push(idFor(cp));
        localStorage.setItem(key, JSON.stringify(progress));
        updateLocks();
        updateGlowAndFog();
      };
    });
  }

  function updateGlowAndFog() {
    const idx = completedIndex();
    const pct = checkpoints.length > 0 ? ((idx + 1) / checkpoints.length) * 100 : 0;
    if (glowStop) glowStop.setAttribute('offset', `${pct}%`);
    if (fog) fog.style.setProperty('--fog-reveal', `${Math.min(20 + pct * 0.7, 95)}%`);
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
