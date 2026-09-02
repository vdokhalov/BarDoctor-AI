"use client";

import { useEffect } from "react";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch("/api/client-runtime-diagnostic", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: "route-error-v1",
        kind: "route-boundary",
        message: error.message,
        source: error.digest || "app-route",
        path: window.location.pathname,
      }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <main role="alert" style={{ padding: 24, fontFamily: "system-ui", color: "#fff", background: "#070911", minHeight: "100vh" }}>
      <h1>Раздел временно недоступен</h1>
      <p>Данные не изменены. Можно безопасно повторить загрузку.</p>
      <button type="button" onClick={reset}>Повторить</button>
    </main>
  );
}

