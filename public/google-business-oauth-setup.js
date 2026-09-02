(function googleBusinessOAuthSetupV401() {
  "use strict";

  function permissions() {
    try {
      return JSON.parse(localStorage.getItem("bd_active_permissions") || "[]");
    } catch {
      return [];
    }
  }

  function canManageIntegrations() {
    var role = localStorage.getItem("bd_active_role") || "";
    var values = permissions();
    return role === "owner" || values.includes("integrations.manage");
  }

  function sessionHeaders() {
    var headers = { "Content-Type": "application/json" };
    var email = localStorage.getItem("bd_session");
    var token = localStorage.getItem("bd_session_token");
    var venueId = localStorage.getItem("bd_active_venue_id");
    if (email && token) {
      headers["X-Session-Email"] = email;
      headers["X-Session-Token"] = token;
      if (venueId) headers["X-Venue-Id"] = venueId;
    }
    return headers;
  }

  async function api(path, options) {
    var settings = Object.assign({ cache: "no-store" }, options || {});
    settings.headers = Object.assign({}, sessionHeaders(), settings.headers || {});
    var response = await fetch(path, settings);
    var result;
    try {
      result = await response.json();
    } catch {
      result = {};
    }
    if (!response.ok || result.ok === false || result.success === false) {
      var problem = new Error(result.error || "Запрос не выполнен");
      problem.status = response.status;
      throw problem;
    }
    return result;
  }

  function node(tag, className, text) {
    var result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }

  function showMessage(text, isError) {
    var message = document.getElementById("reviews-message");
    if (!message) return;
    message.textContent = text;
    message.classList.remove("hidden", "error");
    if (isError) message.classList.add("error");
    message.setAttribute("role", isError ? "alert" : "status");
  }

  function createLabeledInput(labelText, name, type) {
    var label = document.createElement("label");
    label.appendChild(document.createTextNode(labelText));
    var input = document.createElement("input");
    input.name = name;
    input.type = type;
    input.required = true;
    input.autocomplete = type === "password" ? "new-password" : "off";
    input.spellcheck = false;
    label.appendChild(input);
    return label;
  }

  var title = document.getElementById("review-sources-title");
  var heading = title ? title.closest(".panel-heading") : null;
  if (!heading || !canManageIntegrations()) return;

  var setupButton = node("button", "button secondary small", "Настроить Google");
  setupButton.type = "button";
  setupButton.id = "google-oauth-setup-open";
  heading.appendChild(setupButton);

  var dialog = document.createElement("dialog");
  dialog.id = "google-oauth-setup-dialog";
  dialog.className = "review-dialog";

  var form = document.createElement("form");
  form.id = "google-oauth-setup-form";

  var dialogHeading = node("div", "dialog-heading");
  var headingCopy = document.createElement("div");
  headingCopy.appendChild(node("p", "section-label", "GOOGLE BUSINESS PROFILE"));
  headingCopy.appendChild(node("h2", "", "Настройка OAuth"));
  var closeButton = node("button", "dialog-close", "×");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Закрыть");
  dialogHeading.append(headingCopy, closeButton);
  form.appendChild(dialogHeading);

  form.appendChild(node(
    "p",
    "dialog-copy",
    "Введите Client ID и Client secret из Google Cloud. Они сохранятся в защищённом хранилище BarDoctor и не будут показаны повторно."
  ));

  var grid = node("div", "form-grid");
  grid.appendChild(createLabeledInput("Client ID", "clientId", "text"));
  grid.appendChild(createLabeledInput("Client secret", "clientSecret", "password"));
  form.appendChild(grid);

  var callbackLabel = document.createElement("label");
  callbackLabel.appendChild(document.createTextNode("Authorized redirect URI"));
  var callbackInput = document.createElement("input");
  callbackInput.type = "text";
  callbackInput.readOnly = true;
  callbackInput.value = window.location.origin + "/api/reviews/sources/google/callback";
  callbackInput.setAttribute("aria-label", "Google OAuth callback URL");
  callbackLabel.appendChild(callbackInput);
  form.appendChild(callbackLabel);

  var actions = node("div", "dialog-actions");
  var cancelButton = node("button", "button secondary", "Отмена");
  cancelButton.type = "button";
  var submitButton = node("button", "button primary", "Сохранить и подключить Google");
  submitButton.type = "submit";
  actions.append(cancelButton, submitButton);
  form.appendChild(actions);

  dialog.appendChild(form);
  document.body.appendChild(dialog);

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  setupButton.addEventListener("click", function () {
    form.reset();
    callbackInput.value = window.location.origin + "/api/reviews/sources/google/callback";
    dialog.showModal();
  });
  closeButton.addEventListener("click", closeDialog);
  cancelButton.addEventListener("click", closeDialog);

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var clientId = String(form.elements.clientId.value || "").trim();
    var clientSecret = String(form.elements.clientSecret.value || "").trim();
    if (!clientId || !clientSecret) {
      showMessage("Введите одновременно Google Client ID и Client secret.", true);
      return;
    }

    submitButton.disabled = true;
    closeButton.disabled = true;
    cancelButton.disabled = true;
    try {
      await api("/api/integrations", {
        method: "PUT",
        body: JSON.stringify({
          service: "google_business",
          clientId: clientId,
          clientSecret: clientSecret
        })
      });

      form.elements.clientSecret.value = "";
      showMessage("Google OAuth сохранён. Открываю авторизацию Google.");

      var connect = await api("/api/reviews/sources/google/connect", { method: "GET" });
      var authUrl = connect.data && connect.data.url ? new URL(connect.data.url) : null;
      if (!authUrl || authUrl.protocol !== "https:" || authUrl.hostname !== "accounts.google.com") {
        throw new Error("Google вернул некорректную ссылку авторизации.");
      }
      window.location.assign(authUrl.href);
    } catch (problem) {
      showMessage(problem && problem.message ? problem.message : "Не удалось настроить Google OAuth.", true);
      submitButton.disabled = false;
      closeButton.disabled = false;
      cancelButton.disabled = false;
    }
  });
})();
