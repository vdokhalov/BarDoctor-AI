import React, { useState } from 'react';
import { useToast } from '@/components/ds/Toast';
import {
  Search, Plus, Wrench, Calendar, Shield,
  AlertTriangle, ChevronRight, X, Clock,
  CheckCircle2, AlertCircle, XCircle, MinusCircle,
  Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import Input from '@/components/ds/Input';
import Button from '@/components/ds/Button';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'working' | 'maintenance' | 'broken' | 'off';
type Risk   = 'low' | 'medium' | 'high' | 'critical';

interface RepairRecord {
  id: string;
  date: string;
  type: string;
  cost: string;
  technician: string;
}

interface Equipment {
  id: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  name: string;
  model: string;
  category: string;
  location: string;
  status: Status;
  risk: Risk;
  lastMaintenance: string;
  nextMaintenance: string;
  nextOverdue?: boolean;
  serialNumber: string;
  purchaseDate: string;
  warranty: string;
  repairs: RepairRecord[];
}

// ─── Configs ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<Status, { label: string; icon: React.ElementType; color: string; bg: string; dot: string }> = {
  working:     { label: 'Работает',      icon: CheckCircle2,  color: 'text-[#16A34A]',     bg: 'bg-[#22C55E]/10', dot: 'bg-[#22C55E]' },
  maintenance: { label: 'Обслуживание',  icon: Wrench,        color: 'text-[#B45309]',     bg: 'bg-[#F59E0B]/10', dot: 'bg-[#F59E0B]' },
  broken:      { label: 'Неисправно',    icon: XCircle,       color: 'text-destructive',   bg: 'bg-destructive/10', dot: 'bg-destructive' },
  off:         { label: 'Выключено',     icon: MinusCircle,   color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground/50' },
};

const RISK_CFG: Record<Risk, { label: string; color: string; bar: string; width: string; bg: string }> = {
  low:      { label: 'Низкий',      color: 'text-[#16A34A]',   bar: 'bg-[#22C55E]', width: 'w-1/4',  bg: 'bg-[#22C55E]/10' },
  medium:   { label: 'Средний',     color: 'text-[#B45309]',   bar: 'bg-[#F59E0B]', width: 'w-2/4',  bg: 'bg-[#F59E0B]/10' },
  high:     { label: 'Высокий',     color: 'text-[#EA580C]',   bar: 'bg-[#F97316]', width: 'w-3/4',  bg: 'bg-[#F97316]/10' },
  critical: { label: 'Критический', color: 'text-destructive', bar: 'bg-destructive', width: 'w-full', bg: 'bg-destructive/10' },
};

// ─── Seed data ────────────────────────────────────────────────────────────────

let _n = 0;
const nid = () => String(++_n);

const EQUIPMENT_DATA: Equipment[] = [
  {
    id: nid(), emoji: '☕', gradientFrom: '#FEF3C7', gradientTo: '#FDE68A',
    name: 'La Marzocco Linea PB', model: 'Linea PB 2G',
    category: 'Кофемашина', location: 'Барная стойка',
    status: 'working', risk: 'medium',
    lastMaintenance: '12 сен 2024', nextMaintenance: '12 дек 2024',
    serialNumber: 'LM-PB-2024-0341', purchaseDate: '18 янв 2023', warranty: 'до 18 янв 2026',
    repairs: [
      { id: nid(), date: '12 сен 2024', type: 'Плановое ТО', cost: '4 800 ₽', technician: 'Сервис-центр CoffeePro' },
      { id: nid(), date: '3 мар 2024',  type: 'Замена уплотнителей', cost: '1 200 ₽', technician: 'Сервис-центр CoffeePro' },
    ],
  },
  {
    id: nid(), emoji: '❄️', gradientFrom: '#DBEAFE', gradientTo: '#BFDBFE',
    name: 'Льдогенератор Brema', model: 'CB 184A HC',
    category: 'Холодильное', location: 'Подсобка',
    status: 'maintenance', risk: 'high',
    lastMaintenance: '1 окт 2024', nextMaintenance: '1 нояб 2024', nextOverdue: true,
    serialNumber: 'BR-CB-2022-1174', purchaseDate: '5 авг 2022', warranty: 'истекла',
    repairs: [
      { id: nid(), date: '1 окт 2024',  type: 'Очистка испарителя', cost: '2 200 ₽', technician: 'ХолодТех' },
      { id: nid(), date: '10 июл 2024', type: 'Замена помпы',        cost: '8 500 ₽', technician: 'ХолодТех' },
      { id: nid(), date: '2 янв 2024',  type: 'Плановое ТО',         cost: '3 000 ₽', technician: 'ХолодТех' },
      { id: nid(), date: '4 мар 2023',  type: 'Устранение утечки',   cost: '5 400 ₽', technician: 'ХолодТех' },
    ],
  },
  {
    id: nid(), emoji: '🍷', gradientFrom: '#FCE7F3', gradientTo: '#FBCFE8',
    name: 'Винный шкаф Liebherr', model: 'WTr 1841',
    category: 'Холодильное', location: 'Зал',
    status: 'working', risk: 'low',
    lastMaintenance: '5 окт 2024', nextMaintenance: '5 янв 2025',
    serialNumber: 'LB-WT-2023-0892', purchaseDate: '12 мар 2023', warranty: 'до 12 мар 2026',
    repairs: [],
  },
  {
    id: nid(), emoji: '🫧', gradientFrom: '#DCFCE7', gradientTo: '#BBF7D0',
    name: 'Посудомоечная Hobart', model: 'AM-15',
    category: 'Кухня', location: 'Мойка',
    status: 'broken', risk: 'critical',
    lastMaintenance: '3 авг 2024', nextMaintenance: '3 нояб 2024', nextOverdue: true,
    serialNumber: 'HB-AM-2021-5531', purchaseDate: '20 дек 2021', warranty: 'истекла',
    repairs: [
      { id: nid(), date: '3 авг 2024',  type: 'Замена нагревателя', cost: '12 000 ₽', technician: 'ПромСервис' },
      { id: nid(), date: '9 май 2024',  type: 'Ремонт насоса',      cost: '7 800 ₽',  technician: 'ПромСервис' },
      { id: nid(), date: '11 янв 2024', type: 'Плановое ТО',        cost: '4 500 ₽',  technician: 'ПромСервис' },
      { id: nid(), date: '2 сен 2023',  type: 'Ремонт дозатора',    cost: '3 200 ₽',  technician: 'ПромСервис' },
      { id: nid(), date: '15 май 2023', type: 'Замена уплотнений',  cost: '2 100 ₽',  technician: 'ПромСервис' },
      { id: nid(), date: '10 янв 2023', type: 'Плановое ТО',        cost: '4 500 ₽',  technician: 'ПромСервис' },
    ],
  },
  {
    id: nid(), emoji: '💻', gradientFrom: '#EDE9FE', gradientTo: '#DDD6FE',
    name: 'POS-система iiko', model: 'iiko v8.7',
    category: 'Автоматизация', location: 'Стойка администратора',
    status: 'working', risk: 'low',
    lastMaintenance: '20 окт 2024', nextMaintenance: '20 янв 2025',
    serialNumber: 'IIKO-2023-0078', purchaseDate: '3 фев 2023', warranty: 'до 3 фев 2026',
    repairs: [
      { id: nid(), date: '20 окт 2024', type: 'Обновление ПО + ТО', cost: '6 000 ₽', technician: 'iiko Support' },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status }: { status: Status }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide', cfg.color, cfg.bg)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function RiskBar({ risk }: { risk: Risk }) {
  const cfg = RISK_CFG[risk];
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', cfg.bar)}
          initial={{ width: 0 }}
          animate={{ width: undefined }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ width: risk === 'low' ? '25%' : risk === 'medium' ? '50%' : risk === 'high' ? '75%' : '100%' }}
        />
      </div>
      <span className={cn('text-[12px] font-bold flex-shrink-0', cfg.color)}>{cfg.label}</span>
    </div>
  );
}

// ─── Equipment card ───────────────────────────────────────────────────────────

function EquipmentCard({ eq, onTap }: { eq: Equipment; onTap: () => void }) {
  const statusCfg = STATUS_CFG[eq.status];

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      onClick={onTap}
      className="bd-card overflow-hidden text-left w-full active:scale-[0.98] hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      {/* Photo area */}
      <div
        className="relative w-full h-[120px] flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${eq.gradientFrom}, ${eq.gradientTo})` }}
      >
        <span className="text-[52px] select-none">{eq.emoji}</span>
        {/* Status top-right */}
        <div className="absolute top-3 right-3">
          <StatusPill status={eq.status} />
        </div>
        {/* Overdue badge */}
        {eq.nextOverdue && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-destructive rounded-full">
            <AlertCircle size={10} className="text-white" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wide">Просрочено</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Name + category */}
        <p className="text-[16px] font-bold text-foreground leading-tight mb-0.5">{eq.name}</p>
        <p className="text-[12px] text-muted-foreground mb-4">{eq.category} · {eq.location}</p>

        {/* Risk */}
        <div className="mb-1">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <Shield size={11} />
              Риск
            </div>
          </div>
          <RiskBar risk={eq.risk} />
        </div>

        <div className="border-t border-border my-3.5" />

        {/* Maintenance dates */}
        <div className="flex flex-col gap-2 mb-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
              <Clock size={12} className="opacity-60" />
              Последнее ТО
            </span>
            <span className="text-[12px] font-semibold text-foreground">{eq.lastMaintenance}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
              <Calendar size={12} className="opacity-60" />
              Следующее ТО
            </span>
            <span className={cn('text-[12px] font-semibold', eq.nextOverdue ? 'text-destructive' : 'text-foreground')}>
              {eq.nextMaintenance}
            </span>
          </div>
        </div>

        <div className="border-t border-border mb-3.5" />

        {/* Repair history row */}
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
            <Wrench size={12} className="opacity-60" />
            История ремонтов
          </span>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'text-[12px] font-bold px-2 py-0.5 rounded-full',
              eq.repairs.length === 0
                ? 'text-muted-foreground bg-muted'
                : eq.repairs.length >= 5
                  ? 'text-destructive bg-destructive/10'
                  : 'text-[#1D4ED8] bg-[#3B82F6]/10',
            )}>
              {eq.repairs.length === 0 ? 'Нет записей' : `${eq.repairs.length} ${eq.repairs.length === 1 ? 'запись' : eq.repairs.length < 5 ? 'записи' : 'записей'}`}
            </span>
            <ChevronRight size={14} className="text-muted-foreground" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Detail sheet ─────────────────────────────────────────────────────────────

function DetailSheet({ eq, onClose }: { eq: Equipment; onClose: () => void }) {
  const statusCfg = STATUS_CFG[eq.status];
  const riskCfg   = RISK_CFG[eq.risk];
  const { toast } = useToast();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(22,27,46,0.36)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="w-full max-w-[430px] bg-background rounded-t-[28px] shadow-[var(--shadow-dialog)] overflow-hidden flex flex-col max-h-[90dvh]"
      >
        {/* Handle */}
        <div className="pt-3 pb-1 flex justify-center flex-shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* Photo hero */}
          <div
            className="relative w-full h-[160px] flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${eq.gradientFrom}, ${eq.gradientTo})` }}
          >
            <span className="text-[64px]">{eq.emoji}</span>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-sm"
            >
              <X size={15} className="text-foreground" />
            </button>
          </div>

          <div className="px-6 pt-5 pb-8">
            {/* Name + status */}
            <div className="flex items-start gap-3 mb-1">
              <div className="flex-1">
                <h2 className="text-[20px] font-bold text-foreground tracking-tight leading-tight">{eq.name}</h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">{eq.model}</p>
              </div>
              <StatusPill status={eq.status} />
            </div>
            <p className="text-[13px] text-muted-foreground mb-5">{eq.category} · {eq.location}</p>

            {/* Specs card */}
            <div className="bd-card p-4 mb-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Характеристики</p>
              {[
                ['Серийный номер', eq.serialNumber],
                ['Дата покупки', eq.purchaseDate],
                ['Гарантия', eq.warranty],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
                  <span className="text-[13px] text-muted-foreground">{label}</span>
                  <span className="text-[13px] font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>

            {/* Risk + maintenance card */}
            <div className="bd-card p-4 mb-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Состояние</p>

              {/* Risk */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                    <Shield size={13} className="opacity-60" />
                    Риск
                  </span>
                  <span className={cn('text-[13px] font-bold', riskCfg.color)}>{riskCfg.label}</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full', riskCfg.bar)}
                    initial={{ width: 0 }}
                    animate={{ width: eq.risk === 'low' ? '25%' : eq.risk === 'medium' ? '50%' : eq.risk === 'high' ? '75%' : '100%' }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
              </div>

              {/* Maintenance dates */}
              {[
                { label: 'Последнее ТО', icon: Clock, value: eq.lastMaintenance, overdue: false },
                { label: 'Следующее ТО', icon: Calendar, value: eq.nextMaintenance, overdue: !!eq.nextOverdue },
              ].map(({ label, icon: Icon, value, overdue }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-t border-border">
                  <span className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                    <Icon size={13} className="opacity-60" />
                    {label}
                  </span>
                  <span className={cn('text-[13px] font-semibold', overdue ? 'text-destructive' : 'text-foreground')}>
                    {overdue && <AlertTriangle size={11} className="inline mr-1 text-destructive" />}
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Repair history */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">История ремонтов</p>
                <span className={cn(
                  'text-[11px] font-bold px-2 py-0.5 rounded-full',
                  eq.repairs.length === 0 ? 'text-muted-foreground bg-muted'
                  : eq.repairs.length >= 5 ? 'text-destructive bg-destructive/10'
                  : 'text-[#1D4ED8] bg-[#3B82F6]/10',
                )}>
                  {eq.repairs.length} {eq.repairs.length === 1 ? 'запись' : eq.repairs.length < 5 ? 'записи' : 'записей'}
                </span>
              </div>

              {eq.repairs.length === 0 ? (
                <div className="bd-card p-6 flex flex-col items-center text-center">
                  <span className="text-3xl mb-2">✅</span>
                  <p className="text-[14px] font-medium text-foreground mb-0.5">Ремонтов не было</p>
                  <p className="text-[12px] text-muted-foreground">Оборудование работает без нареканий</p>
                </div>
              ) : (
                <div className="bd-card overflow-hidden">
                  {eq.repairs.map((r, idx) => (
                    <div
                      key={r.id}
                      className={cn('px-4 py-3.5', idx < eq.repairs.length - 1 && 'border-b border-border')}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[14px] font-semibold text-foreground leading-snug">{r.type}</p>
                        <span className="text-[13px] font-bold text-foreground flex-shrink-0">{r.cost}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-muted-foreground">{r.technician}</span>
                        <span className="text-[11px] text-muted-foreground">{r.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Закрыть
              </Button>
              <Button
                className="flex-1"
                onClick={() => toast({ variant: 'info', title: 'Скоро', description: 'Планирование ТО будет доступно в ближайшем обновлении.' })}
              >
                Запланировать ТО
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Add Equipment sheet ──────────────────────────────────────────────────────

function AddSheet({ onClose }: { onClose: () => void }) {
  const [name, setName]     = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [serial, setSerial] = useState('');
  const [purchase, setPurchase] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(22,27,46,0.32)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="w-full max-w-[430px] bg-background rounded-t-[28px] pt-3 pb-8 shadow-[var(--shadow-dialog)]"
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between px-6 mb-6">
          <h2 className="text-[18px] font-bold text-foreground tracking-tight">Новое оборудование</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X size={15} className="text-muted-foreground" />
          </button>
        </div>

        {/* Photo placeholder */}
        <div className="mx-6 mb-5 h-[100px] rounded-[20px] bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-border/40 transition-colors">
          <Package size={24} className="text-muted-foreground" />
          <p className="text-[13px] text-muted-foreground font-medium">Добавить фото</p>
        </div>

        <div className="px-6 flex flex-col gap-4">
          <Input label="Название" placeholder="Модель и марка" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Категория" placeholder="Кофемашина, холодильник…" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input label="Расположение" placeholder="Где находится" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Input label="Серийный номер" placeholder="SN-XXXXXXXX" value={serial} onChange={(e) => setSerial(e.target.value)} />
          <Input label="Дата покупки" type="date" value={purchase} onChange={(e) => setPurchase(e.target.value)} />
          <Button fullWidth disabled={!name.trim()} onClick={onClose} className="mt-1">
            Добавить
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const FILTERS: { key: Status | 'all'; label: string }[] = [
  { key: 'all',         label: 'Все' },
  { key: 'working',     label: 'Работает' },
  { key: 'maintenance', label: 'Обслуживание' },
  { key: 'broken',      label: 'Неисправно' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Equipment() {
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState<Status | 'all'>('all');
  const [selected, setSelected]     = useState<Equipment | null>(null);
  const [showAdd, setShowAdd]       = useState(false);

  const filtered = EQUIPMENT_DATA.filter((eq) =>
    (filter === 'all' || eq.status === filter) &&
    (eq.name.toLowerCase().includes(search.toLowerCase()) ||
     eq.category.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <>
      <AppShell showBottomNav className="pb-[168px]">
        {/* Sticky header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
          <SafeArea className="pt-5 pb-0">
            <div className="px-6 mb-4">
              <h1 className="text-[22px] font-bold text-foreground tracking-tight">Оборудование</h1>
            </div>

            {/* Search */}
            <div className="px-6 mb-3 relative">
              <Search size={15} className="absolute left-10 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Поиск оборудования…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 bg-muted border border-transparent rounded-full pl-9 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-background transition-all"
              />
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 px-6 overflow-x-auto no-scrollbar pb-0">
              {FILTERS.map(({ key, label }) => {
                const active = filter === key;
                const isStatus = key !== 'all';
                const cfg = isStatus ? STATUS_CFG[key as Status] : null;
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3.5 py-2 rounded-full whitespace-nowrap text-[13px] font-semibold transition-all shrink-0',
                      active
                        ? key === 'broken'
                          ? 'bg-destructive text-white shadow-sm'
                          : key === 'maintenance'
                            ? 'bg-[#F59E0B] text-white shadow-sm'
                            : key === 'working'
                              ? 'bg-[#22C55E] text-white shadow-sm'
                              : 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {active && cfg && <span className="w-1.5 h-1.5 rounded-full bg-white/70" />}
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="h-3" />
          </SafeArea>
        </div>

        {/* Equipment list */}
        <div className="px-6 pt-4 flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center py-16 text-center"
              >
                <span className="text-4xl mb-3">🔍</span>
                <p className="text-[15px] font-medium text-muted-foreground">Ничего не найдено</p>
              </motion.div>
            ) : (
              filtered.map((eq) => (
                <EquipmentCard key={eq.id} eq={eq} onTap={() => setSelected(eq)} />
              ))
            )}
          </AnimatePresence>
        </div>
      </AppShell>

      {/* Floating Add button */}
      <div className="fixed bottom-[92px] left-0 right-0 flex justify-center z-40 pointer-events-none">
        <motion.button
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setShowAdd(true)}
          className="pointer-events-auto flex items-center gap-2.5 pl-4 pr-5 py-3 bg-foreground text-white rounded-full shadow-[0_8px_32px_rgba(22,27,46,0.28),0_2px_8px_rgba(22,27,46,0.14)] hover:opacity-90 active:scale-[0.97] transition-all"
        >
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Plus size={14} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="text-[14px] font-semibold tracking-tight">Добавить оборудование</span>
        </motion.button>
      </div>

      {/* Detail sheet */}
      <AnimatePresence>
        {selected && (
          <DetailSheet key={`detail-${selected.id}`} eq={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>

      {/* Add sheet */}
      <AnimatePresence>
        {showAdd && (
          <AddSheet key="add-sheet" onClose={() => setShowAdd(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
