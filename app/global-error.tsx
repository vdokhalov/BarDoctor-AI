"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch("/api/client-runtime-diagnostic", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: "global-error-v2",
        kind: "global-boundary",
        message: error.message,
        source: error.digest || "app-root",
        path: "other",
      }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="ru">
      <body style={{ margin: 0 }}>
        <main role="alert" style={{ padding: 24, fontFamily: "system-ui", color: "#fff", background: "#070911", minHeight: "100vh" }}>
          <h1>BarDoctor не смог продолжить работу</h1>
          <p>Не повторяйте последнее действие, если его результат неизвестен. Сначала обновите состояние.</p>
          <button type="button" onClick={reset}>Обновить состояние</button>
        </main>
      </body>
    </html>
  );
}
