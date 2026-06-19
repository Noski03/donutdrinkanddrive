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
// Enkel animasjon når kortene kommer til syne
const observerOptions = {
  threshold: 0.1,
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

document.querySelectorAll(".price-card").forEach((card) => {
  card.style.opacity = "0";
  card.style.transform = "translateY(50px)";
  card.style.transition = "all 0.6s ease-out";
  observer.observe(card);
});
let startTime;
let timerInterval;
let isRunning = false;

const gameBtn = document.getElementById("game-btn");
const timerDisplay = document.getElementById("timer-display");
const gameMessage = document.getElementById("game-message");

gameBtn.addEventListener("click", () => {
  if (!isRunning) {
    // START SPILLET
    isRunning = true;
    gameBtn.textContent = "STOPP!";
    gameBtn.style.background = "#ff0055"; // Endre farge til rød når man skal stoppe
    gameMessage.textContent = "";

    startTime = performance.now();

    timerInterval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      timerDisplay.textContent = elapsed.toFixed(2);
    }, 10); // Oppdaterer hvert 10. millisekund for nøyaktighet
  } else {
    // STOPP SPILLET
    isRunning = false;
    clearInterval(timerInterval);
    gameBtn.textContent = "PRØV IGJEN";
    gameBtn.style.background = "#9d32a8"; // Tilbake til lilla

    const finalTime = ((performance.now() - startTime) / 1000).toFixed(2);
    timerDisplay.textContent = finalTime;

    // SJEKK OM DE TRAFF NØYAKTIG 10.00
    if (finalTime === "10.00") {
      gameMessage.textContent =
        "🎉 SYKT! Du klarte det! Ta screenshot og vis i kassa for gratis time!";
      gameMessage.style.color = "#00ffcc"; // Grønn suksess-farge
    } else {
      const diff = (finalTime - 10.0).toFixed(2);
      if (diff > 0) {
        gameMessage.textContent = `Du var ${diff} sekunder for treg!`;
      } else {
        gameMessage.textContent = `Du var ${Math.abs(diff)} sekunder for rask!`;
      }
      gameMessage.style.color = "#ff3333";
    }
  }
});
