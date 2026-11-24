import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { Header } from '@/components/ui';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
  fallbackRoute?: '/' | '/customers' | '/debts' | '/reports' | '/settings';
}

export function PageHeader({ title, subtitle, rightAction, fallbackRoute = '/' }: PageHeaderProps) {
  const router = useRouter();

  return (
    <Header
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace(fallbackRoute);
      }}
      rightAction={rightAction}
      subtitle={subtitle}
      title={title}
    />
  );
}
