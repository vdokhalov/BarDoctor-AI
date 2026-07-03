import React, { useState } from 'react';
import { Banknote, TrendingUp, Users, ShoppingBag } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import PageHeader from '@/components/layout/PageHeader';
import SectionTitle from '@/components/shared/SectionTitle';
import ListRow from '@/components/shared/ListRow';
import { cn } from '@/lib/utils';

export default function Analysis() {
  const [activeRange, setActiveRange] = useState('Неделя');
  const ranges = ['День', 'Неделя', 'Месяц'];

  return (
    <AppShell showBottomNav>
      <PageHeader title="Аналитика" />
      <SafeArea>
        {/* Date Range Selector */}
        <div className="flex p-1 bg-[#F2F2F7] rounded-xl mb-6">
          {ranges.map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={cn(
                "flex-1 py-2 text-[14px] font-medium rounded-lg transition-all",
                activeRange === range 
                  ? "bg-white text-[#1A1A2E] shadow-sm" 
                  : "text-[#8E8E9A]"
              )}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Metrics */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-[#E8E8EC] shadow-card flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-[#4F46E5]" />
              </div>
              <div>
                <p className="text-[14px] text-[#8E8E9A] font-medium mb-1">Выручка</p>
                <p className="text-[24px] font-bold text-[#1A1A2E] leading-none">—</p>
              </div>
            </div>
            <div className="text-[#22C55E] flex items-center gap-1 text-[14px] font-medium bg-green-50 px-2 py-1 rounded-md">
              <TrendingUp className="w-4 h-4" />
              —%
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E8E8EC] shadow-card flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-[#4F46E5]" />
              </div>
              <div>
                <p className="text-[14px] text-[#8E8E9A] font-medium mb-1">Средний чек</p>
                <p className="text-[24px] font-bold text-[#1A1A2E] leading-none">—</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E8E8EC] shadow-card flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#4F46E5]" />
              </div>
              <div>
                <p className="text-[14px] text-[#8E8E9A] font-medium mb-1">Гости</p>
                <p className="text-[24px] font-bold text-[#1A1A2E] leading-none">—</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Items */}
        <SectionTitle title="Популярные позиции" />
        <div className="bg-white rounded-2xl border border-[#E8E8EC] shadow-sm overflow-hidden mb-6">
          <ListRow 
            title="Капучино"
            meta="— шт"
            className="px-4 border-b border-[#E8E8EC]"
          />
          <ListRow 
            title="Круассан классический"
            meta="— шт"
            className="px-4 border-b border-[#E8E8EC]"
          />
          <ListRow 
            title="Эспрессо"
            meta="— шт"
            className="px-4 border-b border-[#E8E8EC]"
          />
          <ListRow 
            title="Матча латте"
            meta="— шт"
            className="px-4"
          />
        </div>
      </SafeArea>
    </AppShell>
  );
}
