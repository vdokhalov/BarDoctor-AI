import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Eye, EyeOff, User, Mail, Phone, Lock, ChevronLeft, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import Button from '@/components/ds/Button';
import Input from '@/components/ds/Input';
import { cn } from '@/lib/utils';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

interface FormState {
  name: string;
  surname: string;
  phone: string;
  email: string;
  password: string;
  repeatPassword: string;
}

export default function Register() {
  const [, navigate] = useLocation();

  const [form, setForm] = useState<FormState>({
    name: '', surname: '', phone: '', email: '', password: '', repeatPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  // Live password mismatch — only shown once user typed something in repeat field
  const passwordMismatch =
    form.repeatPassword.length > 0 && form.password !== form.repeatPassword;

  const errors = {
    name:           submitted && !form.name ? 'Введите имя' : '',
    surname:        submitted && !form.surname ? 'Введите фамилию' : '',
    phone:          submitted && !form.phone ? 'Введите номер телефона' : '',
    email:          submitted && !form.email ? 'Введите email' : '',
    password:       submitted && !form.password ? 'Введите пароль' : '',
    repeatPassword:
      passwordMismatch
        ? 'Пароли не совпадают'
        : submitted && !form.repeatPassword
        ? 'Повторите пароль'
        : '',
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const valid =
      form.name &&
      form.surname &&
      form.phone &&
      form.email &&
      form.password &&
      form.repeatPassword &&
      form.password === form.repeatPassword &&
      accepted;
    if (valid) navigate('/onboarding');
  };

  return (
    <AppShell>
      {/* Top glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 28% at 50% 0%, hsl(240 78% 64% / 0.08) 0%, transparent 70%)',
        }}
      />

      <SafeArea className="relative z-10 flex flex-col px-6 pb-12">

        {/* ── Header ── */}
        <motion.div
          custom={0} variants={fadeUp} initial="hidden" animate="visible"
          className="flex items-center justify-between pt-2 mb-8"
        >
          <button
            onClick={() => navigate('/login')}
            aria-label="Назад"
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-foreground/5 active:bg-foreground/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" strokeWidth={2.2} />
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-muted-foreground tracking-wide uppercase">
              Шаг
            </span>
            <div className="flex items-center gap-1">
              <div className="w-5 h-1.5 rounded-full bg-primary" />
              <div className="w-5 h-1.5 rounded-full bg-border" />
            </div>
          </div>
        </motion.div>

        {/* ── Title ── */}
        <motion.div
          custom={1} variants={fadeUp} initial="hidden" animate="visible"
          className="mb-8"
        >
          <h1 className="text-[30px] font-bold text-foreground tracking-tight leading-tight mb-1.5">
            Создать аккаунт
          </h1>
          <p className="text-[15px] text-muted-foreground">
            Заполните данные для регистрации
          </p>
        </motion.div>

        {/* ── Name + Surname (2-column) ── */}
        <motion.div
          custom={2} variants={fadeUp} initial="hidden" animate="visible"
          className="grid grid-cols-2 gap-3 mb-4"
        >
          <Input
            label="Имя"
            type="text"
            placeholder="Алексей"
            value={form.name}
            onChange={set('name')}
            leftIcon={<User className="w-[17px] h-[17px]" />}
            error={errors.name}
          />
          <Input
            label="Фамилия"
            type="text"
            placeholder="Иванов"
            value={form.surname}
            onChange={set('surname')}
            error={errors.surname}
          />
        </motion.div>

        {/* ── Phone ── */}
        <motion.div
          custom={3} variants={fadeUp} initial="hidden" animate="visible"
          className="mb-4"
        >
          <Input
            label="Телефон"
            type="tel"
            placeholder="+7 (999) 000-00-00"
            value={form.phone}
            onChange={set('phone')}
            leftIcon={<Phone className="w-[17px] h-[17px]" />}
            error={errors.phone}
          />
        </motion.div>

        {/* ── Email ── */}
        <motion.div
          custom={4} variants={fadeUp} initial="hidden" animate="visible"
          className="mb-4"
        >
          <Input
            label="Email"
            type="email"
            placeholder="example@mail.ru"
            value={form.email}
            onChange={set('email')}
            leftIcon={<Mail className="w-[17px] h-[17px]" />}
            error={errors.email}
          />
        </motion.div>

        {/* ── Password ── */}
        <motion.div
          custom={5} variants={fadeUp} initial="hidden" animate="visible"
          className="mb-4"
        >
          <Input
            label="Пароль"
            type={showPassword ? 'text' : 'password'}
            placeholder="Минимум 8 символов"
            value={form.password}
            onChange={set('password')}
            leftIcon={<Lock className="w-[17px] h-[17px]" />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {showPassword
                  ? <EyeOff className="w-[17px] h-[17px]" />
                  : <Eye className="w-[17px] h-[17px]" />}
              </button>
            }
            error={errors.password}
          />
        </motion.div>

        {/* ── Repeat Password ── */}
        <motion.div
          custom={6} variants={fadeUp} initial="hidden" animate="visible"
          className="mb-6"
        >
          <Input
            label="Повторите пароль"
            type={showRepeat ? 'text' : 'password'}
            placeholder="••••••••"
            value={form.repeatPassword}
            onChange={set('repeatPassword')}
            leftIcon={<Lock className="w-[17px] h-[17px]" />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowRepeat((v) => !v)}
                aria-label={showRepeat ? 'Скрыть пароль' : 'Показать пароль'}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {showRepeat
                  ? <EyeOff className="w-[17px] h-[17px]" />
                  : <Eye className="w-[17px] h-[17px]" />}
              </button>
            }
            error={errors.repeatPassword}
          />
        </motion.div>

        {/* ── Terms checkbox ── */}
        <motion.div
          custom={7} variants={fadeUp} initial="hidden" animate="visible"
          className="mb-8"
        >
          <button
            type="button"
            onClick={() => setAccepted((v) => !v)}
            className="flex items-start gap-3 w-full text-left"
          >
            {/* Custom checkbox */}
            <div
              className={cn(
                'w-5 h-5 rounded-[6px] border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-150',
                accepted
                  ? 'bg-primary border-primary'
                  : submitted && !accepted
                  ? 'border-destructive bg-destructive/5'
                  : 'border-border bg-transparent',
              )}
            >
              {accepted && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
            </div>

            <span className="text-[14px] text-muted-foreground leading-snug">
              Я принимаю{' '}
              <Link href="/terms" onClick={(e) => e.stopPropagation()}>
                <span className="text-foreground underline underline-offset-2 decoration-foreground/30">
                  Условия использования
                </span>
              </Link>
              {' '}и{' '}
              <Link href="/privacy" onClick={(e) => e.stopPropagation()}>
                <span className="text-foreground underline underline-offset-2 decoration-foreground/30">
                  Политику конфиденциальности
                </span>
              </Link>
            </span>
          </button>

          {submitted && !accepted && (
            <p className="text-[13px] text-destructive mt-2 ml-8">
              Необходимо принять условия
            </p>
          )}
        </motion.div>

        {/* ── Submit ── */}
        <motion.div
          custom={8} variants={fadeUp} initial="hidden" animate="visible"
          className="flex flex-col gap-3"
        >
          <Button variant="primary" fullWidth onClick={handleSubmit}>
            Создать аккаунт
          </Button>

          <div className="flex justify-center pt-2">
            <Link href="/login">
              <span className="text-[14px] text-muted-foreground">
                Уже есть аккаунт?{' '}
                <span className="text-foreground font-semibold">Войти</span>
              </span>
            </Link>
          </div>
        </motion.div>

      </SafeArea>
    </AppShell>
  );
}
