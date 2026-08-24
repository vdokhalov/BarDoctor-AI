(function installControlledMigrationDiscovery() {
  "use strict";

  var authoritativeKeys = [
    "bd_assortment_v1",
    "bd_stock_movements",
    "bd_purchase_documents",
    "bd_inventory_snapshots",
    "bd_suppliers"
  ];

  function parse(value) {
    try { return { ok: true, data: JSON.parse(value) }; }
    catch { return { ok: false, data: null }; }
  }

  function sourceKeys(storeKey, email, venueId) {
    var values = [];
    if (email && venueId) values.push(storeKey + "__" + email + "__venue_" + venueId);
    if (email) values.push(storeKey + "__" + email);
    values.push(storeKey);
    return Array.from(new Set(values));
  }

  /**
   * Read-only evidence collector. It never sends, deletes, moves, or rewrites a
   * browser value. The caller must explicitly submit the returned bundle to a
   * platform-admin dry-run endpoint.
   */
  window.bdCollectLegacyMigrationCandidates = function collectLegacyMigrationCandidates() {
    var email = localStorage.getItem("bd_session") || "";
    var venueId = localStorage.getItem("bd_active_venue_id") || "";
    var candidates = {};
    var evidence = [];
    authoritativeKeys.forEach(function (storeKey) {
      var keys = sourceKeys(storeKey, email, venueId);
      for (var index = 0; index < keys.length; index += 1) {
        var sourceKey = keys[index];
        var raw = localStorage.getItem(sourceKey);
        if (raw === null) continue;
        var parsed = parse(raw);
        evidence.push({
          storeKey: storeKey,
          physicalSource: "browser_local_storage",
          sourceKey: sourceKey,
          validJson: parsed.ok,
          bytes: new TextEncoder().encode(raw).byteLength
        });
        if (parsed.ok && !Object.prototype.hasOwnProperty.call(candidates, storeKey)) {
          candidates[storeKey] = {
            source: "browser_local_storage",
            sourceKey: sourceKey,
            capturedAt: new Date().toISOString(),
            data: parsed.data
          };
        }
      }
    });
    return {
      version: "controlled-server-migration-v1",
      venueId: venueId ? Number(venueId) : null,
      readOnly: true,
      writesPerformed: 0,
      candidates: candidates,
      evidence: evidence,
      indexedDb: typeof indexedDB === "undefined"
        ? { observable: false, reason: "api_unavailable" }
        : { observable: true, automaticBusinessRead: false, reason: "no_known_business_object_store_contract" }
    };
  };
})();
