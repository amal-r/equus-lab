/**
 * Escaneo morfológico ON-DEVICE (plan gratis, coste 0).
 *
 * ESTADO ACTUAL: igual que analyzeClip.ts, esto es un generador determinista
 * (sin red, sin keypoints reales) para que TODO el flujo (captura → resultado →
 * comparar evolución) funcione de extremo a extremo hoy mismo.
 *
 * SIGUIENTE ITERACIÓN (ver PROMPT-MORFOLOGIA.md): sustituir el cuerpo de esta
 * función por keypoints reales de pose animal -- iOS `VNDetectAnimalBodyPoseRequest`
 * (Vision), Android un modelo TFLite de keypoints (base AP-10K/DeepLabCut) -- y
 * calcular proporciones/ángulos/simetría reales por trigonometría a partir de
 * los puntos anatómicos (cruz, dorso, punta de anca, isquion, codo, corvejón,
 * rodilla, casco). Requiere un módulo nativo (Expo config plugin) que hoy no
 * existe en el proyecto; la firma pública de `analyzeMorphology()` no cambia,
 * así que la pantalla no necesita tocarse cuando se sustituya.
 */
import { MorphImages, MorphMedida, MorphScan, MorphZona } from '../types/models';

export interface AnalyzeMorphologyInput {
  images: MorphImages;
  caballo: string;
  horseId?: string;
}

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

const ZONA_LABELS = ['Dorso / lomo', 'Grupa izquierda', 'Grupa derecha', 'Cuello / trapecio', 'Pectoral / antebrazo'];

const ZONA_NOTAS: Record<'correcto' | 'debil' | 'atrofia', string[]> = {
  correcto: ['Desarrollo homogéneo, sin diferencias reseñables.', 'Buen tono muscular para el trabajo habitual.'],
  debil: ['Algo menos de masa que en el resto del cuerpo — vigilar en próximos escaneos.', 'Tono discreto, mejorable con trabajo específico.'],
  atrofia: ['Bastante menos masa que en la zona simétrica — conviene revisión veterinaria.', 'Diferencia marcada respecto al lado opuesto.'],
};

const MEDIDA_DEFS: { label: string; unidad: string; base: number; spread: number }[] = [
  { label: 'Alzada a la cruz', unidad: 'cm', base: 158, spread: 10 },
  { label: 'Longitud escápula–isquion', unidad: 'cm', base: 132, spread: 8 },
  { label: 'Ángulo de grupa', unidad: '°', base: 24, spread: 4 },
  { label: 'Ángulo escápula–húmero', unidad: '°', base: 100, spread: 6 },
  { label: 'Simetría de grupa', unidad: '%', base: 96, spread: 6 },
  { label: 'Perímetro torácico', unidad: 'cm', base: 182, spread: 12 },
];

function refFor(label: string, delta: number): MorphMedida['ref'] {
  if (label === 'Simetría de grupa') return delta < -4 ? 'asimetria' : 'en rango';
  if (label.startsWith('Ángulo')) return Math.abs(delta) > 3 ? 'algo cerrado' : 'en rango';
  return 'en rango';
}

const PLAN_POOL = [
  'Semana 1-2: trabajo de calentamiento activo + 10 min de trote en línea recta para equilibrar la carga muscular. Semana 3-4: introduce cesiones suaves hacia el lado más flojo, 3 sesiones semanales de 15 min.',
  'Semana 1-2: paseos en terreno variado para activar la musculatura de forma general. Semana 3-4: series cortas de transiciones paso-trote, priorizando la zona detectada como más débil.',
  'Semana 1-2: trabajo pie a tierra con cesiones cortas para despertar el lado menos desarrollado. Semana 3-4: sube la exigencia con círculos de 15-20m alternando manos cada pocas vueltas.',
];

export async function analyzeMorphology(input: AnalyzeMorphologyInput): Promise<MorphScan> {
  const seed = hashSeed(`${input.caballo}|${input.images.perfil ?? ''}|${input.images.frontal ?? ''}|${input.images.posterior ?? ''}`);
  const rand = mulberry32(seed);

  const zonas: MorphZona[] = ZONA_LABELS.map((zona) => {
    const roll = rand();
    const estado: MorphZona['estado'] = roll > 0.82 ? 'atrofia' : roll > 0.55 ? 'debil' : 'correcto';
    const pct = Math.round((estado === 'correcto' ? 78 + rand() * 18 : estado === 'debil' ? 55 + rand() * 20 : 30 + rand() * 20));
    const notas = ZONA_NOTAS[estado];
    return { zona, estado, pct, nota: notas[Math.floor(rand() * notas.length)] };
  });

  const medidas: MorphMedida[] = MEDIDA_DEFS.map((def) => {
    const delta = (rand() - 0.5) * 2 * def.spread;
    const valor = Math.round((def.base + delta) * 10) / 10;
    return { label: def.label, valor: `${valor} ${def.unidad}`, ref: refFor(def.label, delta) };
  });

  const nAtrofias = zonas.filter((z) => z.estado === 'atrofia').length;
  const nDebiles = zonas.filter((z) => z.estado === 'debil').length;
  const indice = Math.round(Math.max(3, Math.min(9.5, 8.4 - nAtrofias * 1.3 - nDebiles * 0.5 - rand() * 0.4)) * 10) / 10;

  const resumen =
    nAtrofias > 0
      ? `Se observa menos desarrollo muscular de lo esperado en ${nAtrofias === 1 ? 'una zona' : `${nAtrofias} zonas`}; el resto del cuerpo está dentro de un desarrollo normal para su morfología.`
      : nDebiles > 0
      ? 'Desarrollo general correcto, con un par de zonas algo por debajo del resto que conviene trabajar.'
      : 'Desarrollo muscular homogéneo y sin asimetrías reseñables en las tres tomas.';

  const alertas: string[] = [];
  const asimetriaGrupa = medidas.find((m) => m.label === 'Simetría de grupa');
  if (nAtrofias > 0 || asimetriaGrupa?.ref === 'asimetria') {
    alertas.push('La diferencia detectada entre lados conviene revisarla con un veterinario o fisioterapeuta equino antes de intensificar el trabajo.');
  }

  return {
    id: `${Date.now()}-${Math.floor(rand() * 1e6)}`,
    fecha: new Date().toISOString(),
    horseId: input.horseId,
    caballo: input.caballo,
    images: input.images,
    indice,
    resumen,
    zonas,
    medidas,
    plan: PLAN_POOL[Math.floor(rand() * PLAN_POOL.length)],
    alertas,
    origen: 'ondevice',
  };
}
