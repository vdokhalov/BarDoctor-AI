import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Clock, ArrowLeft } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';

// Map path → human title
const TITLES: Record<string, string> = {
  '/employees':    'Сотрудники',
  '/suppliers':    'Поставщики',
  '/warehouse':    'Склад',
  '/reports':      'Отчёты',
  '/notifications':'Уведомления',
  '/settings':     'Настройки',
  '/about':        'О приложении',
};

export default function ComingSoon() {
  const [location, setLocation] = useLocation();
  const title = TITLES[location] ?? 'Раздел';

  return (
    <AppShell showBottomNav>
      <SafeArea className="pt-5">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 mb-10">
          <button
            type="button"
            onClick={() => setLocation('/more')}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted active:scale-[0.94] transition-all"
          >
            <ArrowLeft size={17} className="text-foreground" />
          </button>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">{title}</h1>
        </div>

        {/* Content */}
        <div className="px-6 flex flex-col items-center text-center pt-12">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-20 h-20 rounded-[24px] bg-primary/10 flex items-center justify-center mb-6"
          >
            <Clock size={36} className="text-primary" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-[22px] font-black text-foreground tracking-tight mb-3">
              Скоро будет доступно
            </h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-[280px]">
              Раздел «{title}» находится в разработке и появится в ближайшем обновлении BarDoctor.
            </p>
          </motion.div>

          <motion.button
            type="button"
            onClick={() => setLocation('/more')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 px-6 py-3 bg-primary text-white rounded-2xl text-[15px] font-semibold active:scale-[0.97] hover:opacity-90 transition-all shadow-[0_4px_16px_rgba(91,92,235,0.28)]"
          >
            Назад в меню
          </motion.button>
        </div>
      </SafeArea>
    </AppShell>
  );
}
