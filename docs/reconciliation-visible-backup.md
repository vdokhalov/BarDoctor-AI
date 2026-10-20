# Visible reconciliation backup recovery

The existing sales-journal preview now displays its complete JSON response in a readonly textarea, together with operationId and exact character/UTF-8 byte counts. It is the same untruncated JSON used by the existing download button, including backup, IDs, previewRevision and backupRevision. Text is assigned through textContent/value, never interpreted as HTML.

A user can download as before, copy the complete JSON through the Clipboard API, or explicitly select the whole visible JSON and save it manually to a file. Failed clipboard access does not mark export preparation complete. No browser internals, hidden state or credentials are needed. Viewing/selecting is explicitly described as insufficient to save a file.

The apply guard still requires a current preview, an export-preparation action and the explicit checkbox confirming that the full JSON was saved to a file and checked. Selecting/copying does not itself check the box. Preview changes reset export preparation and acknowledgement. The server's backupSaved/confirmCoverage/revision/CAS checks are unchanged. No new route, server storage or stock correction is introduced.

Scoped Chromium 390 test uses the actual journal component and isolated real handler. It verifies a >200 KB JSON exactly against the handler response, including Cyrillic, two spaces, the end-of-capture sentinel, IDs and both revisions; readonly content and value match. Manual selection covers every character; a file saved from that visible value parses to the complete response. Apply stays disabled without acknowledgement and without an export-preparation action. Existing download, stale-preview, empty-response and uncertain-apply status recovery checks also pass.

Browser handoff: open the fresh preview, read operationId, save the entire readonly JSON to a local file using supported normal UI text/copy facilities, parse it and compare full character/byte count and IDs/revisions. Only then check the saved-copy acknowledgement. A screenshot or shortened accessibility dump is not a full backup. Do not edit stock to compensate for whitespace differences in prior capture artifacts.
