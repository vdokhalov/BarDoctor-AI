import React from 'react';
import { Link } from 'wouter';
import { Eye, ChevronLeft } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';

export default function Register() {
  return (
    <AppShell>
      <SafeArea className="flex flex-col min-h-[100dvh] pt-4">
        {/* Header */}
        <div className="flex justify-start mb-8">
          <Link href="/login" className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
            <ChevronLeft className="w-6 h-6 text-[#1A1A2E]" />
          </Link>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-[#1A1A2E] tracking-tight mb-2">Создать аккаунт</h1>
          <p className="text-[16px] text-[#8E8E9A]">Заполните данные для регистрации</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <input 
              type="text" 
              placeholder="Имя" 
              className="w-full h-14 bg-[#F2F2F7] rounded-xl px-4 text-[16px] outline-none border border-transparent focus:border-[#4F46E5] transition-colors"
            />
          </div>
          <div>
            <input 
              type="email" 
              placeholder="Эл. почта" 
              className="w-full h-14 bg-[#F2F2F7] rounded-xl px-4 text-[16px] outline-none border border-transparent focus:border-[#4F46E5] transition-colors"
            />
          </div>
          <div className="relative">
            <input 
              type="password" 
              placeholder="Пароль" 
              className="w-full h-14 bg-[#F2F2F7] rounded-xl px-4 pr-12 text-[16px] outline-none border border-transparent focus:border-[#4F46E5] transition-colors"
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8E9A] hover:text-[#1A1A2E]">
              <Eye className="w-5 h-5" />
            </button>
          </div>
        </div>

        <Link href="/onboarding" className="w-full">
          <button className="w-full h-14 bg-[#1A1A2E] text-white rounded-xl text-[16px] font-semibold active:scale-[0.98] transition-transform">
            Создать аккаунт
          </button>
        </Link>

        {/* Login Link */}
        <div className="mt-auto pb-8 pt-8 flex justify-center">
          <Link href="/login" className="text-[15px] text-[#8E8E9A] font-medium">
            Уже есть аккаунт? <span className="text-[#1A1A2E] font-semibold">Войти</span>
          </Link>
        </div>
      </SafeArea>
    </AppShell>
  );
}
