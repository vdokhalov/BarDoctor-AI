"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
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

