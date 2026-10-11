type Row = Record<string, unknown>;
/** Read-only prerequisite. Existing cash sessions/history are never adopted or rewritten. */
export function posWorkdayGate(rows: Row[], venueId: number, date?: string) {
  const scoped = rows.filter(row => row.venueId === venueId);
  const active = scoped.filter(row => row.workdayStatus === "OPEN");
  if (active.length > 1) return { ok: false as const, code: "WORKDAY_NEEDS_REVIEW", error: "Найдены несколько открытых рабочих дней. Обратитесь к руководителю.", date: date ?? null };
  if (date && scoped.some(row => row.date === date && row.workdayStatus === "CLOSED")) return { ok: false as const, code: "WORKDAY_CLOSED", error: "Рабочий день закрыт. Новые продажи недоступны.", date };
  if (!active.length || date && active[0].date !== date) return { ok: false as const, code: "WORKDAY_REQUIRED", error: "Сначала руководитель должен открыть рабочий день с командой в разделе «Смены». Для ранее открытой кассы нужна та же дата рабочего дня.", date: date ?? null };
  if (!Array.isArray(active[0].staffing) || !active[0].staffing.length) return { ok: false as const, code: "WORKDAY_TEAM_REQUIRED", error: "В рабочем дне не выбрана команда. Обратитесь к руководителю.", date: String(active[0].date) };
  return { ok: true as const, date: String(active[0].date) };
}
