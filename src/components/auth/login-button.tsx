'use client';

import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface LoginButtonProps {
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function LoginButton({ size = 'default', className }: LoginButtonProps) {
  const { login } = useAuth();

  const handleClick = () => {
    login();
  };

  return (
    <Button
      onClick={handleClick}
      size={size}
      className={cn(
        'gap-2 rounded-xl',
        size === 'lg' && 'h-12 px-8 text-base',
        className
      )}
    >
      <LogIn className={cn('h-4 w-4', size === 'lg' && 'h-5 w-5')} />
      Sign In
    </Button>
  );
}
