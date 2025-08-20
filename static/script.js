
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

