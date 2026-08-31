import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { AppProviders } from '@/components/app-providers';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'ReNodo | La biblioteca de objetos de tu barrio',
  description:
    'Reserva herramientas, equipamiento y objetos útiles en centros comunitarios cercanos.',
  openGraph: {
    title: 'ReNodo | Pide prestado. Compra menos. Comparte más.',
    description:
      'La biblioteca de objetos de tu barrio: reserva, recoge y devuelve cerca de casa.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ReNodo' }],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReNodo | Pide prestado. Compra menos. Comparte más.',
    description: 'Reserva objetos útiles en centros comunitarios cercanos.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>
          <a className="skip-link" href="#contenido">
            Saltar al contenido
          </a>
          <div className="site-shell">
            <SiteHeader />
            {children}
            <SiteFooter />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
