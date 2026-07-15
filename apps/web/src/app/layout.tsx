import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';
import { cn } from '@/lib/utils';

const fontSans = FontSans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'ERMS - Examination Repeat & Medical Application Management System',
  description: 'Streamline examination repeat and medical applications',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', fontSans.variable)}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
