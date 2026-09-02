(function () {
  "use strict";
  var ROLE_LABELS = { owner: "Владелец", manager: "Управляющий", shift_manager: "Менеджер" };
  var ROLE_DESCRIPTIONS = {
    owner: "Все данные, права, интеграции и критические настройки заведения.",
    manager: "Операционное управление. Владелец может точечно изменить доступ.",
    shift_manager: "Смены, склад, поручения, происшествия и оборудование."
  };
  var state = { access: null, selectedMember: null, lastInvite: null };

  function byId(id) { return document.getElementById(id); }
  function node(tag, className, text) { var item = document.createElement(tag); if (className) item.className = className; if (text != null) item.textContent = text; return item; }
  function clear(item) { while (item && item.firstChild) item.removeChild(item.firstChild); }
  function roleLabel(role) { return ROLE_LABELS[role] || role || "Без роли"; }
  function sessionHeaders(extra) {
    var headers = new Headers(extra || {});
    var venueId = localStorage.getItem("bd_active_venue_id");
    if (venueId) headers.set("X-Venue-Id", venueId);
    return headers;
  }
  async function api(url, options) {
    var response = await fetch(url, Object.assign({}, options || {}, { headers: sessionHeaders(options && options.headers), cache: "no-store" }));
    var result;
    try { result = await response.json(); } catch { result = { ok: false, error: "Некорректный ответ сервера" }; }
    if (!response.ok || !result.ok) {
      var error = new Error(result.error || "Не удалось выполнить запрос");
      error.status = response.status;
      error.code = result.code;
      throw error;
    }
    return result;
  }
  function notice(message, kind) {
    var item = byId("access-notice");
    item.textContent = message;
    item.className = "access-notice" + (kind ? " " + kind : "");
    window.clearTimeout(notice.timer);
    notice.timer = window.setTimeout(function () { item.classList.add("hidden"); }, 5200);
  }
  function dateTime(value) {
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
  }
  function roleDefaults(role) {
    var item = (state.access.roles || []).find(function (row) { return row.role === role; });
    return new Set(item && Array.isArray(item.permissions) ? item.permissions : []);
  }

  function renderRoles() {
    var root = byId("role-cards");
    clear(root);
    ["owner", "manager", "shift_manager"].forEach(function (role) {
      var card = node("article", "role-card" + (state.access.current.role === role ? " current" : ""));
      card.appendChild(node("strong", "", roleLabel(role)));
      card.appendChild(node("span", "", ROLE_DESCRIPTIONS[role]));
      root.appendChild(card);
    });
    byId("current-role").textContent = roleLabel(state.access.current.role);
  }

  function renderInvites() {
    var root = byId("active-invites");
    clear(root);
    var invites = state.access.invites || [];
    if (!invites.length) return;
    invites.forEach(function (invite) {
      var row = node("div", "compact-item");
      var copy = node("div");
      copy.appendChild(node("strong", "", roleLabel(invite.role)));
      copy.appendChild(node("span", "", "Действует до " + dateTime(invite.expiresAt)));
      row.appendChild(copy);
      var revoke = node("button", "", "Отозвать");
      revoke.type = "button";
      revoke.addEventListener("click", function () { revokeInvite(invite.id); });
      row.appendChild(revoke);
      root.appendChild(row);
    });
  }

  function canManage(member) {
    if (!state.access.canManageAccess || member.isCurrent || member.role === "owner") return false;
    return state.access.current.role === "owner" || member.role === "shift_manager";
  }

  function renderMembers() {
    var root = byId("member-list");
    clear(root);
    var members = state.access.members || [];
    byId("member-count").textContent = String(members.length);
    if (!members.length) {
      root.appendChild(node("div", "member-row", "Участников пока нет."));
      return;
    }
    members.forEach(function (member) {
      var row = node("article", "member-row" + (member.status === "disabled" ? " disabled" : ""));
      var head = node("div", "member-head");
      head.appendChild(node("span", "member-avatar", (member.name || member.email || "?").slice(0, 1).toUpperCase()));
      var copy = node("div", "member-copy");
      copy.appendChild(node("strong", "", member.name || member.email));
      copy.appendChild(node("span", "", (member.email || "") + (member.isCurrent ? " · это вы" : "")));
      head.appendChild(copy);
      head.appendChild(node("span", "role-pill", member.status === "disabled" ? "Отключён" : roleLabel(member.role)));
      row.appendChild(head);
      row.appendChild(node("p", "member-summary", member.role === "owner" ? "Полный доступ." : "Разрешено действий: " + String((member.permissions || []).length)));
      if (canManage(member)) {
        var actions = node("div", "member-actions");
        if (state.access.current.role === "owner") {
          var role = node("select");
          ["manager", "shift_manager"].forEach(function (value) {
            var option = node("option", "", roleLabel(value));
            option.value = value;
            role.appendChild(option);
          });
          role.value = member.role;
          role.disabled = member.status === "disabled";
          role.addEventListener("change", function () {
            updateMember(member.id, { role: role.value, permissions: { allow: [], deny: [] } }, "Роль обновлена");
          });
          actions.appendChild(role);
          var permissions = node("button", "", "Настроить права");
          permissions.type = "button";
          permissions.disabled = member.status === "disabled";
          permissions.addEventListener("click", function () { openPermissions(member); });
          actions.appendChild(permissions);
        }
        var toggle = node("button", member.status === "active" ? "danger" : "", member.status === "active" ? "Отключить" : "Включить");
        toggle.type = "button";
        toggle.addEventListener("click", function () {
          if (member.status === "active" && !window.confirm("Отключить доступ для " + member.name + "?")) return;
          updateMember(member.id, { status: member.status === "active" ? "disabled" : "active" }, member.status === "active" ? "Доступ отключён" : "Доступ включён");
        });
        actions.appendChild(toggle);
        row.appendChild(actions);
      }
      root.appendChild(row);
    });
  }

  function render() {
    renderRoles();
    renderInvites();
    renderMembers();
    byId("invite-section").classList.toggle("hidden", !state.access.canManageAccess);
    var manager = byId("invite-role").querySelector('option[value="manager"]');
    if (manager) manager.disabled = state.access.current.role !== "owner";
    if (state.access.current.role !== "owner") byId("invite-role").value = "shift_manager";
  }

  async function load() {
    try {
      state.access = await api("/api/access");
      if (state.access.venue && state.access.venue.id) localStorage.setItem("bd_active_venue_id", String(state.access.venue.id));
      render();
      byId("access-loading").classList.add("hidden");
      byId("access-content").classList.remove("hidden");
    } catch (error) {
      byId("access-loading").textContent = error.status === 401 ? "Сессия завершена. Войдите снова." : error.message;
      notice(error.message, "error");
    }
  }

  async function createInvite() {
    var button = byId("create-invite");
    button.disabled = true;
    try {
      var result = await api("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: byId("invite-role").value })
      });
      state.lastInvite = result.invite;
      byId("invite-code").textContent = result.invite.code;
      byId("invite-expiry").textContent = "Действует до " + dateTime(result.invite.expiresAt) + " и только для одного входа.";
      byId("invite-result").classList.remove("hidden");
      notice("Одноразовый код создан");
      await load();
    } catch (error) { notice(error.message, "error"); }
    finally { button.disabled = false; }
  }

  async function copy(value, success) {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); notice(success); }
    catch { window.prompt("Скопируйте значение", value); }
  }

  async function revokeInvite(id) {
    if (!window.confirm("Отозвать этот код приглашения?")) return;
    try {
      await api("/api/access/invites/" + encodeURIComponent(id), { method: "DELETE" });
      notice("Код отозван");
      await load();
    } catch (error) { notice(error.message, "error"); }
  }

  async function joinVenue() {
    var code = byId("join-code").value.trim();
    if (!code) { notice("Введите код приглашения", "error"); return; }
    try {
      var result = await api("/api/access/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code })
      });
      localStorage.setItem("bd_active_venue_id", String(result.activeVenueId));
      if (result.role) localStorage.setItem("bd_active_role", result.role);
      if (Array.isArray(result.permissions)) localStorage.setItem("bd_active_permissions", JSON.stringify(result.permissions));
      window.location.assign("/employees?venue=" + encodeURIComponent(result.activeVenueId));
    } catch (error) { notice(error.message, "error"); }
  }

  async function updateMember(id, changes, message) {
    try {
      await api("/api/access/members/" + encodeURIComponent(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes)
      });
      notice(message || "Доступ обновлён");
      await load();
    } catch (error) {
      notice(error.message, "error");
      await load();
    }
  }

  function renderPermissionChecks(member, defaultsOnly) {
    var root = byId("permission-list");
    clear(root);
    var selected = defaultsOnly ? roleDefaults(member.role) : new Set(member.permissions || []);
    var groups = new Map();
    (state.access.permissionDefinitions || []).filter(function (item) { return !item.ownerOnly; }).forEach(function (definition) {
      if (!groups.has(definition.group)) groups.set(definition.group, []);
      groups.get(definition.group).push(definition);
    });
    groups.forEach(function (definitions, groupName) {
      var group = node("section", "permission-group");
      group.appendChild(node("h3", "", groupName));
      definitions.forEach(function (definition) {
        var label = node("label", "permission-option");
        var input = document.createElement("input");
        input.type = "checkbox";
        input.value = definition.key;
        input.checked = selected.has(definition.key);
        var copy = node("span");
        copy.appendChild(node("strong", "", definition.label));
        copy.appendChild(node("small", "", definition.description));
        label.appendChild(input);
        label.appendChild(copy);
        group.appendChild(label);
      });
      root.appendChild(group);
    });
  }

  function openPermissions(member) {
    state.selectedMember = member;
    byId("permission-title").textContent = "Права: " + member.name;
    byId("permission-subtitle").textContent = "Роль — " + roleLabel(member.role) + ". Изменения относятся только к текущему заведению.";
    renderPermissionChecks(member, false);
    byId("permission-sheet").classList.remove("hidden");
    document.body.classList.add("sheet-open");
  }

  function closePermissions() {
    state.selectedMember = null;
    byId("permission-sheet").classList.add("hidden");
    document.body.classList.remove("sheet-open");
  }

  async function savePermissions() {
    var member = state.selectedMember;
    if (!member) return;
    var defaults = roleDefaults(member.role);
    var selected = new Set(Array.from(document.querySelectorAll("#permission-list input:checked")).map(function (input) { return input.value; }));
    var all = (state.access.permissionDefinitions || []).filter(function (item) { return !item.ownerOnly; }).map(function (item) { return item.key; });
    var allow = all.filter(function (key) { return selected.has(key) && !defaults.has(key); });
    var deny = all.filter(function (key) { return defaults.has(key) && !selected.has(key); });
    await updateMember(member.id, { permissions: { allow: allow, deny: deny } }, "Индивидуальные права сохранены");
    closePermissions();
  }

  byId("create-invite").addEventListener("click", createInvite);
  byId("copy-invite-code").addEventListener("click", function () { copy(state.lastInvite && state.lastInvite.code, "Код скопирован"); });
  byId("copy-invite-link").addEventListener("click", function () { copy(state.lastInvite && state.lastInvite.joinUrl, "Ссылка скопирована"); });
  byId("join-venue").addEventListener("click", joinVenue);
  document.querySelectorAll("[data-close-permissions]").forEach(function (button) { button.addEventListener("click", closePermissions); });
  byId("reset-permissions").addEventListener("click", function () { if (state.selectedMember) renderPermissionChecks(state.selectedMember, true); });
  byId("save-permissions").addEventListener("click", savePermissions);
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") closePermissions(); });
  load();
})();
