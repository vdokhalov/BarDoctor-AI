(function () {
  "use strict";

  var form = document.getElementById("venue-create-form");
  var notice = document.getElementById("venue-notice");
  var submit = document.getElementById("create-venue-button");
  var countrySelect = document.getElementById("venue-country");
  var citySelect = document.getElementById("venue-city");
  var cityHelp = document.getElementById("venue-city-help");
  var regionInput = form && form.elements ? form.elements.region : null;

  function option(value, label, code) {
    var node = document.createElement("option");
    node.value = value;
    node.textContent = label;
    if (code) node.dataset.code = code;
    return node;
  }

  function selectedCountryCode() {
    if (!countrySelect || countrySelect.selectedIndex < 0) return "";
    return countrySelect.options[countrySelect.selectedIndex].dataset.code || "";
  }

  function renderCities(clearSelection) {
    if (!citySelect) return;
    var previous = clearSelection ? "" : citySelect.value;
    var directory = window.BD_VENUE_LOCATIONS || { cities: {} };
    var countryCode = selectedCountryCode();
    var cities = countryCode && Array.isArray(directory.cities[countryCode])
      ? directory.cities[countryCode]
      : [];
    citySelect.replaceChildren(option("", countryCode ? "Выберите город" : "Сначала выберите страну"));
    cities.forEach(function (city) { citySelect.appendChild(option(city, city)); });
    citySelect.disabled = !countryCode;
    if (previous && cities.includes(previous)) citySelect.value = previous;
    if (cityHelp) {
      cityHelp.textContent = countryCode
        ? "Выберите город из справочника"
        : "Список городов появится после выбора страны";
    }
  }

  function initialiseLocationFields() {
    if (!countrySelect || !citySelect) return;
    var directory = window.BD_VENUE_LOCATIONS;
    if (!directory || !Array.isArray(directory.countries)) {
      showNotice("Не удалось загрузить справочник стран и городов. Обновите страницу.", "error");
      submit.disabled = true;
      return;
    }
    var restoredCountry = countrySelect.value;
    countrySelect.replaceChildren(option("", "Выберите страну"));
    directory.countries.forEach(function (country) {
      countrySelect.appendChild(option(
        country.name,
        (country.flag ? country.flag + "  " : "") + country.name,
        country.code
      ));
    });
    if (restoredCountry) countrySelect.value = restoredCountry;
    renderCities(false);
    countrySelect.addEventListener("change", function () {
      renderCities(true);
      if (regionInput) regionInput.value = "";
    });
    citySelect.addEventListener("change", function () {
      if (!regionInput || regionInput.value.trim() || selectedCountryCode() !== "MD") return;
      if (["Бендеры", "Тирасполь", "Рыбница", "Дубоссары"].includes(citySelect.value)) {
        regionInput.value = "Приднестровье";
      }
    });
  }

  function sessionHeaders() {
    var email = localStorage.getItem("bd_session");
    var token = localStorage.getItem("bd_session_token");
    var venueId = localStorage.getItem("bd_active_venue_id");
    if (!email || !token) return null;
    var headers = {
      "Content-Type": "application/json",
      "X-Session-Email": email,
      "X-Session-Token": token
    };
    if (venueId) headers["X-Venue-Id"] = venueId;
    return headers;
  }

  function showNotice(message, variant) {
    notice.textContent = message;
    notice.className = "notice " + (variant || "error");
    notice.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function workingDays(data) {
    var enabled = new Set(data.getAll("day"));
    return ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      .reduce(function (result, day) {
        result[day] = enabled.has(day);
        return result;
      }, {});
  }

  function payloadFromForm() {
    var data = new FormData(form);
    return {
      name: String(data.get("name") || "").trim(),
      businessType: String(data.get("businessType") || "").trim(),
      country: String(data.get("country") || "").trim(),
      countryCode: selectedCountryCode(),
      city: String(data.get("city") || "").trim(),
      region: String(data.get("region") || "").trim(),
      district: String(data.get("district") || "").trim(),
      address: String(data.get("address") || "").trim(),
      currency: String(data.get("currency") || "").trim().toUpperCase(),
      venueFormat: String(data.get("venueFormat") || "").trim(),
      seats: Number(data.get("seats")) || 0,
      employees: Number(data.get("employees")) || 0,
      openTime: String(data.get("openTime") || "10:00"),
      closeTime: String(data.get("closeTime") || "23:00"),
      workingDays: workingDays(data),
      areas: [],
      competitors: []
    };
  }

  async function verifyOwner() {
    var headers = sessionHeaders();
    if (!headers) {
      window.location.replace("/login");
      return false;
    }
    try {
      var response = await fetch("/api/users/me", { headers: headers, cache: "no-store" });
      var result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Сессия истекла");
      if (!result.user || !result.user.canCreateVenues) {
        showNotice("Новое заведение может создать только владелец.", "error");
        submit.disabled = true;
        return false;
      }
      return true;
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Не удалось проверить доступ", "error");
      submit.disabled = true;
      return false;
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var headers = sessionHeaders();
    if (!headers) {
      window.location.replace("/login");
      return;
    }
    submit.disabled = true;
    submit.textContent = "Создаю…";
    notice.className = "notice hidden";
    try {
      var response = await fetch("/api/venues", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payloadFromForm())
      });
      var result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось создать заведение");
      localStorage.setItem("bd_active_venue_id", String(result.activeVenueId));
      localStorage.setItem("bd_active_venue_is_primary", result.venue.isPrimary ? "1" : "0");
      localStorage.setItem("bd_active_role", result.venue.role || "owner");
      localStorage.setItem("bd_active_permissions", JSON.stringify(result.venue.permissions || []));
      sessionStorage.setItem("bd_new_venue_notice", "Заведение создано. Данные других заведений сюда не перенесены.");
      window.location.replace("/home?venue=" + encodeURIComponent(result.activeVenueId) + "&newVenue=1");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Не удалось создать заведение", "error");
      submit.disabled = false;
      submit.textContent = "Создать заведение";
    }
  });

  initialiseLocationFields();
  verifyOwner();
})();
