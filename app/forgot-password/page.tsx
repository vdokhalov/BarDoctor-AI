import Image from "next/image";
import Link from "next/link";
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";
import "./forgot-password.css";
import { ResetPasswordForm } from "./reset-form";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const user = await getChatGPTUser();

  return (
    <main className="bd-recovery-page">
      <section className="bd-recovery-card">
        <Link className="bd-recovery-brand" href="/login" aria-label="BarDoctor">
          <Image
            className="bd-recovery-brand-mark"
            src="/icons/bardoctor-mark-v159.svg"
            alt=""
            aria-hidden="true"
            width={42}
            height={42}
          />
          <strong>BarDoctor</strong>
        </Link>
        {user ? (
          <ResetPasswordForm defaultEmail={user.email} />
        ) : (
          <div className="bd-recovery-identity">
            <p className="bd-recovery-kicker">Безопасное восстановление</p>
            <h1>Подтвердите владельца аккаунта</h1>
            <p>
              Войдите через связанную учётную запись ChatGPT. После подтверждения
              вы сможете установить новый пароль BarDoctor.
            </p>
            <Link
              className="bd-recovery-primary"
              href={chatGPTSignInPath("/forgot-password")}
            >
              Подтвердить через ChatGPT
            </Link>
            <Link className="bd-recovery-back" href="/login">
              Вернуться ко входу
            </Link>
          </div>
        )}
        <p className="bd-recovery-security">
          Пароль меняется только после подтверждения связанной учётной записи
          ChatGPT. Данные заведения при восстановлении не изменяются.
        </p>
      </section>
    </main>
  );
}
