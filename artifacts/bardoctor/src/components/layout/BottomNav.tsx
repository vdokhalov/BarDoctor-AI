import React from 'react';
import { useLocation, Link } from 'wouter';
import { Home, BarChart2, Plus, CheckSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const [location] = useLocation();

  const tabs = [
    { name: 'Главная', href: '/home', icon: Home },
    { name: 'Анализ', href: '/analysis', icon: BarChart2 },
    { name: 'Добавить', href: '/add', icon: Plus, isFab: true },
    { name: 'Задачи', href: '/tasks', icon: CheckSquare },
    { name: 'Профиль', href: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 w-full max-w-[430px] h-[80px] bg-white/90 backdrop-blur border-t border-[#E8E8EC] z-50 px-6 pb-safe pt-2">
      <div className="flex justify-between items-center h-full">
        {tabs.map((tab) => {
          const isActive = location === tab.href || (tab.href !== '/home' && location.startsWith(tab.href));
          const Icon = tab.icon;

          if (tab.isFab) {
            return (
              <Link key={tab.href} href={tab.href} className="relative -top-5">
                <div className="w-14 h-14 rounded-full bg-[#4F46E5] flex items-center justify-center shadow-lg transform transition-transform active:scale-95 text-white">
                  <Icon className="w-7 h-7" />
                </div>
              </Link>
            );
          }

          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center justify-center flex-1 py-1 group">
              <Icon
                className={cn(
                  'w-6 h-6 mb-1.5 transition-colors',
                  isActive ? 'text-[#4F46E5]' : 'text-[#8E8E9A]'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  isActive ? 'text-[#4F46E5]' : 'text-[#8E8E9A]'
                )}
              >
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
