const maskContainer = document.getElementById("mask-container");
const maskLayer = document.getElementById("mask-layer");

if (maskContainer && maskLayer) {
  let mouseX = 250,
    mouseY = 250;
  let currentX = 250,
    currentY = 250;
  let isHovering = false;

  function handleMove(e) {
    const rect = maskContainer.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    mouseX = clientX - rect.left;
    mouseY = clientY - rect.top;
  }

  maskContainer.addEventListener("mousemove", handleMove);
  maskContainer.addEventListener("mouseenter", () => (isHovering = true));
  maskContainer.addEventListener("mouseleave", () => (isHovering = false));

  maskContainer.addEventListener(
    "touchstart",
    (e) => {
      isHovering = true;
      handleMove(e);
      if (e.cancelable) e.preventDefault();
    },
    { passive: false },
  );

  maskContainer.addEventListener(
    "touchmove",
    (e) => {
      handleMove(e);
      if (e.cancelable) e.preventDefault();
    },
    { passive: false },
  );

  function animate() {
    if (isHovering) {
      let velX = mouseX - currentX;
      let velY = mouseY - currentY;

      // Easing - gjør bevegelsen myk
      currentX += velX * 0.15;
      currentY += velY * 0.15;

      // Squish-beregning basert på fart
      let stretchX = Math.min(Math.abs(velX) * 1.2, 80);
      let stretchY = Math.min(Math.abs(velY) * 1.2, 80);

      // Selve elastisiteten
      let rx = 140 + stretchX - stretchY * 0.3;
      let ry = 140 + stretchY - stretchX * 0.3;

      maskLayer.style.setProperty("--x", `${currentX}px`);
      maskLayer.style.setProperty("--y", `${currentY}px`);
      maskLayer.style.setProperty("--rx", `${rx}px`);
      maskLayer.style.setProperty("--ry", `${ry}px`);
    } else {
      // Hvis man går ut av bildet, kan vi krympe hullet
      maskLayer.style.setProperty("--rx", `0px`);
      maskLayer.style.setProperty("--ry", `0px`);
    }
    requestAnimationFrame(animate);
  }
  animate();
}
