import React from 'react';
import { useLocation } from 'wouter';
import { Bell, Shield, Globe, Wrench, HelpCircle, Info, LogOut } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import PageHeader from '@/components/layout/PageHeader';
import ListRow from '@/components/shared/ListRow';

export default function Profile() {
  const [, setLocation] = useLocation();

  return (
    <AppShell showBottomNav>
      <PageHeader title="Профиль" />
      <SafeArea>
        {/* Profile Info */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-4 shadow-sm border border-[#E8E8EC]">
            <span className="text-[28px] font-bold text-[#4F46E5] tracking-tight">АК</span>
          </div>
          <h2 className="text-[22px] font-bold text-[#1A1A2E] tracking-tight mb-1">Алексей Кузнецов</h2>
          <p className="text-[15px] text-[#8E8E9A] font-medium">Владелец · Гранд Кафе</p>
        </div>

        <div className="flex flex-col gap-6 mb-8">
          {/* Section 1 */}
          <div className="bg-white rounded-2xl border border-[#E8E8EC] shadow-sm overflow-hidden">
            <ListRow 
              icon={<Bell className="w-5 h-5" />}
              title="Уведомления"
              showChevron
              className="px-4 border-b border-[#E8E8EC]"
            />
            <ListRow 
              icon={<Shield className="w-5 h-5" />}
              title="Безопасность"
              showChevron
              className="px-4 border-b border-[#E8E8EC]"
            />
            <ListRow 
              icon={<Globe className="w-5 h-5" />}
              title="Язык"
              meta="Русский"
              showChevron
              className="px-4"
            />
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-2xl border border-[#E8E8EC] shadow-sm overflow-hidden">
            <ListRow 
              icon={<Wrench className="w-5 h-5" />}
              title="Оборудование"
              showChevron
              onClick={() => setLocation('/equipment')}
              className="px-4 border-b border-[#E8E8EC]"
            />
            <ListRow 
              icon={<HelpCircle className="w-5 h-5" />}
              title="Помощь"
              showChevron
              className="px-4 border-b border-[#E8E8EC]"
            />
            <ListRow 
              icon={<Info className="w-5 h-5" />}
              title="О приложении"
              meta="Версия 1.0.0"
              showChevron
              className="px-4"
            />
          </div>

          {/* Danger Section */}
          <div className="bg-white rounded-2xl border border-[#E8E8EC] shadow-sm overflow-hidden mt-2">
            <ListRow 
              icon={<LogOut className="w-5 h-5" />}
              title="Выйти из аккаунта"
              destructive
              onClick={() => setLocation('/login')}
              className="px-4"
            />
          </div>
        </div>
      </SafeArea>
    </AppShell>
  );
}
