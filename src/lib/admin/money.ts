export function normalizeMoney(value: number, digits = 2): number {
  // Normaliza también importes pequeños que se mostrarían como cero al redondear.
  const amount = Number(value);
  return Math.abs(amount) < .5 * 10 ** -digits ? 0 : amount;
}

export function moneyNumber(value: number, digits = 2, locale = 'es-BO', minimumDigits = digits): string {
  return normalizeMoney(value, digits).toLocaleString(locale, {
    minimumFractionDigits: minimumDigits,
    maximumFractionDigits: digits,
  });
}

export function adminTourMoney(value: number | null): string {
  return value === null || Number(value) === 0 ? 'Consultar' : moneyNumber(value, 2, 'es-BO', 0);
}
