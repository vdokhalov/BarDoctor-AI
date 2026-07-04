import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { loadProfile } from '@/store/restaurant';

export default function Splash() {
  const [, setLocation] = useLocation();
  const [exiting, setExiting] = useState(false);
  const [dest, setDest] = useState<string>('/home');

  // Phase 1 — decide destination after a brief moment
  useEffect(() => {
    const profile = loadProfile();
    setDest(profile ? '/home' : '/setup');
  }, []);

  // Phase 2 — start fade-out at 1.55 s, navigate when done
  useEffect(() => {
    const out = setTimeout(() => setExiting(true), 1550);
    return () => clearTimeout(out);
  }, []);

  function onExitComplete() {
    setLocation(dest);
  }

  return (
    <motion.div
      className="min-h-[100dvh] w-full bg-white flex flex-col items-center justify-center relative overflow-hidden"
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      onAnimationComplete={() => { if (exiting) onExitComplete(); }}
    >

      {/* ── Glow ── */}
      <motion.div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91,92,235,0.13) 0%, rgba(91,92,235,0.04) 55%, transparent 75%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, ease: 'easeOut' }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center select-none">

        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: 80,
            height: 80,
            borderRadius: 22,
            background: '#161B2E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
            boxShadow: '0 4px 24px rgba(22,27,46,0.14), 0 1px 4px rgba(22,27,46,0.08)',
          }}
        >
          {/* Inner icon — stethoscope-style cross + bar mark */}
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
            {/* Vertical bar */}
            <rect x="17" y="7" width="4" height="24" rx="2" fill="white" />
            {/* Horizontal bar */}
            <rect x="7" y="17" width="24" height="4" rx="2" fill="white" />
            {/* Center accent dot */}
            <circle cx="19" cy="19" r="3.5" fill="#5B5CEB" />
          </svg>
        </motion.div>

        {/* Wordmark */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.32, ease: 'easeOut' }}
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: '#161B2E',
            letterSpacing: '-0.5px',
            lineHeight: 1,
            marginBottom: 10,
          }}
        >
          BarDoctor
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.52, ease: 'easeOut' }}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#9095A8',
            letterSpacing: '0.01em',
            textAlign: 'center',
            lineHeight: 1.45,
            maxWidth: 220,
          }}
        >
          AI Operational Assistant{'\n'}for Restaurants
        </motion.p>

      </div>

    </motion.div>
  );
}
