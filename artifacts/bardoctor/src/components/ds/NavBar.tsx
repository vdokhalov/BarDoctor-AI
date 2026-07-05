import { useLocation, Link } from 'wouter';
import { House, BarChart2, Plus, LayoutList, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Routes that fall under the "Ещё" umbrella tab
const MORE_ROUTES = ['/more', '/equipment', '/employees', '/suppliers', '/warehouse', '/reports'];

export default function NavBar() {
  const [location] = useLocation();

  const tabs = [
    { name: 'Главная',  href: '/home',      icon: House },
    { name: 'Анализ',   href: '/analysis',  icon: BarChart2 },
    { name: 'Сообщить', href: '/smart',     icon: Plus, isFab: true },
    { name: 'Решения',  href: '/decisions', icon: LayoutList },
    { name: 'Ещё',      href: '/more',      icon: LayoutGrid },
  ];

  return (
    <nav
      className="fixed bottom-0 w-full max-w-[430px] z-50 px-1"
      style={{
        height: 'calc(80px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '0.5px solid rgba(22,27,46,0.09)',
        boxShadow: '0 -4px 24px rgba(22,27,46,0.06)',
      }}
    >
      <div className="flex items-stretch h-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === '/more'
              ? MORE_ROUTES.some((r) => location === r || location.startsWith(r + '/'))
              : location === tab.href ||
                (tab.href !== '/home' && location.startsWith(tab.href));

          /* ─── FAB centre button ─── */
          if (tab.isFab) {
            return (
              <div key={tab.href} className="flex-1 flex flex-col items-center justify-center">
                <Link href={tab.href}>
                  <motion.div
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                    className="w-[56px] h-[56px] -mt-7 rounded-full bg-primary flex items-center justify-center text-white"
                    style={{ boxShadow: 'var(--shadow-fab)' }}
                  >
                    <Icon className="w-[26px] h-[26px]" />
                  </motion.div>
                </Link>
                <span className="text-[10px] font-medium text-muted-foreground mt-1 leading-none">
                  {tab.name}
                </span>
              </div>
            );
          }

          /* ─── Regular tab ─── */
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 relative flex flex-col items-center justify-center gap-[5px] select-none overflow-visible"
            >
              {/* Sliding top indicator — animates between tabs via layoutId */}
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 w-10 h-[3px] rounded-b-full bg-primary"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                />
              )}

              <motion.div
                whileTap={{ scale: 0.76 }}
                transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                className="flex flex-col items-center gap-[5px]"
              >
                <Icon
                  strokeWidth={isActive ? 2.5 : 1.75}
                  className={cn(
                    'w-[22px] h-[22px] transition-colors duration-150',
                    isActive ? 'text-primary' : 'text-muted-foreground/55',
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] leading-none tracking-tight transition-all duration-150',
                    isActive
                      ? 'font-bold text-primary'
                      : 'font-medium text-muted-foreground/55',
                  )}
                >
                  {tab.name}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
