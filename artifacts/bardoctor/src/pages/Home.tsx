import React from 'react';
import { Bell, Banknote, Users, Coffee, CheckSquare, Plus, Clock, AlertTriangle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import MetricCard from '@/components/shared/MetricCard';
import SectionTitle from '@/components/shared/SectionTitle';
import ListRow from '@/components/shared/ListRow';

export default function Home() {
  const currentDate = new Intl.DateTimeFormat('ru-RU', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  }).format(new Date());

  return (
    <AppShell showBottomNav>
      <SafeArea className="pt-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-[24px] font-bold text-[#1A1A2E] tracking-tight mb-1">
              Доброе утро, Алексей <span className="inline-block origin-bottom-right hover:animate-wave">👋</span>
            </h1>
            <p className="text-[14px] text-[#8E8E9A] capitalize-first">{currentDate}</p>
          </div>
          <button className="relative w-10 h-10 bg-white border border-[#E8E8EC] rounded-full flex items-center justify-center shadow-sm">
            <Bell className="w-5 h-5 text-[#1A1A2E]" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#EF4444] rounded-full border-2 border-white"></span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <MetricCard 
            label="Выручка сегодня" 
            value="—" 
            icon={<Banknote className="w-4 h-4" />} 
          />
          <MetricCard 
            label="Заказы" 
            value="—" 
            icon={<Coffee className="w-4 h-4" />} 
          />
          <MetricCard 
            label="Загрузка зала" 
            value="—" 
            icon={<Users className="w-4 h-4" />} 
          />
          <MetricCard 
            label="Активные задачи" 
            value="—" 
            icon={<CheckSquare className="w-4 h-4" />} 
          />
        </div>

        {/* Quick Actions */}
        <SectionTitle title="Быстрые действия" />
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 no-scrollbar">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E8E8EC] rounded-xl whitespace-nowrap shadow-sm hover:border-[#4F46E5] transition-colors">
            <Plus className="w-4 h-4 text-[#4F46E5]" />
            <span className="text-[14px] font-medium text-[#1A1A2E]">Новая задача</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E8E8EC] rounded-xl whitespace-nowrap shadow-sm hover:border-[#4F46E5] transition-colors">
            <CheckSquare className="w-4 h-4 text-[#4F46E5]" />
            <span className="text-[14px] font-medium text-[#1A1A2E]">Инвентаризация</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E8E8EC] rounded-xl whitespace-nowrap shadow-sm hover:border-[#4F46E5] transition-colors">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-[14px] font-medium text-[#1A1A2E]">Поломка</span>
          </button>
        </div>

        {/* Recent Events */}
        <SectionTitle title="Последние события" action="Все" />
        <div className="bg-white rounded-2xl border border-[#E8E8EC] shadow-sm overflow-hidden">
          <ListRow 
            icon={<Coffee className="w-5 h-5" />}
            title="Открыта новая смена"
            subtitle="Бармен: Иван С."
            meta="08:00"
            className="px-4 border-b border-[#E8E8EC]"
          />
          <ListRow 
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Кофемашина"
            subtitle="Требуется очистка"
            meta="10:15"
            destructive
            className="px-4 border-b border-[#E8E8EC]"
          />
          <ListRow 
            icon={<Clock className="w-5 h-5" />}
            title="Поставка сиропов"
            subtitle="Ожидается сегодня"
            meta="12:00"
            className="px-4"
          />
        </div>
      </SafeArea>
    </AppShell>
  );
}
