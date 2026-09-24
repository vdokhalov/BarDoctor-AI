/* Local draft only. Server sales events remain authoritative. */
(function () {
  "use strict";
  const key = (account, venue, shift) => "bd_pos_draft_v1:" + [account,venue,shift].map(encodeURIComponent).join(":");
  const read = (storage, id) => {
    const raw = storage.getItem(id);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (draft.version !== 1 || typeof draft.id !== "string" || !Array.isArray(draft.lines) || draft.lines.length > 100 || draft.lines.some(line => typeof line.menuItemId !== "string" || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 999)) throw Error("Сохранённый заказ повреждён. Не проводите его; проверьте данные браузера.");
    return draft;
  };
  window.bdPosDraft = Object.freeze({key,read});
})();
