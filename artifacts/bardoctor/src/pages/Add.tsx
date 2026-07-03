import React from 'react';
import { Package, CheckSquare, Wrench, FileText, X } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import { useNavigation } from '@/hooks/useNavigation';

export default function Add() {
  const { goBack } = useNavigation();

  return (
    <AppShell className="bg-[#F9F9FB]">
      <SafeArea className="flex flex-col min-h-[100dvh] pt-6">
        <div className="flex justify-end mb-8">
          <button 
            onClick={goBack}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#E8E8EC] active:scale-95 transition-transform"
          >
            <X className="w-6 h-6 text-[#1A1A2E]" />
          </button>
        </div>

        <div className="mb-10 px-2">
          <h1 className="text-[32px] font-bold text-[#1A1A2E] tracking-tight mb-2">Что добавить?</h1>
          <p className="text-[16px] text-[#8E8E9A]">Выберите тип записи для создания</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="bg-white p-6 rounded-[24px] shadow-card border border-[#E8E8EC] flex flex-col items-center justify-center text-center gap-4 active:scale-[0.98] transition-all">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
              <Package className="w-8 h-8 text-[#4F46E5]" />
            </div>
            <span className="text-[16px] font-semibold text-[#1A1A2E]">Товар</span>
          </button>
          
          <button className="bg-white p-6 rounded-[24px] shadow-card border border-[#E8E8EC] flex flex-col items-center justify-center text-center gap-4 active:scale-[0.98] transition-all">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <CheckSquare className="w-8 h-8 text-[#3B82F6]" />
            </div>
            <span className="text-[16px] font-semibold text-[#1A1A2E]">Задача</span>
          </button>

          <button className="bg-white p-6 rounded-[24px] shadow-card border border-[#E8E8EC] flex flex-col items-center justify-center text-center gap-4 active:scale-[0.98] transition-all">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
              <Wrench className="w-8 h-8 text-[#F59E0B]" />
            </div>
            <span className="text-[16px] font-semibold text-[#1A1A2E]">Оборудование</span>
          </button>

          <button className="bg-white p-6 rounded-[24px] shadow-card border border-[#E8E8EC] flex flex-col items-center justify-center text-center gap-4 active:scale-[0.98] transition-all">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center">
              <FileText className="w-8 h-8 text-[#E11D48]" />
            </div>
            <span className="text-[16px] font-semibold text-[#1A1A2E]">Заметка</span>
          </button>
        </div>
      </SafeArea>
    </AppShell>
  );
}
