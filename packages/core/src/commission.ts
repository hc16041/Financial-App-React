// Comisión de una inversión, derivada del método de retiro y del tipo de operación.
//
// Reglas portadas de `commission-calculation.service.ts` del frontend Angular, para no
// tener dos cálculos distintos del mismo dinero. El método manda por su bandera
// `requiresCreditCard`; el nombre queda como respaldo para los datos ya cargados.

export type CommissionInput = {
  /** Monto en la forma que entrega el formulario (string) o ya numérico. */
  amount: number | string;
  /** 1 = retiro de plataforma (purchase), 2 = ingreso (payment). */
  transactionType: 1 | 2;
  methodName?: string;
  requiresCreditCard?: boolean;
  libreDeComision?: boolean;
};

export type CommissionResult = {
  /** Comisión en dólares, dos decimales. */
  commission: number;
  /** false cuando la regla no puede decidirla: el usuario la escribe a mano. */
  auto: boolean;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const isCardMethod = (name: string, requiresCreditCard?: boolean) =>
  Boolean(requiresCreditCard) ||
  name.includes('tarjeta') ||
  name.includes('credito') ||
  name.includes('crédito') ||
  name.includes('card');

const isBitcoinMethod = (name: string) => name.includes('bitcoin') || name.includes('btc');

export const commissionFor = (input: CommissionInput): CommissionResult => {
  const amount = typeof input.amount === 'number' ? input.amount : Number(input.amount);

  if (input.libreDeComision || !Number.isFinite(amount) || amount <= 0) {
    return { commission: 0, auto: true };
  }

  const name = (input.methodName ?? '').toLowerCase();
  const card = isCardMethod(name, input.requiresCreditCard);
  const bitcoin = isBitcoinMethod(name);

  // Retiro de plataforma: no genera comisión, salvo que el usuario la sepa.
  if (input.transactionType === 1) {
    return { commission: 0, auto: !bitcoin };
  }

  if (bitcoin) return { commission: round2(amount * 0.01), auto: true };
  if (card) return { commission: round2(amount * 0.026 + 1.3), auto: true };

  return { commission: 0, auto: true };
};
