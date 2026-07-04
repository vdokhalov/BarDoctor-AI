import { useLocation } from 'wouter';
import { Shield, Globe, LogOut, RotateCcw, Lock, Smartphone } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import PageHeader from '@/components/layout/PageHeader';
import ListRow from '@/components/shared/ListRow';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { initials, clearProfile } from '@/store/restaurant';
import { useToast } from '@/components/ds/Toast';

const AREA_EMOJI: Record<string, string> = {
  'Бар': '🍸', 'Кухня': '🍳', 'Кофе': '☕',
  'Доставка': '🛵', 'Кальяны': '💨', 'Терраса': '🌿', 'Банкет': '🎪',
};

export default function Profile() {
  const [, setLocation] = useLocation();
  const { profile } = useRestaurant();
  const { toast } = useToast();

  const name = profile?.name ?? 'Моё заведение';
  const role = profile
    ? [profile.businessType, profile.city].filter(Boolean).join(' · ')
    : 'Настройте профиль';
  const abbr = initials(name);

  function soon() {
    toast({ variant: 'info', title: 'Скоро', description: 'Эта функция скоро будет доступна.' });
  }

  function handleReset() {
    clearProfile();
    setLocation('/setup');
  }

  return (
    <AppShell showBottomNav>
      <PageHeader title="Профиль" />
      <SafeArea>

        {/* ── Avatar & name ── */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-4 shadow-sm border border-border">
            <span className="text-[24px] font-bold text-primary tracking-tight">{abbr}</span>
          </div>
          <h2 className="text-[22px] font-bold text-foreground tracking-tight mb-1">{name}</h2>
          <p className="text-[15px] text-muted-foreground font-medium">{role}</p>

          {/* Info badges */}
          {profile && (
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {profile.seats > 0 && (
                <span className="text-[12px] font-semibold bg-muted text-muted-foreground px-3 py-1 rounded-full">
                  {profile.seats} мест
                </span>
              )}
              {profile.employees > 0 && (
                <span className="text-[12px] font-semibold bg-muted text-muted-foreground px-3 py-1 rounded-full">
                  {profile.employees} сотр.
                </span>
              )}
              {profile.avgCheck > 0 && (
                <span className="text-[12px] font-semibold bg-muted text-muted-foreground px-3 py-1 rounded-full">
                  ₽{profile.avgCheck.toLocaleString('ru')} чек
                </span>
              )}
              {profile.openTime && profile.closeTime && (
                <span className="text-[12px] font-semibold bg-muted text-muted-foreground px-3 py-1 rounded-full">
                  {profile.openTime}–{profile.closeTime}
                </span>
              )}
            </div>
          )}

          {/* Area chips */}
          {profile && profile.areas && profile.areas.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {profile.areas.map((area) => (
                <span
                  key={area}
                  className="text-[12px] font-semibold bg-primary/8 text-primary px-3 py-1 rounded-full"
                >
                  {AREA_EMOJI[area] ?? ''} {area}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 mb-8">

          {/* ── Security ── */}
          <div className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <ListRow
              icon={<Lock className="w-5 h-5" />}
              title="Пароль"
              showChevron
              onClick={soon}
              className="px-4 border-b border-border"
            />
            <ListRow
              icon={<Shield className="w-5 h-5" />}
              title="Двухфакторная защита"
              showChevron
              onClick={soon}
              className="px-4 border-b border-border"
            />
            <ListRow
              icon={<Smartphone className="w-5 h-5" />}
              title="Устройства"
              showChevron
              onClick={soon}
              className="px-4"
            />
          </div>

          {/* ── Preferences ── */}
          <div className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <ListRow
              icon={<Globe className="w-5 h-5" />}
              title="Язык"
              meta="Русский"
              showChevron
              onClick={soon}
              className="px-4"
            />
          </div>

          {/* ── Restaurant ── */}
          <div className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden">
            <ListRow
              icon={<RotateCcw className="w-5 h-5" />}
              title="Изменить данные заведения"
              showChevron
              onClick={handleReset}
              className="px-4"
            />
          </div>

          {/* ── Sign out ── */}
          <div className="bg-card rounded-2xl border border-card-border shadow-sm overflow-hidden">
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
