import type { Metadata, Viewport } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n/context';
import { AuthProvider } from '@/lib/auth-context';
import { TopBar } from '@/components/common/top-bar';
import { BottomNav } from '@/components/common/bottom-nav';
import { DesktopSidebar } from '@/components/common/desktop-sidebar';
import { PwaInstallPrompt } from '@/components/pwa/pwa-install-prompt';
import { AuthGuard } from '@/components/common/auth-guard';

export const metadata: Metadata = {
  title: 'ClassDesk - School & Tuition SaaS',
  description: 'Multi-tenant school and tuition management platform for India',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ClassDesk',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#4f46e5',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
        <I18nProvider>
          <AuthProvider>
            <AuthGuard>
              <TopBar />
              <div className="flex-1 flex max-w-7xl w-full mx-auto">
                <DesktopSidebar />
                <main className="flex-1 min-w-0 p-3.5 sm:p-6 pb-24 sm:pb-8 max-w-5xl mx-auto w-full">
                  {children}
                </main>
              </div>
              <BottomNav />
              <PwaInstallPrompt />
            </AuthGuard>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
