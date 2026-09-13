import { Nivel } from '../types/models';

// Hace falta un mínimo de sesiones analizadas para que la nota media diga algo
// fiable del nivel real -- con 1 o 2 vídeos sueltos daría un resultado con
// mucho ruido (una sesión mala o muy buena de casualidad).
const MIN_ANALISIS = 3;

export function computeNivelReal(notaMedia: number, nAnalisis: number): Nivel | null {
  if (nAnalisis < MIN_ANALISIS) return null;
  if (notaMedia >= 7.8) return 'Avanzado';
  if (notaMedia >= 5.5) return 'Medio';
  return 'Iniciación';
}

const ORDEN: Nivel[] = ['Iniciación', 'Medio', 'Avanzado'];

export function esNivelSuperior(real: Nivel, declarado: Nivel): boolean {
  return ORDEN.indexOf(real) > ORDEN.indexOf(declarado);
}
