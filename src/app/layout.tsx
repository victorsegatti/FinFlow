import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter_Tight } from 'next/font/google';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', weight: ['400','500','600','700'] });
const ui = Inter_Tight({ subsets: ['latin'], variable: '--font-ui', weight: ['400','500','600','700'] });

export const metadata: Metadata = {
  title: 'FinFlow',
  description: 'Gestão financeira pessoal',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'FinFlow' },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-palette="onyx" data-mode="dark" suppressHydrationWarning
      className={`${display.variable} ${ui.variable}`}>
      <body>{children}</body>
    </html>
  );
}
