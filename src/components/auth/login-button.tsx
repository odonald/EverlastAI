'use client';

import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function LoginButton() {
  const { login } = useAuth();

  return (
    <Button onClick={login} className="gap-2">
      <LogIn className="h-4 w-4" />
      Sign In
    </Button>
  );
}
