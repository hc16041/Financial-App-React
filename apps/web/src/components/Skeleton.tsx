import { useTranslation } from 'react-i18next';

// Marcador de carga: mantiene la forma del contenido mientras llega el dato.
export default function Skeleton({ rows = 5 }: { rows?: number }) {
  const { t } = useTranslation();
  return (
    <div className="skeleton" role="status" aria-busy="true" aria-label={t('common.loading')}>
      {Array.from({ length: rows }).map((_, i) => <span key={i} className="skeleton__line" />)}
    </div>
  );
}
