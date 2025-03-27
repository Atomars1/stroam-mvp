'use client';

import { AuthProvider } from '@/app/components/AuthContext';

export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}