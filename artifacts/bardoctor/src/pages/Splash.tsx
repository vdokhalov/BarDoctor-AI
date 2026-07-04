import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { loadProfile } from '@/store/restaurant';

export default function Splash() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      const profile = loadProfile();
      setLocation(profile ? '/home' : '/setup');
    }, 1800);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-[100dvh] w-full bg-[#F9F9FB] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="w-64 h-64 bg-[#4F46E5] rounded-full blur-[80px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="w-20 h-20 bg-[#1A1A2E] rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
          <span className="text-white text-3xl font-bold tracking-tighter">BD</span>
        </div>
        <h1 className="text-[32px] font-bold text-[#1A1A2E] tracking-tight mb-2">BarDoctor</h1>
        <p className="text-[15px] text-[#8E8E9A] font-medium tracking-wide">Умное управление рестораном</p>
      </motion.div>
    </div>
  );
}
