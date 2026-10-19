import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToasts } from './toast';

// Pila de avisos en la esquina inferior derecha. aria-live para lectores de pantalla.
export default function Toaster() {
  const { t } = useTranslation();
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((x) => (
        <div key={x.id} className={`toast toast--${x.kind}`}>
          {x.kind === 'ok' ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
          <span className="toast__msg">{x.message}</span>
          <button className="toast__close" onClick={() => dismiss(x.id)} aria-label={t('common.close')}>
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
