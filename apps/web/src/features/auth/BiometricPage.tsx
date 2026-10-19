import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Fingerprint } from 'lucide-react';
import { fetchBiometricStatus, disableBiometric } from '@financial/core';
import PageHead from '../../components/PageHead';
import Skeleton from '../../components/Skeleton';

// Estado + desactivación biométrica. Registro/inicio WebAuthn (passkeys)
// pendientes: el API no expone challenge, así que el flujo de firma
// aún no se puede diseñar contra el backend actual.
export default function BiometricPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['biometric', 'status'], queryFn: fetchBiometricStatus, retry: false });
  const disable = useMutation({
    mutationFn: disableBiometric,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biometric'] }),
  });

  if (status.isPending) return <Skeleton rows={3} />;
  if (status.isError)
    return <div><p className="error-text">{t('common.error')}</p><button className="btn btn--sm" onClick={() => status.refetch()}>{t('common.retry')}</button></div>;

  const on = status.data?.isEnabled ?? false;
  return (
    <section>
      <PageHead title={t('auth.biometric')} />
      <div className="card" style={{ maxWidth: '32rem' }}>
        <div className="row-between">
          <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--fp-space-2)', margin: 0 }}>
            <Fingerprint size={20} aria-hidden="true" />
            {on ? t('auth.bioOn') : t('auth.bioOff')}
          </p>
          <span className={`badge ${on ? 'badge--in' : ''}`}>{on ? t('common.active', 'Activa') : t('common.inactive', 'Inactiva')}</span>
        </div>
        {on && (
          <div style={{ marginTop: 'var(--fp-space-3)' }}>
            <button className="btn btn--danger" disabled={disable.isPending} onClick={() => disable.mutate()}>{t('auth.bioDisable')}</button>
          </div>
        )}
        {disable.isError && <p className="error-text" style={{ marginTop: 'var(--fp-space-3)' }}>{(disable.error as Error).message}</p>}
      </div>
    </section>
  );
}
