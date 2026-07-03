import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

export default function Input({
  label,
  placeholder,
  type = 'text',
  value,
  defaultValue,
  onChange,
  error,
  hint,
  leftIcon,
  rightElement,
  disabled,
  readOnly,
  className,
}: InputProps) {
  return (
    <div className={cn("w-full flex flex-col", className)}>
      {label && <label className="text-[14px] font-semibold text-foreground mb-1.5">{label}</label>}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-4 flex items-center justify-center text-muted-foreground pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            "bd-input-base",
            leftIcon ? "pl-11" : "pl-4",
            rightElement ? "pr-11" : "pr-4",
            error && "border-destructive bg-destructive/5 focus:border-destructive"
          )}
        />
        {rightElement && (
          <div className="absolute right-4 flex items-center justify-center">
            {rightElement}
          </div>
        )}
      </div>
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
