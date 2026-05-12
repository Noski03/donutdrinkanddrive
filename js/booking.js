(function () {
  // Din Public Key
  emailjs.init("5SuUIn7ldp9MurDAm");
})();

// HER LIMER DU INN DEN NYE LENKEN FRA SJEFEN DIN:
const SHEETBEST_URL =
  "https://api.sheetbest.com/sheets/78eb891c-7f42-4ed9-8290-759dc526528a";

const MAX_SETS = 5;

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
      // 1. Hent bookinger for å sjekke kapasitet via sjefens nye kobling
      const response = await fetch(SHEETBEST_URL);
      if (!response.ok) throw new Error("Kunne ikke koble til SheetBest");

      const bookings = await response.json();

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

      // 2. Regn ut pris og 12% MVA
      const priser = {
        "The Rookie": 199,
        "Pro Racer": 349,
        "Grand Prix": 599,
      };

      const prisPerEnhet = priser[data.package] || 0;
      const totalt = prisPerEnhet * requested;
      const netto = Math.round(totalt / 1.12);
      const mva = totalt - netto;

      const emailParams = {
        ...data,
        price_per_unit: prisPerEnhet,
        net_amount: netto,
        mva_amount: mva,
        total_amount: totalt,
      };

      // 3. Lagre i Google Sheets på sjefens konto
      await fetch(SHEETBEST_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      // 4. Send e-post via EmailJS
      await emailjs.send("service_8erarue", "template_baqv2nx", emailParams);

      alert(
        "Takk, " +
          data.from_name +
          "! Forespørsel er sendt.\n\n" +
          "Vi har registrert tlf: " +
          data.phone +
          ".\n\n" +
          "VIKTIG: Sjekk søppelpost-mappen din hvis du ikke ser bekreftelsen i innboksen!",
      );

      this.reset();
      document.getElementById("booking-section").classList.add("disabled");
      document.getElementById("selected-package-display").innerText =
        "Ingen valgt";
    } catch (error) {
      console.error("Systemfeil:", error);
      alert(
        "Det skjedde en feil. Vennligst sjekk alle felt eller prøv igjen senere.",
      );
    } finally {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  });
