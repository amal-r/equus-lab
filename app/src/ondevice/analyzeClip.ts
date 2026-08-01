/**
 * Análisis ON-DEVICE (plan gratis, coste 0).
 *
 * ESTADO ACTUAL: motor de biomecánica simulado (determinista, sin red, sin cámara real
 * de landmarks). Genera una nota + correcciones con marca de tiempo a partir de metadatos
 * del clip (duración, disciplina, foco, pie a tierra) para que TODO el flujo de la app
 * (Subir → Procesando → Resultado → Comparación) funcione de extremo a extremo hoy mismo.
 *
 * SIGUIENTE ITERACIÓN (documentada en IMPLEMENTACION.md §1): sustituir el cuerpo de
 * `extractPoseIssues()` por landmarks reales de MediaPipe Pose / Vision (iOS) / ML Kit
 * (Android) muestreados a 1-2 fps, calculando los mismos tipos de `issue` (ángulo de
 * rodilla, línea de espalda, etc.) a partir de los puntos del cuerpo. La firma pública
 * de `analyzeClip()` no cambia, así que las pantallas no necesitan tocarse.
 */
import { AnalysisResult, AnalysisTip, Disciplina } from '../types/models';

export interface AnalyzeClipInput {
  uri: string;
  durationSec: number;
  caballo: string;
  disciplina: Disciplina;
  foco: string;
  esPieATierra: boolean;
}

export type ProgressStep = 0 | 1 | 2 | 3;

export interface ProgressEvent {
  pct: number;
  step: ProgressStep;
  pointCount: number;
  strideCount: number;
}

// --- PRNG determinista (mulberry32) sembrado por el propio clip -----------------------
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

interface IssuePool {
  label: string;
  texts: string[];
}

const MONTA_ISSUES: IssuePool[] = [
  { label: 'Talón/base', texts: ['Sube un poco los talones — apoya el peso en el estribo y ganarás una base firme.', 'Ángulo de rodilla algo cerrado: baja el peso al estribo y estira la pierna.'] },
  { label: 'Asiento', texts: ['Tronco ligeramente adelantado sobre la cadera: crece desde el ombligo y alinea hombro–cadera–talón.', 'El asiento pierde estabilidad en las transiciones: acompaña con el cinturón pélvico, no con la espalda baja.'] },
  { label: 'Contacto', texts: ['Baja las manos para recuperar la línea codo–mano–boca; el caballo irá más redondo.', 'El contacto se vuelve intermitente en las diagonales: mantén una tensión constante y elástica en las riendas.'] },
  { label: 'Rectitud', texts: ['En la diagonal, endereza las ancas: activa el corvejón interior con transiciones cortas.', 'La rectitud se corrige con la pierna interior hacia la mano exterior.'] },
];

const SALTO_ISSUES: IssuePool[] = [
  { label: 'Aproximación', texts: ['Cuenta el ritmo de galope dos zancadas antes de la línea de batida para no adelantarte.', 'Mantén la mirada arriba en la aproximación; el caballo nota si bajas la vista.'] },
  { label: 'Batida', texts: ['Cierra el ángulo de cadera un poco antes de la batida para acompañar el impulso.', 'Adelanta ligeramente el peso en la batida sin perder el equilibrio sobre el estribo.'] },
  { label: 'Vuelo', texts: ['Mantén el contacto suave en el vuelo, sin bloquear el cuello del caballo.', 'Talón abajo durante todo el vuelo: evita que suba el pie del estribo.'] },
  { label: 'Recepción', texts: ['Absorbe la recepción con las rodillas, no con la zona lumbar.', 'Recupera las riendas justo tras la recepción para no perder la dirección.'] },
];

const PIE_A_TIERRA_ISSUES: IssuePool[] = [
  { label: 'Posición', texts: ['Mantente a la altura de la cincha, no adelante de la paleta, para dirigir mejor la energía.', 'Las manos van bajas y quietas: evita "remar" al pedir movimiento.'] },
  { label: 'Cesiones', texts: ['Pide la cesión con la cuerda/fusta y suelta en cuanto ceda un paso, aunque sea pequeño.', 'Busca que el caballo cruce bien la mano interior sobre la exterior en el círculo.'] },
  { label: 'Energía', texts: ['El caballo pierde impulso a mitad de ejercicio: reactiva con la voz antes de insistir con la fusta.', 'Trabaja transiciones paso–parada para afinar la atención antes de pedir aires.'] },
];

function issuePoolFor(input: AnalyzeClipInput): IssuePool[] {
  if (input.esPieATierra) return PIE_A_TIERRA_ISSUES;
  if (input.disciplina === 'Salto') return SALTO_ISSUES;
  return MONTA_ISSUES;
}

function secToLabel(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export async function analyzeClip(
  input: AnalyzeClipInput,
  onProgress?: (e: ProgressEvent) => void
): Promise<AnalysisResult> {
  const seed = hashSeed(`${input.uri}|${Math.round(input.durationSec)}|${input.disciplina}|${input.foco}`);
  const rand = mulberry32(seed);

  const totalFrames = Math.max(6, Math.round(input.durationSec * 1.5)); // ~1.5 fps simulados
  let pct = 0;
  let tick = 0;
  while (pct < 100) {
    await new Promise((r) => setTimeout(r, 140));
    pct = Math.min(100, pct + (rand() * 7 + 5));
    tick++;
    const step: ProgressStep = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;
    onProgress?.({
      pct: Math.round(pct),
      step,
      pointCount: Math.round((pct / 100) * 17),
      strideCount: Math.round((pct / 100) * totalFrames * 7.4),
    });
  }

  const pool = issuePoolFor(input);
  const nIssues = 2 + Math.floor(rand() * 3); // 2-4 incidencias
  const usedLabels = new Set<string>();
  const tips: AnalysisTip[] = [];
  for (let i = 0; i < nIssues; i++) {
    const group = pool[Math.floor(rand() * pool.length)];
    if (usedLabels.has(group.label) && usedLabels.size < pool.length) {
      i--;
      continue;
    }
    usedLabels.add(group.label);
    const text = group.texts[Math.floor(rand() * group.texts.length)];
    const t = Math.max(3, Math.round(rand() * Math.max(3, input.durationSec - 3)));
    tips.push({ timeSec: t, timeLabel: secToLabel(t), text });
  }
  tips.sort((a, b) => a.timeSec - b.timeSec);

  const nota = Math.max(4, Math.min(9.5, 8.6 - tips.length * 0.45 - rand() * 0.6));
  const subscoreBase = (label: string, penalize: boolean) => {
    const base = 7.6 - rand() * 1.4;
    return { label, val: Math.round((penalize ? base - 0.9 : base) * 10) / 10 };
  };
  const subscores = input.esPieATierra
    ? [subscoreBase('Posición', usedLabels.has('Posición')), subscoreBase('Cesiones', usedLabels.has('Cesiones')), subscoreBase('Energía', usedLabels.has('Energía'))]
    : input.disciplina === 'Salto'
    ? [subscoreBase('Aproximación', usedLabels.has('Aproximación')), subscoreBase('Batida', usedLabels.has('Batida')), subscoreBase('Recepción', usedLabels.has('Recepción'))]
    : [subscoreBase('Asiento', usedLabels.has('Asiento')), subscoreBase('Contacto', usedLabels.has('Contacto')), subscoreBase('Rectitud', usedLabels.has('Rectitud'))];

  const bienHechoPool = input.esPieATierra
    ? 'Buena disposición del caballo a la voz y transiciones limpias entre aires de la mano.'
    : input.disciplina === 'Salto'
    ? 'Ritmo de galope constante en la línea y buena disposición del conjunto hacia los obstáculos.'
    : 'Ritmo de trote constante y buena disposición del conjunto. Las transiciones ascendentes son limpias.';

  const ejercicioPool = input.esPieATierra
    ? `Trabaja cesiones cortas en círculo con ${input.caballo}, premiando cada intento con la voz.`
    : input.disciplina === 'Salto'
    ? `Gimnasia de barras a distancia corta para afinar la batida de ${input.caballo}.`
    : `Transiciones trote–paso–trote cada 8 trancos para que ${input.caballo} meta la grupa bajo la masa.`;

  const result: AnalysisResult = {
    id: `${Date.now()}-${Math.floor(rand() * 1e6)}`,
    fecha: new Date().toISOString(),
    caballo: input.caballo,
    disciplina: input.disciplina,
    foco: input.foco,
    ejercicio: input.esPieATierra ? 'Trabajo pie a tierra' : input.disciplina === 'Salto' ? 'Gimnasia de salto' : 'Trote reunido',
    esPieATierra: input.esPieATierra,
    nota: Math.round(nota * 10) / 10,
    subscores,
    bienHecho: bienHechoPool,
    tips,
    ejercicioSemana: ejercicioPool,
    videoUri: input.uri,
    origen: 'ondevice',
  };
  return result;
}
