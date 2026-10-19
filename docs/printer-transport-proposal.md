# USB and LAN printing architecture

Current code maps canonical menu section IDs to logical printers and stores immutable pending/unconfigured preparation tickets inside orders. No physical transport exists. Cancellation tickets retain the original route. The waiter never chooses a section.

## Minimal working transport

Proposed first supported host: one continuously running Windows computer in each venue. A locally installed Print Agent connects outward over TLS to a venue-scoped queue; PWA/iPhone submits authenticated jobs to that queue. USB uses an installed Windows printer queue/driver; LAN uses a validated ESC/POS profile over TCP. Raw network write and spool acceptance are delivery stages, not proof of paper output. USB raw ESC/POS needs a compatible queue/profile; arbitrary office printers require a renderer/driver path and are outside the first thermal-ticket scope.

Manager flow: pair node (short-lived pairing; separate permission for persistent credential creation), discover/select a local queue or enter a LAN endpoint, choose a supported model/profile/paper width/code page, run a labelled test job, confirm observed result, then bind venue sections. Preserve route snapshots for cancellation after configuration changes. No UI-only endpoint saving presented as completed connection.

Server durable jobs: venue + original ticket ID uniqueness, immutable payload hash, revisioned route snapshot, lease and attempt records. Agent durable receipt journal prevents replay after restart. States: unconfigured, pending, leased, sending, accepted_by_transport, failed_before_send, outcome_unknown, operator_confirmed. A crash after bytes may have reached the device means outcome_unknown; do not blindly retry. Explicit reprint creates a linked КОПИЯ job. Lease expiry alone must not resubmit potentially printed work. Enforce per-printer ordering and cancellation dependency on original ticket; separate printer failures do not stop others.

Permission boundary: pairing, revocation and route management restricted to venue managers; agent token can fetch/ack only its assigned venue/printers. No arbitrary remote shell or client-provided files/commands. Endpoint allowlist managed locally, no public printer port/firewall exposure. Cloud queue does not provide full offline POS. Device status support varies; never infer physical success from TCP write alone.

## Evidence supplied by parent

- Poster uses installed desktop POS for USB: https://knowledge-base.joinposter.com/en/connect-usb-printer-to-poster
- Poster kitchen/bar routing, cancellation and iOS local-network access: https://knowledge-base.joinposter.com/en/how-to-print-orders-to-kitchen-or-bar
- Hardware compatibility remains model-specific: https://knowledge-base.joinposter.com/uk-ua/supported-hardware
- r_keeper separate print app/service: https://docs.rkeeper.ru/rk7/latest/ru/nastrojka-stantsii-pechati-4053984.html
- r_keeper TCP port configuration: https://docs.rkeeper.ru/rk7/latest/ru/nastrojka-kassovoj-stantsii-4053903.html
- Archived iikoOffice 8.1 computer-bound COM/TCPIP/Windows queue equipment, not a current universal compatibility matrix: https://ru.iiko.help/resources/Storage/archive/PDF/RU_iikoOffice_8.1.pdf

## Acceptance before release

Software tests: duplicate delivery, crash before/after write, lease expiry, revocation, venue isolation, cancellation original route, ordering, queue restart, explicit copy. Hardware matrix: each supported USB/LAN model + OS/driver/profile, Cyrillic, paper widths, cutter, out-of-paper, disconnected cable/network, power loss, spooler restart. Start with at least one validated USB and one LAN model; all real hardware checks are currently unperformed. No support promise for all ESC/POS models.

Product agreement to an always-on Windows computer received 2026-10-19. Stage 1 local source implementation and manual export/import are documented in tools/print-agent/README.md. Stage 2 adds cloud delivery/pairing/revocation and PWA routing/status/test controls; see docs/print-cloud-stage2.md for pilot limitations. Approval is still required before installation, permanent credentials or security changes. No printer transport has been installed or enabled in any venue.
