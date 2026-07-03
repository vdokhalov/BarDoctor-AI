import React from 'react';
import { Link } from 'wouter';
import { ChevronDown, MapPin, Building, Users } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';

export default function CreateRestaurant() {
  return (
    <AppShell>
      <SafeArea className="flex flex-col min-h-[100dvh] pt-8">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-10">
          <div className="w-12 h-1.5 rounded-full bg-[#1A1A2E]"></div>
          <div className="w-12 h-1.5 rounded-full bg-[#E8E8EC]"></div>
        </div>

        {/* Title */}
        <div className="mb-10 text-center">
          <h1 className="text-[28px] font-bold text-[#1A1A2E] tracking-tight mb-3">Расскажите о вашем заведении</h1>
          <p className="text-[16px] text-[#8E8E9A] px-4">Это поможет нам настроить BarDoctor под ваши нужды</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-5 flex-1">
          <div className="relative">
            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E9A]" />
            <input 
              type="text" 
              placeholder="Название заведения" 
              className="w-full h-14 bg-white border border-[#E8E8EC] rounded-xl pl-12 pr-4 text-[16px] outline-none focus:border-[#4F46E5] shadow-sm transition-colors placeholder:text-[#8E8E9A]"
            />
          </div>

          <div className="relative">
            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E9A]" />
            <select className="w-full h-14 bg-white border border-[#E8E8EC] rounded-xl pl-12 pr-10 text-[16px] outline-none focus:border-[#4F46E5] shadow-sm transition-colors appearance-none text-[#1A1A2E]">
              <option value="" disabled selected className="text-[#8E8E9A]">Тип заведения</option>
              <option value="restaurant">Ресторан</option>
              <option value="bar">Бар</option>
              <option value="cafe">Кафе</option>
              <option value="fastfood">Фастфуд</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E9A] pointer-events-none" />
          </div>

          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E9A]" />
            <input 
              type="text" 
              placeholder="Город" 
              className="w-full h-14 bg-white border border-[#E8E8EC] rounded-xl pl-12 pr-4 text-[16px] outline-none focus:border-[#4F46E5] shadow-sm transition-colors placeholder:text-[#8E8E9A]"
            />
          </div>

          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E9A]" />
            <input 
              type="number" 
              placeholder="Количество столов" 
              className="w-full h-14 bg-white border border-[#E8E8EC] rounded-xl pl-12 pr-4 text-[16px] outline-none focus:border-[#4F46E5] shadow-sm transition-colors placeholder:text-[#8E8E9A]"
            />
          </div>
        </div>

        <div className="pt-8 pb-6">
          <Link href="/home" className="w-full block">
            <button className="w-full h-14 bg-[#1A1A2E] text-white rounded-xl text-[16px] font-semibold shadow-lg shadow-black/10 active:scale-[0.98] transition-transform">
              Продолжить
            </button>
          </Link>
        </div>
      </SafeArea>
    </AppShell>
  );
}
