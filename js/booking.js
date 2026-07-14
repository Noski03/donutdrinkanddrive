(function () {
  // Din Public Key
  emailjs.init("5SuUIn7ldp9MurDAm");
})();

// Ett felles SheetBest-ark for booking og spillvinnere.
const SHARED_SHEETBEST_URL =
  "https://api.sheetbest.com/sheets/17766096-0f6c-4f4a-b242-ac824a3d6585";

const MIN_BIRTHDAY_GROUP = 10;
const MIN_BOOKING_NOTICE_MS = 48 * 60 * 60 * 1000;

const BOOKING_PACKAGES = {
  "Bursdag 10-12": {
    label: "Bursdag 10-12",
    hours: 2,
    startTime: "10:00",
    endTime: "12:00",
    pricePerPerson: 200,
  },
  "Bursdag 12-14": {
    label: "Bursdag 12-14",
    hours: 2,
    startTime: "12:00",
    endTime: "14:00",
    pricePerPerson: 200,
  },
  "Kveld 20-22": {
    label: "Kveld 20-22",
    hours: 2,
    startTime: "20:00",
    endTime: "22:00",
    pricePerPerson: 200,
  },
  "Kveld 20-23": {
    label: "Kveld 20-23",
    hours: 3,
    startTime: "20:00",
    endTime: "23:00",
    pricePerPerson: 300,
  },
};

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

function getSelectedBookingPackage(packageName) {
  return BOOKING_PACKAGES[packageName] || null;
}

function getMinimumBookingDate() {
  const minDate = new Date(Date.now() + MIN_BOOKING_NOTICE_MS);
  const year = minDate.getFullYear();
  const month = String(minDate.getMonth() + 1).padStart(2, "0");
  const day = String(minDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isBookingDateValid(dateValue) {
  const minimumDate = getMinimumBookingDate();
  return Boolean(dateValue) && dateValue >= minimumDate;
}

const datePicker = document.getElementById("date-picker");

if (datePicker) {
  datePicker.min = getMinimumBookingDate();
}

function buildBookingSummary(data, bookingPackage, seats) {
  const totalAmount = bookingPackage.pricePerPerson * seats;

  return {
    ...data,
    booking_type: "birthday_private_booking",
    booking_window: bookingPackage.label,
    start_time: bookingPackage.startTime,
    end_time: bookingPackage.endTime,
    hours: bookingPackage.hours,
    price_per_person: bookingPackage.pricePerPerson,
    min_people: MIN_BIRTHDAY_GROUP,
    total_amount: totalAmount,
    type: "booking",
  };
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
    const bookingPackage = getSelectedBookingPackage(data.package);
    const requestedSeats = parseInt(data.seats, 10);
    const minimumBookingDate = getMinimumBookingDate();

    if (!bookingPackage) {
      alert("Velg et bursdagsopplegg først.");
      btn.innerText = originalText;
      btn.disabled = false;
      return;
    }

    if (Number.isNaN(requestedSeats) || requestedSeats < MIN_BIRTHDAY_GROUP) {
      alert(`Bursdagsbooking krever minst ${MIN_BIRTHDAY_GROUP} personer.`);
      btn.innerText = originalText;
      btn.disabled = false;
      return;
    }

    if (!isBookingDateValid(data.date)) {
      alert(
        `Bookingen må være minst 48 timer fram i tid. Velg ${minimumBookingDate} eller senere.`,
      );
      btn.innerText = originalText;
      btn.disabled = false;
      return;
    }

    try {
      // 1. Regn ut pris for bursdagspakken
      const totalt = bookingPackage.pricePerPerson * requestedSeats;
      const netto = Math.round(totalt / 1.12);
      const mva = totalt - netto;

      const emailParams = {
        ...buildBookingSummary(data, bookingPackage, requestedSeats),
        price_per_unit: bookingPackage.pricePerPerson,
        net_amount: netto,
        mva_amount: mva,
        total_amount: totalt,
      };

      // 2. Lagre i SheetBest-arket for booking
      await fetch(SHARED_SHEETBEST_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildBookingSummary(data, bookingPackage, requestedSeats),
        ),
      });

      // 3. Send e-post via EmailJS
      await emailjs.send("service_8erarue", "template_baqv2nx", emailParams);

      alert(
        "Takk, " +
          data.from_name +
          "! Bursdagsbookingen er sendt.\n\n" +
          "Vi har registrert " +
          requestedSeats +
          " personer for " +
          bookingPackage.label +
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
        "Det skjedde en feil. Sjekk at du har valgt et bursdagsopplegg med minst 10 personer, eller prøv igjen senere.",
      );
    } finally {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  });
