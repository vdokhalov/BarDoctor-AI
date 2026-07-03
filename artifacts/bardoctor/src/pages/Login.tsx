import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Eye, EyeOff, Mail, Lock, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import Button from '@/components/ds/Button';
import Input from '@/components/ds/Input';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AppShell>
      {/* Subtle radial glow behind logo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 38% at 50% 0%, hsl(240 78% 64% / 0.10) 0%, transparent 70%)',
        }}
      />

      <SafeArea className="relative z-10 flex flex-col min-h-[100dvh] px-6">

        {/* ── Back button ── */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex items-center pt-2 pb-2"
        >
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-foreground/5 active:bg-foreground/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" strokeWidth={2.2} />
          </button>
        </motion.div>

        {/* ── Logo block ── */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center text-center mt-6 mb-10"
        >
          {/* Mark */}
          <div
            className="w-[68px] h-[68px] rounded-[20px] bg-primary flex items-center justify-center mb-5 select-none"
            style={{ boxShadow: '0 8px 32px hsl(240 78% 64% / 0.30), 0 2px 8px hsl(240 78% 64% / 0.14)' }}
          >
            <span className="text-primary-foreground text-[24px] font-bold tracking-tighter">
              BD
            </span>
          </div>

          {/* Wordmark */}
          <h1 className="text-[34px] font-bold text-foreground tracking-tight leading-none mb-2.5">
            BarDoctor
          </h1>

          {/* Subtitle */}
          <p className="text-[15px] text-muted-foreground leading-snug max-w-[230px]">
            AI‑платформа для управления заведением
          </p>
        </motion.div>

        {/* ── Form ── */}
        <div className="flex flex-col gap-4 w-full">
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
            <Input
              label="Email"
              type="email"
              placeholder="example@mail.ru"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-[18px] h-[18px]" />}
            />
          </motion.div>

          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
            <Input
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-[18px] h-[18px]" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword
                    ? <EyeOff className="w-[18px] h-[18px]" />
                    : <Eye className="w-[18px] h-[18px]" />}
                </button>
              }
            />

            {/* Forgot password */}
            <div className="flex justify-end mt-3">
              <Link href="/forgot-password">
                <span className="text-[14px] font-medium text-primary hover:opacity-80 transition-opacity">
                  Забыли пароль?
                </span>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* ── CTA buttons ── */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3 mt-8"
        >
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate('/home')}
          >
            Войти
          </Button>

          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate('/register')}
          >
            Создать аккаунт
          </Button>
        </motion.div>

        {/* ── Spacer + legal ── */}
        <div className="flex-1 min-h-[32px]" />

        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="pb-10 text-center"
        >
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Входя в систему, вы принимаете{' '}
            <span className="text-foreground/60 underline underline-offset-2 decoration-foreground/30">
              Условия использования
            </span>{' '}
            и{' '}
            <span className="text-foreground/60 underline underline-offset-2 decoration-foreground/30">
              Политику конфиденциальности
            </span>
          </p>
        </motion.div>

      </SafeArea>
    </AppShell>
  );
}
