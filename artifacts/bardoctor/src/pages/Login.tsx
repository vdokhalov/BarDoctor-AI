import React from 'react';
import { Link } from 'wouter';
import { Eye, ChevronLeft } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';

export default function Login() {
  return (
    <AppShell>
      <SafeArea className="flex flex-col min-h-[100dvh] pt-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <Link href="/" className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
            <ChevronLeft className="w-6 h-6 text-[#1A1A2E]" />
          </Link>
          <button className="text-[15px] font-medium text-[#8E8E9A]">
            Пропустить
          </button>
        </div>

        {/* Logo & Title */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-14 h-14 bg-[#4F46E5] rounded-full flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
            <span className="text-white text-xl font-bold tracking-tighter">BD</span>
          </div>
          <h1 className="text-[28px] font-bold text-[#1A1A2E] tracking-tight mb-2">Добро пожаловать</h1>
          <p className="text-[16px] text-[#8E8E9A]">Войдите в свой аккаунт</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 mb-8">
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
          <div className="flex justify-end">
            <button className="text-[14px] font-medium text-[#4F46E5]">Забыли пароль?</button>
          </div>
        </div>

        <Link href="/home" className="w-full">
          <button className="w-full h-14 bg-[#1A1A2E] text-white rounded-xl text-[16px] font-semibold active:scale-[0.98] transition-transform">
            Войти
          </button>
        </Link>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="h-[1px] flex-1 bg-[#E8E8EC]"></div>
          <span className="text-[13px] font-medium text-[#8E8E9A] uppercase tracking-wider">Или</span>
          <div className="h-[1px] flex-1 bg-[#E8E8EC]"></div>
        </div>

        {/* Register Link */}
        <div className="mt-auto pb-8 flex justify-center">
          <Link href="/register" className="text-[15px] text-[#8E8E9A] font-medium">
            Нет аккаунта? <span className="text-[#1A1A2E] font-semibold">Зарегистрироваться</span>
          </Link>
        </div>
      </SafeArea>
    </AppShell>
  );
}
