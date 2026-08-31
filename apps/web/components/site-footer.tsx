import { ArrowUpRight, Code2, HeartHandshake, Mail } from 'lucide-react';
import Link from 'next/link';

import { Brand } from '@/components/brand';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-intro">
          <Brand />
          <p>Una biblioteca de objetos para que los barrios compren menos y compartan más.</p>
        </div>
        <div>
          <h2>Descubre</h2>
          <Link href="/explorar">Catálogo</Link>
          <Link href="/centros">Centros comunitarios</Link>
          <Link href="/como-funciona">El modelo</Link>
        </div>
        <div>
          <h2>Proyecto</h2>
          <a href="mailto:hola@renodo.example">
            <Mail aria-hidden="true" /> Contacto
          </a>
          <a href="https://github.com/xtragerdev" rel="noreferrer" target="_blank">
            <Code2 aria-hidden="true" /> Código abierto
          </a>
          <Link href="/gestion">
            <HeartHandshake aria-hidden="true" /> Acceso de centros
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 ReNodo · Proyecto FullStack educativo</span>
        <Link href="/como-funciona#transparencia">
          Transparencia del dato <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </footer>
  );
}
