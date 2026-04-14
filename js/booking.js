(function () {
  // Erstatt denne med din Public Key fra EmailJS Account > API Keys
  emailjs.init("DIN_PUBLIC_KEY");
})();

const SHEETBEST_URL =
  "https://api.sheetbest.com/sheets/078a2b91-e632-4fa0-865a-af80a0cf77a2";
const MAX_SETS = 4; // Antall simulatorer dere har totalt

function selectPackage(packageName) {
  document.getElementById("selected-package-display").innerText = packageName;
  document.getElementById("package-input").value = packageName;

  const bookingSection = document.getElementById("booking-section");
  bookingSection.classList.remove("disabled");
  bookingSection.scrollIntoView({ behavior: "smooth" });
}

document
  .getElementById("email-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();
    const btn = document.getElementById("submit-btn");
    const originalText = btn.innerText;

    btn.innerText = "Sjekker ledig tid...";
    btn.disabled = true;

    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    try {
      // 1. Hent eksisterende bookinger fra Google Sheets
      const response = await fetch(SHEETBEST_URL);
      const bookings = await response.json();

      // 2. Beregn hvor mange seter som er opptatt på valgt dato og tid
      // Vi antar her at du legger til et 'seats' felt i HTML,
      // hvis ikke regner vi 1 sete per booking.
      const occupied = bookings
        .filter((b) => b.date === data.date && b.time === data.time)
        .reduce((sum, b) => sum + parseInt(b.seats || 1), 0);

      const requested = parseInt(data.seats || 1);

      if (occupied + requested > MAX_SETS) {
        alert(
          `Beklager! Det er kun ${MAX_SETS - occupied} ledige plasser kl. ${data.time}.`,
        );
        btn.innerText = originalText;
        btn.disabled = false;
        return;
      }

      // 3. Lagre bookingen i Google Sheets via SheetBest
      await fetch(SHEETBEST_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      // 4. Send bekreftelse via EmailJS
      await emailjs.sendForm("DIN_SERVICE_ID", "DIN_TEMPLATE_ID", this);

      alert("Booking bekreftet! Vi ses på banen.");
      this.reset();
      document.getElementById("booking-section").classList.add("disabled");
      document.getElementById("selected-package-display").innerText =
        "Ingen valgt";
    } catch (error) {
      console.error("Feil:", error);
      alert("Noe gikk galt. Sjekk at du har fylt ut alle felt.");
    } finally {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  });
