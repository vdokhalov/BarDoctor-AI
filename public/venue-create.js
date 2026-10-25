(function () {
  "use strict";

  var form = document.getElementById("venue-create-form");
  var notice = document.getElementById("venue-notice");
  var submit = document.getElementById("create-venue-button");
  var countrySelect = document.getElementById("venue-country");
  var citySelect = document.getElementById("venue-city");
  var cityHelp = document.getElementById("venue-city-help");
  var regionInput = form && form.elements ? form.elements.region : null;

  // This explicit-save editor owns its dirty state, including custom controls.
  form.dataset.bdDirtyReady = "true";
  var initialValues = null;
  var dirtyStatus = document.createElement("span");
  dirtyStatus.className = "bd-dirty-state";
  dirtyStatus.setAttribute("role", "status");
  dirtyStatus.textContent = "Есть несохранённые изменения";
  submit.before(dirtyStatus);
  function values() {
    var data = payloadFromForm();
    delete data.trackingStartDate; // Clock changes are not edits.
    // Unselected and explicitly cleared days both mean no working days.
    data.workingDays = Array.from({length:7}, function (_, index) {
      return Boolean(data.workingDays && data.workingDays[String(index + 1)]);
    });
    return JSON.stringify(data);
  }
  function updateDirty() {
    var dirty = initialValues !== null && values() !== initialValues;
    form.dataset.bdDirty = String(dirty);
    dirtyStatus.hidden = !dirty;
    dirtyStatus.style.display = dirty ? "inline-flex" : "none";
    return dirty;
  }
  function markClean() { initialValues = values(); updateDirty(); }
  function confirmExit() {
    if (!updateDirty()) return true;
    if (!window.confirm("Изменения не сохранены. Выйти без сохранения?")) return false;
    markClean();
    return true;
  }
  ["input", "change", "schedulechange", "timezonechange"].forEach(function (type) {
    form.addEventListener(type, updateDirty);
  });
  function guardClick(event) {
    var control = event.target.closest && event.target.closest("a[href],button");
    if (!control || event.defaultPrevented) return;
    var ownDocument = control.ownerDocument === document;
    if (ownDocument && !control.matches("[data-bd-back]")) return;
    if (!confirmExit()) { event.preventDefault(); event.stopImmediatePropagation(); }
  }
  document.addEventListener("click", guardClick, true);
  function guardUnload(event) {
    if (updateDirty()) { event.preventDefault(); event.returnValue = ""; }
  }
  window.addEventListener("beforeunload", guardUnload);
  if (window.parent !== window) {
    window.parent.document.addEventListener("click", guardClick, true);
    window.parent.addEventListener("beforeunload", guardUnload);
    window.addEventListener("pagehide", function () {
      window.parent.document.removeEventListener("click", guardClick, true);
      window.parent.removeEventListener("beforeunload", guardUnload);
    });
  }
  updateDirty();

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

  var locationListenersBound = false;
  function retryLocationDirectory() {
    var retry = document.getElementById('venue-directory-retry');
    if (retry) retry.disabled = true;
    var script = document.createElement('script');
    script.src = '/venue-location-data.js?v=setup-retry-v444';
    script.onload = function () {
      script.remove();
      if (initialiseLocationFields()) {
        notice.className = 'notice hidden';
        verifyOwner().then(function (allowed) { submit.disabled = !allowed; });
      }
    };
    script.onerror = function () { script.remove(); initialiseLocationFields(); };
    document.head.appendChild(script);
  }

  function initialiseLocationFields() {
    if (!countrySelect || !citySelect) return;
    var directory = window.BD_VENUE_LOCATIONS;
    if (!directory || !Array.isArray(directory.countries)) {
      showNotice("Не удалось загрузить справочник стран и городов. Повторите загрузку; введённые данные сохранятся.", "error");
      submit.disabled = true;
      var retry = document.createElement('button');
      retry.id = 'venue-directory-retry'; retry.type = 'button';
      retry.textContent = 'Повторить загрузку справочника';
      retry.addEventListener('click', retryLocationDirectory);
      notice.appendChild(retry);
      return false;
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

    if (locationListenersBound) return true;
    locationListenersBound = true;
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
    return true;
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

  function payloadFromForm() {
    var data = new FormData(form);
    var schedule = form.querySelector("bd-venue-schedule").value;
    return {
      timezone: form.querySelector("bd-venue-timezone").value || undefined,
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
      openTime: schedule.openTime,
      closeTime: schedule.closeTime,
      trackingStartDate: window.bdVenueTime.dateKey(new Date(),form.querySelector("bd-venue-timezone").value || "UTC"),
      workingDays: schedule.workingDays,
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
      markClean();
      window.location.replace("/home?venue=" + encodeURIComponent(result.activeVenueId) + "&newVenue=1");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Не удалось создать заведение", "error");
      submit.disabled = false;
      submit.textContent = "Создать заведение";
    }
  });

  markClean();
  initialiseLocationFields();
  verifyOwner();
})();
