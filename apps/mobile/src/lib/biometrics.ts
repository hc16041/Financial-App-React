// Biometría local: desbloquea la app y confirma operaciones sensibles.
// El dato biométrico nunca sale del dispositivo; el backend no lo ve.
import * as LocalAuthentication from 'expo-local-authentication';

export const biometricsAvailable = async (): Promise<boolean> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
};

/** Devuelve true solo si el usuario se autenticó. Cancelar no es un error. */
export const authenticate = async (promptMessage: string): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
};
