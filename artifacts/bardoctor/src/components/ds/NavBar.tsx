import React from 'react';
import { useLocation, Link } from 'wouter';
import { House, BarChart2, Plus, CheckSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NavBar() {
  const [location] = useLocation();

  const tabs = [
    { name: 'Главная', href: '/home', icon: House },
    { name: 'Анализ', href: '/analysis', icon: BarChart2 },
    { name: 'Добавить', href: '/add', icon: Plus, isFab: true },
    { name: 'Задачи', href: '/tasks', icon: CheckSquare },
    { name: 'Профиль', href: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 w-full max-w-[430px] h-[80px] bg-background/90 backdrop-blur-md border-t border-border z-50 px-6 pb-safe pt-2">
      <div className="flex justify-between items-center h-full relative">
        {tabs.map((tab) => {
          const isActive = location === tab.href || (tab.href !== '/home' && location.startsWith(tab.href));
          const Icon = tab.icon;

          if (tab.isFab) {
            return (
              <Link key={tab.href} href={tab.href} className="relative -top-6">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-[var(--shadow-fab)] transform transition-transform active:scale-95 text-primary-foreground">
                  <Icon className="w-7 h-7" />
                </div>
              </Link>
            );
          }

          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center justify-center flex-1 py-1 group relative">
              <Icon
                strokeWidth={isActive ? 2.5 : 2}
                className={cn(
                  'w-6 h-6 mb-1.5 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {tab.name}
              </span>
              {isActive && (
                <div className="absolute -bottom-1.5 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
