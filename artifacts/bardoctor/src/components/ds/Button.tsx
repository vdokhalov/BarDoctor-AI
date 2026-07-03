import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  onClick,
  disabled = false,
  type = 'button',
  className,
}: ButtonProps) {
  const baseClasses = 'bd-button-base';
  
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'bg-secondary text-foreground border border-border hover:bg-muted',
    ghost: 'bg-transparent text-foreground hover:bg-muted',
    outline: 'bg-transparent text-primary border border-primary hover:bg-primary/5',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  };

  const sizes = {
    sm: 'h-9 text-[14px] rounded-[10px] px-4',
    md: 'h-[56px] text-[16px] rounded-[14px] px-6',
    lg: 'h-[60px] text-[17px] rounded-[16px] px-8',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {loading && <Loader2 className="animate-spin w-5 h-5 mr-2" />}
      {!loading && leftIcon && <span className="mr-2 flex items-center justify-center">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="ml-2 flex items-center justify-center">{rightIcon}</span>}
    </button>
  );
}
