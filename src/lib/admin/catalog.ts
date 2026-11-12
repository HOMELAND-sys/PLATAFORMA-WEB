// El marcador solo identifica borradores importados y nunca etiqueta tours activos.
export function isDraftTour(tour: { active: boolean; summary: string[] }): boolean {
  return !tour.active && Boolean(tour.summary[0]?.trimStart().startsWith('[BORRADOR]'));
}
