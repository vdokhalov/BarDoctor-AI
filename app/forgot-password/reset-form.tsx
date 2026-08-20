"use client";

import Link from "next/link";
import { useState } from "react";

type ResetResponse = {
  ok: boolean;
  error?: string;
  needsChatGPTSignIn?: boolean;
};

export function ResetPasswordForm({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmation) {
      setError("Пароли не совпадают");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as ResetResponse;
      if (!result.ok) {
        if (result.needsChatGPTSignIn) {
          window.location.assign(
            "/signin-with-chatgpt?return_to=%2Fforgot-password",
          );
          return;
        }
        setError(result.error ?? "Не удалось установить новый пароль");
        return;
      }
      setComplete(true);
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  if (complete) {
    return (
      <div className="bd-recovery-complete" role="status">
        <span className="bd-recovery-check" aria-hidden="true">✓</span>
        <h1>Пароль установлен</h1>
        <p>Теперь войдите в BarDoctor с новым паролем.</p>
        <Link className="bd-recovery-primary" href="/login">Вернуться ко входу</Link>
      </div>
    );
  }

  return (
    <>
      <div className="bd-recovery-heading">
        <p className="bd-recovery-kicker">Безопасное восстановление</p>
        <h1>Установите новый пароль</h1>
        <p>
          Учётная запись ChatGPT подтверждена. Укажите email нужного аккаунта
          BarDoctor и задайте новый пароль.
        </p>
      </div>

      <form className="bd-recovery-form" onSubmit={submit}>
        <label>
          <span>Email аккаунта BarDoctor</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            disabled={saving}
            required
          />
        </label>

        <label>
          <span>Новый пароль</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            minLength={6}
            disabled={saving}
            required
          />
        </label>

        <label>
          <span>Повторите пароль</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => {
              setConfirmation(event.target.value);
              setError("");
            }}
            minLength={6}
            disabled={saving}
            required
          />
        </label>

        {error ? (
          <div className="bd-recovery-error" role="alert">{error}</div>
        ) : null}

        <button
          className="bd-recovery-primary"
          type="submit"
          disabled={
            saving
            || !email.trim()
            || password.length < 6
            || confirmation.length < 6
          }
        >
          {saving ? "Сохраняем…" : "Установить новый пароль"}
        </button>
      </form>

      <Link className="bd-recovery-back" href="/login">Вернуться ко входу</Link>
    </>
  );
}
