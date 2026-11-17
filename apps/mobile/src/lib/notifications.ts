// Recordatorios: BLOQUEADOS en este entorno.
//
// `expo-notifications` dejó de estar incluido en Expo Go en Android desde SDK 53
// y, en SDK 58, su inicialización lanza un rechazo sin capturar
// ("Cannot find native module 'ExpoTopicSubscriptionModule'") que tumba la app
// incluso cargándolo con import() dinámico. No es un error de nuestro código:
// el módulo no existe en el binario de Expo Go.
//
// Para activarlo hace falta un development build (npx expo run:android o EAS).
// Hoy no se puede generar: el build nativo falla en react-native-worklets y no
// hay proyecto EAS configurado.
//
// Lo que YA está listo del lado servidor: tabla finance.DeviceTokens, endpoints
// POST/DELETE /api/devices, verificados contra Postgres.
//
// Cuando exista el development build, esta función debe:
//   1. pedir permiso con expo-notifications
//   2. cancelar los recordatorios propios (prefijo loan-/card-)
//   3. programar cuota de préstamo (Loan.dueDay) y vencimiento de tarjeta
//      (Card.paymentDueDay) a las 09:00 de la próxima ocurrencia
import type { Card, Loan } from '@financial/core';

export const notificationsSupported = false;

export const rescheduleReminders = async (_loans: Loan[], _cards: Card[]): Promise<number> => 0;
