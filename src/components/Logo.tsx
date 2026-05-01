import React from 'react';
import { Leaf, Check, Box } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className, showText = true, variant = 'dark', size = 'md' }) => {
  const containerSizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  const leafSizes = {
    sm: { top: "w-3 h-3", left: "w-4 h-4" },
    md: { top: "w-5 h-5", left: "w-6 h-6" },
    lg: { top: "w-7 h-7", left: "w-8 h-8" }
  };

  const jarSizes = {
    sm: "w-5 h-6 pt-1",
    md: "w-8 h-10 pt-2",
    lg: "w-11 h-14 pt-3"
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative flex items-center justify-center shrink-0", containerSizes[size])}>
        {/* Background Circle */}
        <div className="absolute inset-0 bg-primary/10 rounded-full" />
        
        {/* Lettuce Leaves */}
        <div className={cn("absolute -top-0.5 -right-0.5 text-secondary", leafSizes[size].top)}>
          <Leaf className="w-full h-full rotate-45" fill="currentColor" />
        </div>
        <div className={cn("absolute top-0 -left-0.5 text-primary", leafSizes[size].left)}>
          <Leaf className="w-full h-full -rotate-12" fill="currentColor" />
        </div>

        {/* Jar/Container Body */}
        <div className={cn("relative z-10 bg-white border-2 border-primary rounded-t-xl rounded-b-lg flex flex-col items-center shadow-sm", jarSizes[size])}>
          {/* Jar Lid */}
          <div className="absolute -top-1 left-0 right-0 h-1.5 bg-primary rounded-t-full" />
          
          {/* Checkmark */}
          <div className="bg-primary/10 rounded-full p-0.5 mt-0.5">
            <Check className={cn("text-primary", size === 'sm' ? "w-2.5 h-2.5" : "w-4 h-4")} strokeWidth={3} />
          </div>
          
          {/* Decorative lines */}
          <div className="mt-1 w-3 h-0.5 bg-primary/20 rounded-full" />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className={cn("flex items-baseline")}>
            <span className={cn(textSizes[size], "font-black tracking-tight", variant === 'dark' ? "text-primary" : "text-white")}>
              Fresh
            </span>
            <span className={cn(textSizes[size], "font-black tracking-tight text-[#84cc16]")}>
              keep
            </span>
          </div>
          {size !== 'sm' && (
            <p className={cn("text-[6px] font-black uppercase tracking-[0.15em] whitespace-nowrap", variant === 'dark' ? "text-outline" : "text-white/60")}>
              Controla hoje, conserva o amanhã.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
