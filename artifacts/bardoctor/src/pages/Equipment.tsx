import React from 'react';
import { Search, Plus } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import PageHeader from '@/components/layout/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';

export default function Equipment() {
  return (
    <AppShell showBottomNav>
      <PageHeader 
        title="Оборудование" 
        showBack 
        rightElement={
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors text-[#4F46E5]">
            <Plus className="w-6 h-6" />
          </button>
        }
      />
      <SafeArea>
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E9A]" />
          <input 
            type="text" 
            placeholder="Поиск оборудования" 
            className="w-full h-12 bg-white border border-[#E8E8EC] rounded-xl pl-12 pr-4 text-[15px] outline-none focus:border-[#4F46E5] shadow-sm transition-colors placeholder:text-[#8E8E9A]"
          />
        </div>

        {/* Equipment List */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 border border-[#E8E8EC] shadow-card flex items-center gap-4">
            <div className="w-16 h-16 bg-[#F2F2F7] rounded-xl flex items-center justify-center shrink-0">
              <span className="text-2xl">☕️</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-semibold text-[#1A1A2E] truncate mb-1">
                La Marzocco Linea PB
              </h3>
              <p className="text-[13px] text-[#8E8E9A] mb-2 truncate">Барная стойка</p>
              <div className="flex items-center justify-between">
                <StatusBadge label="Работает" variant="success" />
                <span className="text-[12px] text-[#8E8E9A]">ТО: 12 Сен</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#E8E8EC] shadow-card flex items-center gap-4">
            <div className="w-16 h-16 bg-[#F2F2F7] rounded-xl flex items-center justify-center shrink-0">
              <span className="text-2xl">❄️</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-semibold text-[#1A1A2E] truncate mb-1">
                Льдогенератор Brema
              </h3>
              <p className="text-[13px] text-[#8E8E9A] mb-2 truncate">Подсобка</p>
              <div className="flex items-center justify-between">
                <StatusBadge label="Обслуживание" variant="warning" />
                <span className="text-[12px] text-[#8E8E9A]">ТО: 1 Окт</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#E8E8EC] shadow-card flex items-center gap-4">
            <div className="w-16 h-16 bg-[#F2F2F7] rounded-xl flex items-center justify-center shrink-0">
              <span className="text-2xl">🍷</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-semibold text-[#1A1A2E] truncate mb-1">
                Винный шкаф Liebherr
              </h3>
              <p className="text-[13px] text-[#8E8E9A] mb-2 truncate">Зал</p>
              <div className="flex items-center justify-between">
                <StatusBadge label="Работает" variant="success" />
                <span className="text-[12px] text-[#8E8E9A]">ТО: 5 Окт</span>
              </div>
            </div>
          </div>
        </div>
      </SafeArea>
    </AppShell>
  );
}
