import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Cabecera de página: migas (Inicio / página), título con contador y acciones.
// Reemplaza el <h2> suelto de cada pantalla para dar jerarquía consistente.
export default function PageHead({ title, section, count, actions }: {
  title: string; section?: string; count?: number; actions?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="page-head">
      <div>
        <nav className="crumb" aria-label={t('nav.breadcrumb')}>
          <Link to="/">{t('nav.home')}</Link>
          <ChevronRight size={14} aria-hidden="true" />
          {section && <><span>{section}</span><ChevronRight size={14} aria-hidden="true" /></>}
          <span aria-current="page">{title}</span>
        </nav>
        <h1 className="page-head__title">
          {title}
          {count != null && <span className="page-head__count">{count}</span>}
        </h1>
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </div>
  );
}
