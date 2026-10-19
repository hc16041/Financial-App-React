import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

// Modal sobre <dialog> nativo: foco atrapado, ESC y backdrop gratis.
// El estado `open` lo controla el padre; cerrar (ESC/backdrop/botón) avisa onClose.
export default function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="modal__head">
        <h3 className="modal__title">{title}</h3>
        <button type="button" className="btn btn--ghost btn--sm icon-btn" onClick={onClose} aria-label={t('common.close')}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="modal__body">{children}</div>
    </dialog>
  );
}
