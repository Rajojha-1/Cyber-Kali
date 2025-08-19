
  const spotlight = document.querySelector(".spotlight_chupao");

  document.addEventListener("mousemove", (e) => {
    // Get mouse position relative to viewport
    const x = e.clientX + "px";
    const y = e.clientY + "px";

    // Update CSS variables
    spotlight.style.setProperty("--mask-x", x);
    spotlight.style.setProperty("--mask-y", y);
  });

