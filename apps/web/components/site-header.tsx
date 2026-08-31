'use client';

import { LogOut, Menu, ShieldCheck, UserRound, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';

const links = [
  { href: '/explorar', label: 'Explora' },
  { href: '/centros', label: 'Centros' },
  { href: '/como-funciona', label: 'Cómo funciona' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, ready, logout } = useAuth();
  const canManage = user?.role === 'manager' || user?.role === 'admin';
  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <header className="site-header">
      <Brand />
      <nav className="main-nav" aria-label="Navegación principal">
        {links.map((link) => (
          <Link
            className={isActive(link.href) ? 'is-active' : undefined}
            href={link.href}
            key={link.href}
            aria-current={isActive(link.href) ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        {ready && user ? (
          <>
            {canManage && (
              <Button asChild variant="ghost" className="login-button">
                <Link href="/gestion">
                  <ShieldCheck aria-hidden="true" /> Gestión
                </Link>
              </Button>
            )}
            <Button asChild className="join-button">
              <Link href="/cuenta">
                <UserRound aria-hidden="true" /> {user.name.split(' ')[0]}
              </Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="ghost" className="login-button">
              <Link href="/acceso">Entrar</Link>
            </Button>
            <Button asChild className="join-button">
              <Link href="/acceso?modo=registro">Crear cuenta</Link>
            </Button>
          </>
        )}
        <button
          className="mobile-menu-button"
          type="button"
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      {mobileOpen && (
        <nav className="mobile-nav" aria-label="Navegación móvil">
          {links.map((link) => (
            <Link href={link.href} key={link.href} onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href="/cuenta" onClick={() => setMobileOpen(false)}>
                Mi cuenta
              </Link>
              {canManage && (
                <Link href="/gestion" onClick={() => setMobileOpen(false)}>
                  Panel de gestión
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
              >
                <LogOut aria-hidden="true" /> Cerrar sesión
              </button>
            </>
          ) : (
            <Link href="/acceso" onClick={() => setMobileOpen(false)}>
              Entrar o crear cuenta
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
