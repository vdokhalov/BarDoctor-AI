import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface TextareaProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  rows?: number;
}

export default function Textarea({
  label,
  placeholder,
  value,
  onChange,
  error,
  hint,
  disabled,
  className,
  rows = 4,
}: TextareaProps) {
  return (
    <div className={cn("w-full flex flex-col", className)}>
      {label && <label className="text-[14px] font-semibold text-foreground mb-1.5">{label}</label>}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        className={cn(
          "w-full bg-input border border-transparent rounded-[14px] px-4 py-3 text-[16px] text-foreground placeholder:text-muted-foreground outline-none transition-all duration-150 focus:border-primary focus:bg-background focus:ring-0 resize-none min-h-[100px]",
          error && "border-destructive bg-destructive/5 focus:border-destructive"
        )}
      />
      {error && (
        <span className="text-destructive text-[13px] mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </span>
      )}
      {!error && hint && (
        <span className="text-muted-foreground text-[13px] mt-1.5">{hint}</span>
      )}
    </div>
  );
}
