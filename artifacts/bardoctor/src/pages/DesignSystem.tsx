import React, { useState } from 'react';
import { Search, Eye, Plus, ChevronRight, Palette } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import SectionTitle from '@/components/shared/SectionTitle';
import MetricCard from '@/components/shared/MetricCard';

import {
  Button,
  Input,
  Textarea,
  Card,
  Badge,
  Alert,
  Dialog,
  BottomSheet,
  FAB,
  useToast
} from '@/components/ds';
import { cn } from '@/lib/utils';

export default function DesignSystem() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  return (
    <AppShell className="bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-[20px] font-bold text-foreground">Design System</h1>
        <Badge label="BarDoctor" variant="primary" size="sm" />
      </div>

      <SafeArea className="pb-12">
        <div className="px-6 space-y-10 mt-6">

          {/* COLORS */}
          <div>
            <SectionTitle title="Цвета" className="mt-0" />
            <div className="grid grid-cols-4 gap-4">
              <ColorSwatch name="Primary" className="bg-primary" />
              <ColorSwatch name="Background" className="bg-background border border-border" />
              <ColorSwatch name="Card" className="bg-card border border-card-border" />
              <ColorSwatch name="Muted" className="bg-muted" />
              <ColorSwatch name="Success" className="bg-success" />
              <ColorSwatch name="Warning" className="bg-warning" />
              <ColorSwatch name="Danger" className="bg-destructive" />
              <ColorSwatch name="Info" className="bg-info" />
            </div>
          </div>

          {/* TYPOGRAPHY */}
          <div>
            <SectionTitle title="Типографика" />
            <div className="space-y-4 bd-card p-5">
              <div className="text-[32px] font-bold text-foreground">Заголовок страницы</div>
              <div className="text-[24px] font-bold text-foreground">Заголовок раздела</div>
              <div className="text-[20px] font-semibold text-foreground">Подзаголовок</div>
              <div className="text-[16px] text-foreground">Основной текст</div>
              <div className="text-[14px] text-muted-foreground">Вспомогательный текст</div>
              <div className="text-[12px] font-medium uppercase tracking-wide text-foreground">МЕТКА</div>
            </div>
          </div>

          {/* BUTTONS */}
          <div>
            <SectionTitle title="Кнопки" />
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              <div className="flex flex-wrap gap-3 items-end">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button loading>Загрузка</Button>
                <Button disabled>Отключена</Button>
              </div>
              <Button fullWidth>На всю ширину</Button>
              <div className="flex flex-wrap gap-3">
                <Button leftIcon={<Plus className="w-5 h-5" />}>Новая задача</Button>
                <Button rightIcon={<ChevronRight className="w-5 h-5" />} variant="secondary">Далее</Button>
              </div>
            </div>
          </div>

          {/* INPUTS */}
          <div>
            <SectionTitle title="Поля ввода" />
            <div className="space-y-4">
              <Input label="Название заведения" placeholder="Введите название..." />
              <Input 
                leftIcon={<Search className="w-5 h-5" />} 
                placeholder="Поиск..." 
              />
              <Input 
                type="password"
                placeholder="Пароль" 
                rightElement={<button className="text-muted-foreground hover:text-foreground"><Eye className="w-5 h-5" /></button>}
              />
              <Input 
                label="Сумма" 
                defaultValue="abc" 
                error="Поле обязательно для заполнения" 
              />
              <Input 
                label="Никнейм" 
                hint="Будет отображаться в профиле" 
              />
              <Input 
                disabled 
                defaultValue="Неактивное поле" 
              />
              <Textarea 
                label="Описание" 
                placeholder="Описание..." 
                rows={3} 
              />
            </div>
          </div>

          {/* CARDS */}
          <div>
            <SectionTitle title="Карточки" />
            <div className="space-y-4">
              <Card>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Базовая карточка</h3>
                    <p className="text-sm text-muted-foreground">Содержимое карточки</p>
                  </div>
                </div>
              </Card>

              <Card 
                header={<h3 className="font-semibold text-foreground">С заголовком и подвалом</h3>}
                footer={<div className="flex justify-end"><Button size="sm">Действие</Button></div>}
              >
                <p className="text-foreground">Основной контент карточки</p>
              </Card>

              <Card hoverable>
                <h3 className="font-semibold text-foreground">Интерактивная карточка</h3>
                <p className="text-sm text-muted-foreground mt-1">Наведите или нажмите</p>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <MetricCard label="Выручка" value="120 000 ₽" trend="+5%" trendPositive />
                <MetricCard label="Ошибки" value="3" trend="-1" trendPositive={false} />
              </div>
            </div>
          </div>

          {/* BADGES */}
          <div>
            <SectionTitle title="Бейджи" />
            <div className="flex flex-wrap gap-3 mb-4">
              <Badge label="Primary" variant="primary" />
              <Badge label="Success" variant="success" />
              <Badge label="Warning" variant="warning" />
              <Badge label="Danger" variant="danger" />
              <Badge label="Neutral" variant="neutral" />
              <Badge label="Info" variant="info" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge label="Primary" variant="primary" dot />
              <Badge label="Success" variant="success" dot />
              <Badge label="Warning" variant="warning" dot />
              <Badge label="Danger" variant="danger" dot />
              <Badge label="Neutral" variant="neutral" dot />
              <Badge label="Info" variant="info" dot />
            </div>
          </div>

          {/* ALERTS */}
          <div>
            <SectionTitle title="Алерты" />
            <div className="space-y-4">
              <Alert 
                variant="info" 
                title="Информация" 
                description="Система была успешно обновлена." 
              />
              <Alert 
                variant="success" 
                title="Успешно" 
                description="Все задачи выполнены." 
              />
              <Alert 
                variant="warning" 
                title="Внимание" 
                description="Истекает срок годности." 
              />
              <Alert 
                variant="danger" 
                title="Ошибка" 
                description="Не удалось подключиться к серверу." 
              />
            </div>
          </div>

          {/* DIALOGS & SHEETS */}
          <div>
            <SectionTitle title="Диалоги и Sheet" />
            <div className="grid grid-cols-2 gap-4">
              <Card padding className="flex items-center justify-center py-8">
                <Button onClick={() => setDialogOpen(true)}>Открыть диалог</Button>
              </Card>
              <Card padding className="flex items-center justify-center py-8">
                <Button onClick={() => setSheetOpen(true)} variant="secondary">Открыть Sheet</Button>
              </Card>
            </div>

            <Dialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              title="Подтверждение действия"
              description="Это действие нельзя отменить. Вы уверены, что хотите продолжить?"
              footer={
                <>
                  <Button variant="secondary" fullWidth onClick={() => setDialogOpen(false)}>Отмена</Button>
                  <Button variant="destructive" fullWidth onClick={() => setDialogOpen(false)}>Удалить</Button>
                </>
              }
            />

            <BottomSheet
              open={sheetOpen}
              onClose={() => setSheetOpen(false)}
              title="Меню действий"
            >
              <div className="space-y-1">
                {['Поделиться', 'Редактировать', 'Копировать ссылку', 'Удалить'].map((action, i) => (
                  <button 
                    key={i} 
                    onClick={() => setSheetOpen(false)}
                    className="w-full text-left px-4 py-3 text-[16px] text-foreground font-medium rounded-xl hover:bg-muted transition-colors active:scale-95"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </BottomSheet>
          </div>

          {/* TOASTS */}
          <div>
            <SectionTitle title="Уведомления (Toast)" />
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="secondary" 
                onClick={() => toast({ title: 'Сохранено', description: 'Изменения успешно применены', variant: 'success' })}
              >
                Success
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => toast({ title: 'Ошибка сохранения', description: 'Проверьте соединение с интернетом', variant: 'error' })}
              >
                Error
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => toast({ title: 'Запасы на исходе', description: 'Осталось мало сиропов', variant: 'warning' })}
              >
                Warning
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => toast({ title: 'Новое сообщение', description: 'У вас 1 непрочитанное сообщение', variant: 'info' })}
              >
                Info
              </Button>
            </div>
          </div>

          {/* FAB DEMO */}
          <div>
            <SectionTitle title="FAB" />
            <div className="relative h-32 bg-muted/30 border border-border rounded-2xl overflow-hidden flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Демонстрационный контейнер</span>
              <FAB 
                position="bottom-right" 
                className="absolute bottom-4 right-4" 
                onClick={() => toast({ title: 'FAB Нажат', variant: 'success' })}
              />
              <FAB 
                position="bottom-center"
                label="Новый заказ" 
                className="absolute bottom-4 left-1/2 -translate-x-1/2"
                onClick={() => toast({ title: 'Extended FAB Нажат', variant: 'info' })}
              />
            </div>
          </div>

        </div>
      </SafeArea>
    </AppShell>
  );
}

function ColorSwatch({ name, className }: { name: string, className?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("w-16 h-16 rounded-[16px] shadow-sm", className)} />
      <span className="text-[12px] font-medium text-muted-foreground">{name}</span>
    </div>
  );
}
