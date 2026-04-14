(function () {
  // Erstatt med din faktiske Public Key fra EmailJS
  emailjs.init("DIN_PUBLIC_KEY");
})();

const SHEETBEST_URL =
  "https://api.sheetbest.com/sheets/078a2b91-e632-4fa0-865a-af80a0cf77a2";
const MAX_SETS = 5;

// Funksjon for å velge pakke og scrolle ned
function selectPackage(packageName) {
  const display = document.getElementById("selected-package-display");
  const input = document.getElementById("package-input");
  const section = document.getElementById("booking-section");

  if (display && input && section) {
    display.innerText = packageName;
    input.value = packageName;
    section.classList.remove("disabled");
    section.scrollIntoView({ behavior: "smooth" });
  }
}

document
  .getElementById("email-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const btn = document.getElementById("submit-btn");
    const originalText = btn.innerText;

    btn.innerText = "SJEKKER LEDIG TID...";
    btn.disabled = true;

    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    try {
      // 1. Hent bookinger for å sjekke kapasitet
      const response = await fetch(SHEETBEST_URL);
      if (!response.ok) throw new Error("Kunne ikke koble til SheetBest");

      const bookings = await response.json();

      // Finn ut hvor mange seter som er opptatt på valgt dato og tid
      const occupied = bookings
        .filter((b) => b.date === data.date && b.time === data.time)
        .reduce((sum, b) => sum + parseInt(b.seats || 0), 0);

      const requested = parseInt(data.seats);

      if (occupied + requested > MAX_SETS) {
        alert(
          `Beklager! Det er kun ${MAX_SETS - occupied} ledige plasser kl. ${data.time}.`,
        );
        btn.innerText = originalText;
        btn.disabled = false;
        return;
      }

      // 2. Regn ut pris og 12% MVA for EmailJS
      const priser = {
        "The Rookie": 199,
        "Pro Racer": 349,
        "Grand Prix": 599,
      };

      const prisPerEnhet = priser[data.package] || 0;
      const totalt = prisPerEnhet * requested;
      const netto = Math.round(totalt / 1.12);
      const mva = totalt - netto;

      // Pakk dataene for EmailJS
      const emailParams = {
        ...data,
        price_per_unit: prisPerEnhet,
        net_amount: netto,
        mva_amount: mva,
        total_amount: totalt,
      };

      // 3. Lagre i Google Sheets
      await fetch(SHEETBEST_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      // 4. Send e-post via EmailJS
      // VIKTIG: Bytt ut 'service_8erarue' og 'template_id' med dine egne
      await emailjs.send("service_8erarue", "DIN_TEMPLATE_ID", emailParams);

      alert(
        "Takk! Forespørsel sendt. Sjekk e-posten din for bekreftelse og Vipps-info.",
      );

      // Nullstill skjema
      this.reset();
      document.getElementById("booking-section").classList.add("disabled");
      document.getElementById("selected-package-display").innerText =
        "Ingen valgt";
    } catch (error) {
      console.error("Systemfeil:", error);
      alert(
        "Det skjedde en feil under booking. Vennligst sjekk at du har fylt ut alle felt eller prøv igjen senere.",
      );
    } finally {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  });
