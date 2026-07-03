import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import PageHeader from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';

export default function Tasks() {
  const [activeFilter, setActiveFilter] = useState('Все');
  const filters = ['Все', 'Активные', 'Завершённые'];

  return (
    <AppShell showBottomNav>
      <PageHeader title="Задачи" />
      <SafeArea>
        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap transition-colors",
                activeFilter === filter 
                  ? "bg-[#1A1A2E] text-white" 
                  : "bg-white text-[#8E8E9A] border border-[#E8E8EC]"
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="bg-white rounded-2xl border border-[#E8E8EC] shadow-sm overflow-hidden">
          <div className="flex items-start gap-4 p-4 border-b border-[#E8E8EC] active:bg-black/5 transition-colors cursor-pointer">
            <div className="w-6 h-6 rounded-full border-2 border-[#E8E8EC] mt-0.5 shrink-0 flex items-center justify-center">
            </div>
            <div className="flex-1">
              <h3 className="text-[16px] font-medium text-[#1A1A2E] leading-tight mb-1">
                Провести инвентаризацию бара
              </h3>
              <div className="flex items-center justify-between mt-2">
                <StatusBadge label="Склад" variant="neutral" />
                <span className="text-[13px] text-[#8E8E9A]">Сегодня</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 border-b border-[#E8E8EC] active:bg-black/5 transition-colors cursor-pointer">
            <div className="w-6 h-6 rounded-full border-2 border-[#E8E8EC] mt-0.5 shrink-0 flex items-center justify-center">
            </div>
            <div className="flex-1">
              <h3 className="text-[16px] font-medium text-[#1A1A2E] leading-tight mb-1">
                Очистка кофемашины
              </h3>
              <div className="flex items-center justify-between mt-2">
                <StatusBadge label="Оборудование" variant="warning" />
                <span className="text-[13px] text-[#8E8E9A]">Завтра</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 border-b border-[#E8E8EC] active:bg-black/5 transition-colors cursor-pointer">
            <div className="w-6 h-6 rounded-full border-2 border-[#E8E8EC] mt-0.5 shrink-0 flex items-center justify-center">
            </div>
            <div className="flex-1">
              <h3 className="text-[16px] font-medium text-[#1A1A2E] leading-tight mb-1">
                Заказать сиропы Monin
              </h3>
              <div className="flex items-center justify-between mt-2">
                <StatusBadge label="Закупки" variant="primary" />
                <span className="text-[13px] text-[#8E8E9A]">28 Окт</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 active:bg-black/5 transition-colors cursor-pointer">
            <div className="w-6 h-6 rounded-full border-2 border-[#4F46E5] bg-[#4F46E5] mt-0.5 shrink-0 flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-[16px] font-medium text-[#8E8E9A] line-through leading-tight mb-1">
                Составить график на ноябрь
              </h3>
              <div className="flex items-center justify-between mt-2">
                <StatusBadge label="Управление" variant="neutral" className="opacity-60" />
                <span className="text-[13px] text-[#8E8E9A]">Вчера</span>
              </div>
            </div>
          </div>
        </div>
      </SafeArea>

      {/* Floating Action Button (Alternative to the central nav FAB) */}
      <button className="fixed bottom-[100px] right-6 w-14 h-14 bg-[#1A1A2E] rounded-full shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform z-40">
        <Plus className="w-6 h-6" />
      </button>
    </AppShell>
  );
}
