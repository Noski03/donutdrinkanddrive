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

// Ett felles SheetBest-ark for booking, spillforsøk og vinnere.
const SHARED_SHEETBEST_URL =
  "https://api.sheetbest.com/sheets/17766096-0f6c-4f4a-b242-ac824a3d6585";
const MAX_DAILY_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 24 * 60 * 60 * 1000;
const GAME_ATTEMPT_TYPE = "10-second-attempt";
const GAME_WIN_CLAIM_TYPE = "10-second-win-claim";
const GAME_QUERY_PARAMS = new URLSearchParams(window.location.search);
const GAME_TEST_MODE = GAME_QUERY_PARAMS.has("testwin");
const GAME_GIFT_CARD_MODE = GAME_QUERY_PARAMS.has("giftcard");

let startTime;
let timerInterval;
let isRunning = false;
let pendingWinSubmission = false;
let pendingResultTime = "";
let pendingWinCode = "";
let latestGameState = null;

const gameBtn = document.getElementById("game-btn");
const timerDisplay = document.getElementById("timer-display");
const gameMessage = document.getElementById("game-message");
const attemptCounter = document.getElementById("attempt-counter");
const winFormSection = document.getElementById("win-form-section");
const winForm = document.getElementById("win-form");
const winSubmitBtn = document.getElementById("win-submit");
const winStatus = document.getElementById("win-status");
const winResultTime = document.getElementById("win-result-time");
const winAttemptsUsed = document.getElementById("win-attempts-used");

function parseSheetTimestamp(entry) {
  const rawTimestamp =
    entry.submitted_at ||
    entry.created_at ||
    entry.attempted_at ||
    entry.timestamp ||
    entry.date_time ||
    entry.date ||
    "";
  const parsedTimestamp = Date.parse(rawTimestamp);

  return Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp;
}

function formatRemainingTime(milliseconds) {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} t ${minutes} min`;
  }

  return `${minutes} min`;
}

async function fetchSheetEntries() {
  const response = await fetch(SHARED_SHEETBEST_URL);

  if (!response.ok) {
    throw new Error("Kunne ikke hente data fra SheetBest");
  }

  const entries = await response.json();
  return Array.isArray(entries) ? entries : [];
}

function getRecentGameAttempts(entries, now = Date.now()) {
  return entries.filter((entry) => {
    if (entry.type !== GAME_ATTEMPT_TYPE) {
      return false;
    }

    const timestamp = parseSheetTimestamp(entry);
    return timestamp > 0 && now - timestamp < ATTEMPT_WINDOW_MS;
  });
}

function getLockoutMessage(attempts, now = Date.now()) {
  if (attempts.length < MAX_DAILY_ATTEMPTS) {
    return "";
  }

  const oldestAttempt = Math.min(
    ...attempts.map((attempt) => parseSheetTimestamp(attempt)),
  );
  const unlockIn = oldestAttempt + ATTEMPT_WINDOW_MS - now;

  return `Du har brukt opp dagens 5 forsøk. Prøv igjen om ${formatRemainingTime(unlockIn)}.`;
}

function applyGameState(gameState, options = {}) {
  const now = Date.now();
  const attemptsLeft = Math.max(
    0,
    MAX_DAILY_ATTEMPTS - gameState.attempts.length,
  );
  const lockoutMessage = getLockoutMessage(gameState.attempts, now);

  if (attemptCounter) {
    attemptCounter.textContent = `${gameState.attempts.length}/${MAX_DAILY_ATTEMPTS} forsøk brukt i dag. ${attemptsLeft} igjen.`;
  }

  latestGameState = gameState;

  if (pendingWinSubmission) {
    gameBtn.disabled = true;
    gameBtn.textContent = "Fyll ut skjemaet";
    return;
  }

  if (gameState.attempts.length >= MAX_DAILY_ATTEMPTS) {
    gameBtn.disabled = true;
    gameBtn.textContent = "PRØV OM IGJEN SENERE";

    if (!isRunning && gameMessage) {
      gameMessage.textContent = lockoutMessage;
      gameMessage.style.color = "#ff3333";
    }

    return;
  }

  gameBtn.disabled = false;

  if (!isRunning && !options.keepLabel) {
    gameBtn.textContent = "START";
  }
}

async function refreshGameState(options = {}) {
  try {
    const entries = await fetchSheetEntries();
    const attempts = getRecentGameAttempts(entries);
    const gameState = { entries, attempts };
    applyGameState(gameState, options);
    return gameState;
  } catch (error) {
    console.error("Kunne ikke oppdatere spillstatus:", error);

    if (attemptCounter) {
      attemptCounter.textContent =
        "Klarte ikke å hente dagens forsøk akkurat nå.";
    }

    return latestGameState || { entries: [], attempts: [] };
  }
}

async function logGameEntry(payload) {
  const response = await fetch(SHARED_SHEETBEST_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      submitted_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error("Kunne ikke lagre spillhendelsen");
  }
}

function showWinForm(finalTime, attemptsUsed) {
  pendingWinSubmission = true;
  pendingResultTime = finalTime;
  pendingWinCode = `DDD-${Date.now()}`;

  if (winResultTime) {
    winResultTime.value = finalTime;
  }

  if (winAttemptsUsed) {
    winAttemptsUsed.value = String(attemptsUsed);
  }

  if (winStatus) {
    winStatus.textContent =
      "Du traff 10.00. Fyll ut skjemaet under for å registrere gevinsten i SheetBest.";
    winStatus.style.color = "#00ffcc";
  }

  if (winFormSection) {
    winFormSection.classList.remove("hidden");
    winFormSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (winSubmitBtn) {
    winSubmitBtn.disabled = false;
    winSubmitBtn.textContent = "REGISTRER GEVINST";
  }

  gameBtn.disabled = true;
  gameBtn.textContent = "Fyll ut skjemaet";
}

function resetWinFormState() {
  pendingWinSubmission = false;
  pendingResultTime = "";
  pendingWinCode = "";

  if (winForm) {
    winForm.reset();
  }

  if (winFormSection) {
    winFormSection.classList.add("hidden");
  }

  if (winStatus) {
    winStatus.textContent = "";
  }
}

function openTestWinForm() {
  if (!winFormSection) {
    return;
  }

  showWinForm("TEST", 0);

  if (winStatus) {
    winStatus.textContent =
      "Testmodus er aktiv. Du kan fylle ut skjemaet og sende en test uten å vinne først.";
    winStatus.style.color = "#00ffcc";
  }

  if (gameMessage) {
    gameMessage.textContent = GAME_GIFT_CARD_MODE
      ? "Gavekort-lenken er aktiv. Skjemaet er åpent for registrering."
      : "Testmodus er aktivert. Skjemaet er åpent for testing.";
    gameMessage.style.color = "#00ffcc";
  }
}

if (gameBtn && timerDisplay && gameMessage) {
  refreshGameState();

  if (GAME_TEST_MODE || GAME_GIFT_CARD_MODE) {
    openTestWinForm();
  }

  gameBtn.addEventListener("click", async () => {
    if (pendingWinSubmission) {
      gameMessage.textContent =
        "Registrer gevinsten i skjemaet før du prøver igjen.";
      gameMessage.style.color = "#ff3333";
      return;
    }

    const currentState = await refreshGameState({ keepLabel: isRunning });

    if (currentState.attempts.length >= MAX_DAILY_ATTEMPTS && !isRunning) {
      return;
    }

    if (!isRunning) {
      isRunning = true;
      gameBtn.textContent = "STOPP!";
      gameBtn.style.background = "#ff0055";
      gameMessage.textContent = "";

      startTime = performance.now();

      timerInterval = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        timerDisplay.textContent = elapsed.toFixed(2);
      }, 10);
    } else {
      isRunning = false;
      clearInterval(timerInterval);
      gameBtn.textContent = "PRØV IGJEN";
      gameBtn.style.background = "#9d32a8";

      const finalTime = ((performance.now() - startTime) / 1000).toFixed(2);
      timerDisplay.textContent = finalTime;

      const attemptStatus = finalTime === "10.00" ? "win" : "fail";

      try {
        await logGameEntry({
          attempt_status: attemptStatus,
          result_time: finalTime,
          attempts_used_today: currentState.attempts.length + 1,
          type: GAME_ATTEMPT_TYPE,
          use_status: attemptStatus === "win" ? "needs_claim" : "attempted",
          win_code: attemptStatus === "win" ? pendingWinCode : "",
        });
      } catch (error) {
        console.error("Kunne ikke lagre forsøket:", error);
        gameMessage.textContent =
          "Kunne ikke lagre forsøket akkurat nå. Prøv igjen når forbindelsen er tilbake.";
        gameMessage.style.color = "#ff3333";
        gameBtn.textContent = "START";
        gameBtn.style.background = "#9d32a8";
        await refreshGameState();
        return;
      }

      const updatedState = await refreshGameState({ keepLabel: true });

      if (finalTime === "10.00") {
        gameMessage.textContent =
          "🎉 Trefferen er registrert. Fyll ut skjemaet under for å sende gevinsten videre.";
        gameMessage.style.color = "#00ffcc";
        showWinForm(finalTime, updatedState.attempts.length);
      } else {
        const diff = (finalTime - 10.0).toFixed(2);
        gameMessage.textContent =
          diff > 0
            ? `Du var ${diff} sekunder for treg. ${Math.max(0, MAX_DAILY_ATTEMPTS - updatedState.attempts.length)} forsøk igjen i dag.`
            : `Du var ${Math.abs(diff)} sekunder for rask. ${Math.max(0, MAX_DAILY_ATTEMPTS - updatedState.attempts.length)} forsøk igjen i dag.`;
        gameMessage.style.color = "#ff3333";
      }

      applyGameState(updatedState, { keepLabel: true });
    }
  });
}

if (winForm) {
  winForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!pendingWinSubmission) {
      return;
    }

    const originalButtonText = winSubmitBtn ? winSubmitBtn.textContent : "";

    if (winSubmitBtn) {
      winSubmitBtn.disabled = true;
      winSubmitBtn.textContent = "REGISTRERER...";
    }

    if (winStatus) {
      winStatus.textContent =
        "Sender gevinsten til SheetBest og knytter den til bookingen din...";
      winStatus.style.color = "#bbb";
    }

    const formData = new FormData(winForm);
    const data = Object.fromEntries(formData.entries());

    try {
      await logGameEntry({
        ...data,
        result_time: pendingResultTime,
        win_code: pendingWinCode,
        claim_status: "submitted",
        use_status: "unused",
        type: GAME_WIN_CLAIM_TYPE,
      });

      if (winStatus) {
        winStatus.textContent =
          "Gevinsten er registrert. En ansatt kan nå se den i SheetBest sammen med bookingene.";
        winStatus.style.color = "#00ffcc";
      }

      resetWinFormState();
      gameMessage.textContent = "Gevinsten er sendt til bookinglisten.";
      gameMessage.style.color = "#00ffcc";
    } catch (error) {
      console.error("Kunne ikke lagre gevinst:", error);
      if (winStatus) {
        winStatus.textContent =
          "Vi fikk ikke sendt skjemaet. Sjekk nett og prøv igjen, eller be en ansatt registrere gevinsten manuelt.";
        winStatus.style.color = "#ff3333";
      }
    } finally {
      if (winSubmitBtn) {
        winSubmitBtn.disabled = false;
        winSubmitBtn.textContent = originalButtonText || "REGISTRER GEVINST";
      }

      await refreshGameState({ keepLabel: true });
    }
  });
}
