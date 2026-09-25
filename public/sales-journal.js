/* Read-only presentation over existing sales documents and POS context. */
(function () {
  "use strict";
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const source = batch => batch.source === "POS_API" && batch.readOnly ? "POS" : batch.source === "MANUAL_GRID" ? "MANUAL" : "IMPORT";
  const sourceLabel = batch => ({POS:"POS",MANUAL:"Ручной ввод",IMPORT:"Импорт"})[source(batch)];
  const payment = batch => (batch.payments || []).map(p => ({CASH:"Наличные",CARD_EXTERNAL:"Карта · внешняя оплата"})[p.method] || "Другой способ").join(", ") || "Не указан";
  const actor = batch => batch.actor?.name || batch.createdBy?.name || "Не указан";
  const actorKey = batch => String(batch.actor?.accountId ?? batch.createdBy?.accountId ?? actor(batch));
  const timestamp = batch => batch.acceptedAt || batch.createdAt;
  const date = value => {
    if (!value || !Number.isFinite(new Date(value).getTime())) return "Не указано";
    return new Intl.DateTimeFormat("ru-RU",{timeZone:window.bdVenueTime?.zone() || "UTC",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(value));
  };
  const businessDate = batch => /^\d{4}-\d{2}-\d{2}$/.test(batch.businessDate || '') ? new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',year:'numeric'}).format(new Date(batch.businessDate+'T12:00:00')) : 'Не указана';
  const shiftName = (batch, shifts) => shifts.find(s => s.id === batch.shiftId)?.label || shifts.find(s => s.id === batch.shiftId)?.shiftName || (batch.shiftId ? "Смена без названия" : "Без смены");
  const amount = batch => Number.isFinite(batch.revenue) ? batch.revenue : null;
  const receiptNumber = batch => "№ " + String(batch.salesEventId || batch.id).slice(-8).toUpperCase();
  function matches(batch, filters) {
    const day = batch.businessDate || String(timestamp(batch) || "").slice(0,10);
    const query = String(filters.query || "").toLocaleLowerCase("ru").replace(/ё/g,"е").trim();
    const text = [batch.id,batch.salesEventId,batch.externalId,batch.comment,...(batch.prices || []).map(p => p.name),...(batch.lines || []).map(l => l.rawName + " " + (l.recipeSnapshot?.menuItem?.name || ""))].join(" ").toLocaleLowerCase("ru").replace(/ё/g,"е");
    return (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to) && (!filters.shift || (batch.shiftId || "NONE") === filters.shift) && (!filters.actor || actorKey(batch) === filters.actor) && (!filters.payment || (filters.payment === "NONE" ? !(batch.payments || []).length : (batch.payments || []).some(p => p.method === filters.payment))) && (!filters.source || source(batch) === filters.source) && (!filters.status || batch.status === filters.status) && (!query || text.includes(query));
  }
  function totals(batches, currency) {
    const receipts = batches.filter(b => b.readOnly && b.status === "POSTED" && b.currency === currency && amount(b) !== null);
    const revenue = receipts.reduce((sum,b) => sum + b.revenue,0);
    return {revenue,count:receipts.length,average:receipts.length ? revenue/receipts.length : null,imports:batches.filter(b => !b.readOnly).length};
  }
  function metadata(batch, shifts, money) {
    return '<dl class="sale-metadata">' + [[batch.readOnly?"Проведена":"Документ создан",date(timestamp(batch))],["Дата учёта",businessDate(batch)],["Смена",shiftName(batch,shifts)],["Сотрудник",actor(batch)],["Источник",sourceLabel(batch)],["Оплата",payment(batch)],["Сумма",amount(batch) === null ? "Не передана источником" : money(amount(batch),batch.currency)]].map(([label,value]) => '<div><dt>'+escape(label)+'</dt><dd>'+escape(value)+'</dd></div>').join('')+'</dl>';
  }
  function movements(batch) {
    const ids = [...(batch.movementIds || []),...(batch.reversalMovementIds || [])];
    if (ids.length) return '<p><a class="journal-link" data-open-route="/warehouse?tab=movements&amp;sourceDocumentId='+encodeURIComponent(batch.id)+'" href="/warehouse?tab=movements&amp;sourceDocumentId='+encodeURIComponent(batch.id)+'">Открыть связанные складские движения ('+ids.length+')</a></p>';
    const none = batch.lines?.length && batch.lines.every(l => l.recipeSnapshot?.consumptionMode === "NONE");
    return '<p class="journal-help">'+(none ? 'Для этих позиций складское списание не требуется.' : 'Связанные складские движения не зарегистрированы. Подробности обработки указаны в позициях документа.')+'</p>';
  }
  window.bdSalesJournal = Object.freeze({escape,source,sourceLabel,payment,actor,actorKey,timestamp,date,businessDate,shiftName,amount,receiptNumber,matches,totals,metadata,movements});
})();
