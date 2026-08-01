import { CoachTone } from '../types/models';

export function toneScoreMsg(tone: CoachTone, nota: number, tipsCount: number): string {
  const notaStr = nota.toFixed(1).replace('.', ',');
  if (tone === 'Técnico') {
    return `${notaStr}. Se detectan ${tipsCount} incidencias biomecánicas relevantes. Corrige la base y el contacto para subir de nota.`;
  }
  if (tone === 'Exigente') {
    return `${notaStr} es justo. Con esas incidencias no hay reunión real todavía. A trabajar en serio.`;
  }
  return `${notaStr}. Vas por buen camino — corrige lo de abajo y subes fácil. ¡Sigue así! 💪`;
}

export function toneGreeting(tone: CoachTone, rider: string, tipsCount: number): string {
  if (tone === 'Técnico') {
    return `Sesión analizada. ${tipsCount} incidencias detectadas. ¿Por dónde empezamos?`;
  }
  if (tone === 'Exigente') {
    return 'He visto tu monta. Hay cosas que apretar. Pregúntame lo que necesites y sin excusas.';
  }
  return `¡Hola ${rider}! Ya he revisado tu última sesión. ¿Quieres que te lo explique paso a paso? 🐴`;
}
