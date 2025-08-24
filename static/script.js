
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


