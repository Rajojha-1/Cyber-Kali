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
try {
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
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
  }
} catch (e) {
  // Ignore GSAP errors to keep other scripts running
}

// Resources roadmap progression
if (document.body.classList.contains('resources-page')) {
  const key = 'void_roadmap_progress';
  const checkpoints = Array.from(document.querySelectorAll('.checkpoint'));
  const fog = document.querySelector('.fog-mask');
  const glowStop = document.getElementById('glow-stop');
  const scrollContainer = document.getElementById('road-scroll');

  // Apply absolute positions from data attributes
  checkpoints.forEach(cp => {
    const xpct = parseFloat(cp.getAttribute('data-xpct') || '0');
    const ypct = parseFloat(cp.getAttribute('data-ypct') || '60');
    cp.style.left = xpct + '%';
    cp.style.top = ypct + '%';
  });

  function idFor(cp) { return cp.getAttribute('data-id'); }
  function branchFor(cp) { return cp.getAttribute('data-branch') || 'main'; }
  function orderFor(cp) { return parseInt(cp.getAttribute('data-order') || '0', 10); }

  function getProgress() { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
  function setProgress(progress) { localStorage.setItem(key, JSON.stringify(progress)); }

  function groupByBranch() {
    const byBranch = {};
    checkpoints.forEach(cp => { (byBranch[branchFor(cp)] ||= []).push(cp); });
    Object.values(byBranch).forEach(arr => arr.sort((a,b)=>orderFor(a)-orderFor(b)));
    return byBranch;
  }

  function refresh() {
    const progress = getProgress();
    const byBranch = groupByBranch();
    const rootId = (checkpoints.find(cp => branchFor(cp) === 'main' && orderFor(cp) === 0) || {}).getAttribute?.('data-id');
    const rootDone = rootId ? progress.includes(rootId) : true;

    checkpoints.forEach(cp => {
      const done = progress.includes(idFor(cp));
      const b = branchFor(cp);
      const arr = byBranch[b] || [];
      const idx = arr.indexOf(cp);
      const prevCompleted = idx <= 0 || progress.includes(idFor(arr[idx-1]));
      const requireRoot = b !== 'main';
      const unlocked = (prevCompleted || done) && (requireRoot ? rootDone : true);
      const btn = cp.querySelector('.mark-btn');
      cp.classList.toggle('locked', !unlocked);
      if (btn) {
        btn.textContent = done ? 'Completed' : 'Mark complete';
        btn.disabled = done || !unlocked;
        btn.style.opacity = done ? '0.7' : (unlocked ? '1' : '0.5');
        btn.onclick = () => {
          if (!unlocked || done) return;
          progress.push(idFor(cp));
          setProgress(progress);
          refresh();
          updateGlowAndFog();
          const next = arr[idx+1];
          if (next && scrollContainer) {
            next.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        };
      }
    });
  }

  function updateGlowAndFog() {
    const progress = getProgress();
    let pct = 0;
    checkpoints.forEach(cp => {
      if (!progress.includes(idFor(cp))) return;
      const xpct = parseFloat(cp.getAttribute('data-xpct') || '0');
      pct = Math.max(pct, xpct);
    });
    if (glowStop) glowStop.setAttribute('offset', `${pct}%`);
    if (fog) fog.style.setProperty('--fog-reveal', '90%');
  }

  refresh();
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
