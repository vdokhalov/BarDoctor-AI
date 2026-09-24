/* Shared presentation extracted from bdAccountingMoneyV243. No conversion or currency mutation. */
(function () {
  "use strict";
  window.bdFormatAccountingMoney = function (value, currency) {
    if (value == null || !Number.isFinite(Number(value))) return "—";
    var code = String(currency || "").trim().toUpperCase();
    var number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(Number(value));
    if (!code) return number + " —";
    if (code === "PMR_RUB") return number + " руб. ПМР";
    try { return new Intl.NumberFormat("ru-RU", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(Number(value)); }
    catch { return number + " " + code; }
  };
  window.bdFormatSalesCost = function (batch, currency) {
    var full = batch && batch.costStatus === "FULL";
    if (full && batch.totalTheoreticalCost != null) return window.bdFormatAccountingMoney(batch.totalTheoreticalCost, currency);
    if (batch && batch.costStatus === "PARTIAL" && batch.totalTheoreticalCost != null) return "не рассчитана полностью (известная часть: " + window.bdFormatAccountingMoney(batch.totalTheoreticalCost,currency) + ")";
    return "не рассчитана";
  };
})();
