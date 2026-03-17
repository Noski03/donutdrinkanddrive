// Initialiser EmailJS
(function () {
  // HUSK: Erstatt denne med din faktiske Public Key fra EmailJS
  emailjs.init("DIN_PUBLIC_KEY");
})();

// Funksjon for å velge pakke og aktivere skjema
function selectPackage(packageName) {
  // Oppdater tekst i overskriften
  document.getElementById("selected-package-display").innerText = packageName;
  // Oppdater det skjulte feltet i formen
  document.getElementById("package-input").value = packageName;

  // Fjern 'disabled' effekten fra skjemaet
  const bookingSection = document.getElementById("booking-section");
  bookingSection.classList.remove("disabled");

  // Scroller ned til skjemaet
  bookingSection.scrollIntoView({ behavior: "smooth" });
}

// Håndtering av e-post-sending
document
  .getElementById("email-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const btn = document.getElementById("submit-btn");
    btn.innerText = "Sender...";
    btn.disabled = true;

    // Send skjemaet via EmailJS
    // HUSK: Erstatt disse med dine faktiske ID-er
    emailjs.sendForm("DIN_SERVICE_ID", "DIN_TEMPLATE_ID", this).then(
      function () {
        alert("Takk! Vi har mottatt din forespørsel.");
        btn.innerText = "SEND FORESPØRSEL";
        btn.disabled = false;
        document.getElementById("email-form").reset();
        // Valgfritt: lås skjemaet igjen etter sending
        document.getElementById("booking-section").classList.add("disabled");
        document.getElementById("selected-package-display").innerText =
          "Ingen valgt";
      },
      function (error) {
        alert(
          "FEIL: Kunne ikke sende. Sjekk at ID-ene dine er riktige i JS-filen.",
        );
        btn.innerText = "SEND FORESPØRSEL";
        btn.disabled = false;
      },
    );
  });
