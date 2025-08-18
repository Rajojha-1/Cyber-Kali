const mask = document.querySelector(".spotlight_mask"); // correct class name

document.addEventListener("mousemove", (e) => {
  const rect = mask.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  mask.style.setProperty("--mask-x", `${x}px`);
  mask.style.setProperty("--mask-y", `${y}px`);
});
