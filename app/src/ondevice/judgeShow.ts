/**
 * Simulacro de concurso (juez IA). Igual que analyzeClip.ts: hoy es un generador
 * determinista local (sin red) para que el flujo de Concursos funcione de punta a
 * punta en el plan gratis/demo. En Premium con backend, esto se sustituye por
 * `/api/shows/judge` (Gemini como juez, ver IMPLEMENTACION.md §3).
 */
import { Disciplina, Veredicto } from '../types/models';

function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOVS: Record<string, string[]> = {
  'Doma clásica': [
    'Entrada al paso · parada · saludo',
    'Trote reunido en círculo',
    'Cesión a la pierna',
    'Medios pasos al galope',
    'Cambios de pie cada 4 trancos',
    'Transición trote–paso',
  ],
  Salto: ['Línea de entrada', 'Combinación doble', 'Línea de salida', 'Ronda contrarreloj'],
  'Doma vaquera': ['Entrada y saludo', 'Círculos al galope', 'Paradas y arrancadas', 'Riendas atrás'],
  Completo: ['Doma: figuras de picadero', 'Cross: recorrido', 'Salto: recorrido de pista'],
};

export interface JudgeShowInput {
  uri: string;
  durationSec: number;
  caballo: string;
  disciplina: Disciplina;
  prueba: string;
}

export async function judgeShow(input: JudgeShowInput): Promise<Veredicto> {
  const seed = hashSeed(`${input.uri}|${input.disciplina}|${input.prueba}`);
  const rand = mulberry32(seed);
  await new Promise((r) => setTimeout(r, 1400 + rand() * 800));

  const movs = MOVS[input.disciplina] ?? MOVS['Doma clásica'];
  const sheetRows = movs.map((mov, i) => ({
    n: String(i + 1),
    mov,
    coef: rand() > 0.8 ? '×2' : '×1',
    nota: Math.round((5.5 + rand() * 3.5) * 2) / 2,
  }));
  const colectivas = ['Aires', 'Impulsión', 'Sumisión', 'Posición y asiento del jinete'].map((k) => ({
    k,
    v: Math.round((5.5 + rand() * 3) * 2) / 2,
  }));

  const weighted = sheetRows.reduce((sum, r) => sum + r.nota * (r.coef === '×2' ? 2 : 1), 0);
  const totalCoef = sheetRows.reduce((sum, r) => sum + (r.coef === '×2' ? 2 : 1), 0);
  const pctFinal = Math.round(((weighted / totalCoef / 10) * 100) * 10) / 10;

  const puesto = pctFinal >= 72 ? 'muy buena' : pctFinal >= 62 ? 'buena' : pctFinal >= 50 ? 'correcta' : 'a mejorar';
  const comentario =
    pctFinal >= 70
      ? `Prueba sólida en ${input.disciplina.toLowerCase()}. Mantén esta regularidad y sube dificultad progresivamente.`
      : `Ejecución con altibajos. Refuerza los movimientos con coeficiente ×2 antes de la próxima prueba: ahí se decide la nota.`;

  return {
    id: `${Date.now()}-${Math.floor(rand() * 1e6)}`,
    fecha: new Date().toISOString(),
    disciplina: input.disciplina,
    prueba: input.prueba,
    caballo: input.caballo,
    puntuacionFinal: pctFinal,
    puesto,
    sheetRows,
    colectivas,
    comentario,
  };
}
