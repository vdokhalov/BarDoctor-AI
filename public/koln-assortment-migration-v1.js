(function () {
  "use strict";
  var output = document.getElementById("koln-migration-output");
  if (!output) return;
  async function phase(name, operationId) {
    var query = "?phase=" + encodeURIComponent(name);
    if (operationId) query += "&operationId=" + encodeURIComponent(operationId);
    var response = await fetch("/api/migration/koln-assortment" + query, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "X-Migration-Intent": "apply-koln-safe-canonical-assortment" }
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || !payload.ok) throw new Error(payload.error || payload.code || "Migration failed");
    return payload;
  }
  async function run() {
    output.textContent = "Шаг 1 из 3: сохраняю snapshot…";
    try {
      var prepared = await phase("prepare");
      output.textContent = "Шаг 2 из 3: переношу безопасные позиции…";
      var applied = await phase("apply", prepared.operationId);
      output.textContent = "Шаг 3 из 3: проверяю сохранность данных…";
      var payload = await phase("validate", applied.operationId || prepared.operationId);
      var result = payload.result || {};
      output.innerHTML = "<strong>Безопасная часть migration выполнена.</strong><br>Canonical positions: +" + (result.createdPositions || 0)
        + "<br>Supplier identities: +" + (result.createdSupplierMappings || 0)
        + "<br>Review queue: " + (result.reviewQueue || 0)
        + "<br>Menu и техкарты сохранены: " + ((payload.invariants || {}).menuPreserved && (payload.invariants || {}).recipesPreserved ? "да" : "нет");
    } catch (error) {
      output.textContent = error && error.message ? error.message : "Migration failed";
    }
  }
  run();
})();
