
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
document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("blog-track");
  const blogs = document.querySelectorAll(".blog-card");
  let current = 0;

  function updateSlide() {
    track.style.transform = `translateX(-${current * 100}%)`;
  }

  document.getElementById("nextBlog").addEventListener("click", () => {
    current = (current + 1) % blogs.length;
    updateSlide();
  });

  document.getElementById("prevBlog").addEventListener("click", () => {
    current = (current - 1 + blogs.length) % blogs.length;
    updateSlide();
  });

  // Initialize
  updateSlide();
});
// JS to track cursor inside button
document.querySelectorAll("#changeBlog > *").forEach(btn => {
  btn.addEventListener("mousemove", e => {
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty("--x", `${e.clientX - rect.left}px`);
    btn.style.setProperty("--y", `${e.clientY - rect.top}px`);
  });
});
gsap.registerPlugin(ScrollTrigger);

// Timeline with scroll control
let tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".about_members",
    start: "top 80%",
    end: "bottom 60%",
    scrub: true,
    markers: false // set true if you want debug markers
  }
});

// Animate each child with alternating slide direction
tl.from(".members > div", {
  x: (i) => (i % 2 === 0 ? -200 : 200), // even = left, odd = right
  opacity: 0,
  duration: 1,
  stagger: 1, // spacing per scroll step
  ease: "power2.out"
});

// About page animations
if (document.body.classList.contains('about-page')) {
  gsap.registerPlugin(ScrollTrigger);
  gsap.utils.toArray('.about-slide').forEach((el, i) => {
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

// Enhanced resources logic: dynamic items, completion, glow, fog gating
if (document.body.classList.contains('resources-page')) {
  const key = 'void_roadmap_progress';
  const progress = JSON.parse(localStorage.getItem(key) || '[]');

  function updateLocks() {
    const progress = getProgress();
    checkpoints.forEach((cp, idx) => {
      const id = cp.getAttribute('data-id');
      const unlocked = idx === 0 || progress.includes(checkpoints[idx - 1].getAttribute('data-id'));
      cp.classList.toggle('locked', !unlocked);
      const btn = cp.querySelector('.mark-btn');
      if (progress.includes(id)) {
        btn.textContent = 'Completed';
        btn.disabled = true;
        btn.style.opacity = '0.7';
      }
      btn.addEventListener('click', () => {
        if (cp.classList.contains('locked')) return;
        if (!progress.includes(id)) {
          progress.push(id);
          localStorage.setItem(key, JSON.stringify(progress));
          updateLocks();
        }
      });
    });
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


