# BarDoctor Integration Hub

## Purpose

External accounting/POS systems remain the source of operational records. BarDoctor is the read-only consumer and analytical layer. A connector must not write back to a vendor system unless a later feature explicitly adds and reviews that capability.

```text
External system → adapter → normalization → validation → mapping → Sync Engine
                → existing BarDoctor purchase/sales paths → stock/finance/recipes/analytics
```

The hub never keeps a second inventory or finance ledger. A successfully imported purchase uses the same `bd_purchase_documents`, `bd_finance_expenses`, `bd_assortment_v1` and `bd_stock_movements` stores as a document confirmed in BarDoctor. Imported sales use `bd_sales_documents`, confirmed recipes and the same stock movements.

## Adapter contract

Adapters implement `IntegrationAdapter` from `lib/bardoctor/integrations/contracts.ts`.

Their responsibility is limited to:

1. authenticate to their vendor;
2. receive or fetch source records;
3. normalize them into `CanonicalEnvelope` records;
4. pass the records to `runIntegrationSync`.

Vendor-specific IDs, pagination and authorization stay inside the connector. Mapping, validation, idempotency, error isolation, logging and BarDoctor business writes stay universal.

Pull/polling connectors additionally implement `PullIntegrationAdapter`. A future local agent sends the versioned `LocalConnectorMessage`. The current production channel is `UniversalFileAdapter`; 1С, iiko, Poster and r_keeper remain explicitly marked as requiring a real adapter.

## Canonical entities

The contract covers `product`, `purchase_document`, `sale`, `stock_balance`, `write_off`, `return`, `recipe`, `supplier` and `employee`. Purchases and sales extend the existing BarDoctor types rather than introducing parallel models.

Every envelope carries:

- `externalId`, `externalSystem`, `venueId`;
- optional external creation/update timestamps;
- `syncStatus`;
- an internal ID after successful application.

The first file adapter conducts `product`, `purchase_document` and `sale`. Other entity contracts are ready for independent adapters but are not presented as active imports.

## File channel

Accepted formats: CSV, XLSX, XLS, JSON and bounded XML, up to 6 MB and 2,000 source rows.

The integrations screen downloads current CSV and JSON examples. CSV/Excel purchase rows are grouped by `documentExternalId`; sales rows are grouped by `saleExternalId`. JSON accepts:

```json
{
  "entityType": "purchase_document",
  "externalSystem": "System name",
  "records": []
}
```

XML deliberately supports a small, non-extensible schema and rejects `DOCTYPE`/entities:

```xml
<BarDoctorImport entityType="purchase_document" externalSystem="System name">
  <Record>
    <externalId>DOC-1</externalId>
    <date>2026-08-09</date>
    <Items>
      <Item><externalProductId>SKU-1</externalProductId><name>Product</name></Item>
    </Items>
  </Record>
</BarDoctorImport>
```

## Mapping

For every external product the engine checks:

1. a confirmed saved mapping for this venue, connection and external ID;
2. an exact internal ID/barcode;
3. a unique, high-confidence normalized name and package match;
4. a user decision.

Low-confidence matches never create products automatically. A user can map to an existing stock/menu position. For purchase products only, the user can explicitly approve creation of a new stock position; the position is created by the normal purchase posting path on retry. Sales must map to an existing active menu item and a confirmed recipe.

## Idempotency and changes

The unique source key is `(venue_id, data_account_id, connection_id, entity_type, external_id)`. The engine also stores a canonical SHA-256 payload hash.

- same source ID and same hash: skip;
- same source ID with a changed financial payload: conflict, no silent reposting;
- validation/mapping failure: keep the individual record for review and retry;
- a sibling failure does not roll back successful independent records in the same run.

The initial safe update strategy deliberately requires review for already-posted changed financial documents; it does not silently reverse inventory or a closed period.

## Tenant and credential boundary

Every hub table includes both `venue_id` and the existing BarDoctor `data_account_id`. Repository queries bind both fields; connection, mapping, log and idempotency data are never selected by an external ID alone.

Connector credentials use AES-GCM with associated data containing venue, data account, connection and credential key. Plaintext is server-only. Credentials can be rotated or revoked and are never included in dashboard responses.

## Adding a connector

1. Implement `IntegrationAdapter` (and `PullIntegrationAdapter` when required).
2. Declare truthful capabilities and channels.
3. Keep secrets in `integration_credentials` through the server-only credential helper.
4. Normalize vendor records into canonical envelopes.
5. Pass envelopes to the Sync Engine with the shared BarDoctor business writer.
6. Add adapter fixtures for pagination, malformed rows, duplicate delivery, changes and tenant separation.

No change to stock, finance, recipes or AI logic should be required.

