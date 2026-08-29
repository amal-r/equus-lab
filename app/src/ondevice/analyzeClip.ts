/**
 * Análisis ON-DEVICE (plan gratis, coste 0).
 *
 * ESTADO ACTUAL: motor de biomecánica simulado (determinista, sin red, sin cámara real
 * de landmarks). Genera una nota + correcciones con marca de tiempo a partir de metadatos
 * del clip (duración, disciplina, foco, pie a tierra) para que TODO el flujo de la app
 * (Subir → Procesando → Resultado → Comparación) funcione de extremo a extremo hoy mismo.
 * Los bancos de texto están separados por disciplina (y por pie a tierra vs montado) para
 * que el resultado se ajuste a lo que la persona sube, en vez de un mismo texto genérico.
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

interface DisciplineBank {
  issues: IssuePool[];
  bienHecho: string[];
  ejercicioSemana: ((caballo: string) => string)[];
  ejercicioNombre: string[];
}

const PIE_A_TIERRA_BANK: DisciplineBank = {
  issues: [
    {
      label: 'Posición',
      texts: [
        'Mantente a la altura de la cincha, no adelante de la paleta, para dirigir mejor la energía.',
        'Las manos van bajas y quietas: evita "remar" al pedir movimiento.',
        'Cuida tu propia postura: hombros atrás y mirada en la dirección del movimiento, no en el caballo.',
        'La distancia al caballo debe ser constante; si te acercas demasiado, pierdes capacidad de reacción.',
      ],
    },
    {
      label: 'Cesiones',
      texts: [
        'Pide la cesión con la cuerda/fusta y suelta en cuanto ceda un paso, aunque sea pequeño.',
        'Busca que el caballo cruce bien la mano interior sobre la exterior en el círculo.',
        'La cesión de espalda mejora si primero consigues que baje la cabeza y relaje la nuca.',
        'No repitas la misma ayuda muchas veces seguidas sin soltar: eso apaga la respuesta, no la mejora.',
      ],
    },
    {
      label: 'Energía',
      texts: [
        'El caballo pierde impulso a mitad de ejercicio: reactiva con la voz antes de insistir con la fusta.',
        'Trabaja transiciones paso–parada para afinar la atención antes de pedir aires.',
        'Si el caballo se adelanta solo, para y vuelve a empezar al paso: la calma manda sobre la velocidad.',
        'Varía el ritmo de la voz (más grave para calmar, más viva para activar) en vez de repetir siempre igual.',
      ],
    },
    {
      label: 'Transiciones',
      texts: [
        'Marca claramente el final de cada transición con una pausa de la voz antes del siguiente pedido.',
        'En las transiciones paso–parada, busca que el caballo quede parado en escuadra, no torcido.',
        'Da un pedido, espera la respuesta y solo entonces repite: pedir varias veces seguidas confunde la señal.',
      ],
    },
  ],
  bienHecho: [
    'Buena disposición del caballo a la voz y transiciones limpias entre aires de la mano.',
    'El caballo mantiene una postura relajada durante todo el trabajo en mano.',
    'Buena consistencia en las ayudas: la fusta y la voz se usan siempre en el mismo orden y con la misma intensidad.',
    'El círculo se mantiene con un radio constante, señal de buen equilibrio lateral en el caballo.',
  ],
  ejercicioSemana: [
    (c) => `Trabaja cesiones cortas en círculo con ${c}, premiando cada intento con la voz.`,
    (c) => `Practica transiciones paso–parada–paso con ${c} para afinar la atención antes de pedir aires.`,
    (c) => `Introduce cambios de dirección en forma de ocho a la cuerda con ${c}, sin perder el ritmo del paso.`,
    () => 'Dedica 5 minutos solo a parar en escuadra desde el paso antes de retomar el trabajo normal.',
  ],
  ejercicioNombre: ['Trabajo pie a tierra', 'Cesiones en mano', 'Trabajo a la cuerda', 'Doma en mano'],
};

const SALTO_BANK: DisciplineBank = {
  issues: [
    {
      label: 'Aproximación',
      texts: [
        'Cuenta el ritmo de galope dos zancadas antes de la línea de batida para no adelantarte.',
        'Mantén la mirada arriba en la aproximación; el caballo nota si bajas la vista.',
        'Busca la línea recta hacia el centro del obstáculo desde 4-5 zancadas antes, no en el último momento.',
      ],
    },
    {
      label: 'Batida',
      texts: [
        'Cierra el ángulo de cadera un poco antes de la batida para acompañar el impulso.',
        'Adelanta ligeramente el peso en la batida sin perder el equilibrio sobre el estribo.',
        'Si el caballo bate largo, no lo persigas con las manos: sostén el ritmo dos zancadas antes.',
      ],
    },
    {
      label: 'Vuelo',
      texts: [
        'Mantén el contacto suave en el vuelo, sin bloquear el cuello del caballo.',
        'Talón abajo durante todo el vuelo: evita que suba el pie del estribo.',
        'Deja que el caballo redondee el lomo libremente; no lo sujetes con la espalda en el aire.',
      ],
    },
    {
      label: 'Recepción',
      texts: [
        'Absorbe la recepción con las rodillas, no con la zona lumbar.',
        'Recupera las riendas justo tras la recepción para no perder la dirección.',
        'Cuenta la primera zancada tras el obstáculo antes de pedir el siguiente giro.',
      ],
    },
    {
      label: 'Distancias',
      texts: [
        'En las líneas a dos obstáculos, mide antes las zancadas: añadir o quitar sobre la marcha desequilibra al caballo.',
        'Si llegas siempre corto a la misma línea, revisa el ritmo de galope en el tramo anterior, no solo la última zancada.',
      ],
    },
  ],
  bienHecho: [
    'Ritmo de galope constante en la línea y buena disposición del conjunto hacia los obstáculos.',
    'Buen equilibrio en el vuelo: el caballo redondea el lomo con libertad.',
    'La aproximación es recta y decidida en la mayoría de los obstáculos.',
    'Buena recuperación de las riendas tras la recepción, lo que ayuda en los giros siguientes.',
  ],
  ejercicioSemana: [
    (c) => `Gimnasia de barras a distancia corta para afinar la batida de ${c}.`,
    (c) => `Cuadras (grid) de 3-4 saltos bajos con ${c} para trabajar el ritmo sin pensar en la altura.`,
    () => 'Trabajo de línea recta a un solo obstáculo, contando las zancadas en voz alta en la aproximación.',
    () => 'Ejercicios de galope de trabajo/galope reunido alternos para mejorar el ajuste de zancada.',
  ],
  ejercicioNombre: ['Gimnasia de salto', 'Línea de barras', 'Cuadra de saltos bajos', 'Salto aislado con giro'],
};

const DOMA_CLASICA_BANK: DisciplineBank = {
  issues: [
    {
      label: 'Asiento',
      texts: [
        'Tronco ligeramente adelantado sobre la cadera: crece desde el ombligo y alinea hombro–cadera–talón.',
        'El asiento pierde estabilidad en las transiciones: acompaña con el cinturón pélvico, no con la espalda baja.',
        'Evita fijar la cadera: debe acompañar el balanceo del dorso del caballo en cada zancada.',
      ],
    },
    {
      label: 'Contacto',
      texts: [
        'Baja las manos para recuperar la línea codo–mano–boca; el caballo irá más redondo.',
        'El contacto se vuelve intermitente en las diagonales: mantén una tensión constante y elástica en las riendas.',
        'Cede un instante tras cada pedido de flexión: un contacto que nunca cede se vuelve sordo.',
      ],
    },
    {
      label: 'Rectitud',
      texts: [
        'En la diagonal, endereza las ancas: activa el corvejón interior con transiciones cortas.',
        'La rectitud se corrige con la pierna interior hacia la mano exterior.',
        'El caballo carga más de un lado en el círculo: alterna manos con más frecuencia para equilibrar.',
      ],
    },
    {
      label: 'Reunión',
      texts: [
        'Empieza por transiciones trote–paso frecuentes; cuando salgan limpias, acórtalas cada 8 trancos para reunir de verdad.',
        'La flexión del corvejón mejora con trabajo en dos pistas suave, no forzando con la mano.',
        'Busca más impulso desde la pierna antes de pedir más reunión con la mano.',
      ],
    },
  ],
  bienHecho: [
    'Ritmo de trote constante y buena disposición del conjunto. Las transiciones ascendentes son limpias.',
    'Buena elasticidad en el contacto durante la mayor parte de la sesión.',
    'El caballo se mantiene recto en la mayoría de las líneas, con buen apoyo en ambas riendas.',
    'Las transiciones descendentes se hacen sin perder el equilibrio del conjunto.',
  ],
  ejercicioSemana: [
    (c) => `Transiciones trote–paso–trote cada 8 trancos con ${c} para meter la grupa bajo la masa.`,
    () => 'Trabajo en dos pistas suave (cesión a la pierna) para ganar flexibilidad lateral.',
    (c) => `Círculos de 15m con ${c}, alternando manos cada 2 vueltas para equilibrar la carga de cada lado.`,
    () => 'Series cortas de trote reunido/trote de trabajo para afinar el ajuste del paso.',
  ],
  ejercicioNombre: ['Trote reunido', 'Trabajo de rectitud', 'Transiciones en círculo', 'Sesión de flexibilidad lateral'],
};

const COMPLETO_BANK: DisciplineBank = {
  issues: [
    {
      label: 'Galope de campo',
      texts: [
        'El galope de campo pierde ritmo en las curvas: sostén con la pierna exterior antes de girar.',
        'Busca un galope más equilibrado y menos tumbado hacia adelante en terreno llano.',
      ],
    },
    {
      label: 'Control de velocidad',
      texts: [
        'Trabaja el cambio de ritmo dentro del mismo aire (más rápido/más lento) antes de ir a un obstáculo fijo.',
        'Si el caballo se acelera solo tras el obstáculo, recupera el ritmo con medias paradas antes de la siguiente curva.',
      ],
    },
    {
      label: 'Obstáculos fijos',
      texts: [
        'Ante obstáculos macizos, mantén la pierna activa hasta el último momento: no "sueltes" antes de la batida.',
        'La aproximación a obstáculos fijos debe ser aún más recta que en salto de pista, por el riesgo de parada.',
      ],
    },
    {
      label: 'Disposición al agua',
      texts: [
        'Si el caballo duda ante el agua, entra al paso las primeras veces y sube el ritmo poco a poco en próximas sesiones.',
        'Mantén las piernas activas y la mirada al frente al entrar en el agua; mirar hacia abajo transmite duda.',
      ],
    },
  ],
  bienHecho: [
    'Buena disposición ante los obstáculos fijos y ritmo de galope de campo constante.',
    'El caballo se mantiene confiado y decidido en la mayoría de los pasos de fondo.',
    'Buen equilibrio entre el trabajo de doma y la soltura necesaria en el campo.',
  ],
  ejercicioSemana: [
    (c) => `Trabajo de medias paradas en galope de campo con ${c} para mejorar el control de velocidad.`,
    () => 'Aproximaciones repetidas a un obstáculo fijo bajo, entrando siempre igual de recto.',
    (c) => `Sesión combinada con ${c}: 10 min de doma para el ajuste, seguido de galope de campo relajado.`,
  ],
  ejercicioNombre: ['Galope de campo', 'Trabajo de fondo', 'Aproximación a obstáculo fijo', 'Sesión combinada'],
};

const DOMA_VAQUERA_BANK: DisciplineBank = {
  issues: [
    {
      label: 'Asiento vaquero',
      texts: [
        'Mantén el asiento profundo y las piernas largas; evita subir los talones al pedir la parada.',
        'El cuerpo debe acompañar la parada hacia atrás, no adelantarse antes de que pare el caballo.',
      ],
    },
    {
      label: 'Paradas',
      texts: [
        'Prepara la parada con medias paradas de asiento antes de llegar, no solo con la rienda.',
        'Busca que la parada quede escuadrada, con el caballo apoyado en los cuatro pies por igual.',
      ],
    },
    {
      label: 'Riendas',
      texts: [
        'A la rienda suelta, la ayuda debe apoyarse en el cuello con precisión, sin cruzar de más.',
        'Si el caballo no responde a la neck rein, revisa primero que vaya reunido y no solo "de largo".',
      ],
    },
    {
      label: 'Reunión vaquera',
      texts: [
        'Busca más reunión desde la pierna antes de la parada, no frenando solo con la mano.',
        'El caballo pierde la reunión en los giros: sostén el impulso con ambas piernas al girar.',
      ],
    },
  ],
  bienHecho: [
    'Buena disposición del caballo a la rienda suelta y paradas con buena base.',
    'El asiento se mantiene profundo y acompaña bien las paradas.',
    'Buen manejo de la rienda con una mano en la mayoría del recorrido.',
  ],
  ejercicioSemana: [
    (c) => `Series de paradas cortas con ${c} desde el trote, buscando que queden escuadradas.`,
    () => 'Trabajo de neck rein en círculo grande, aumentando poco a poco la reunión.',
    (c) => `Transiciones galope–parada–galope con ${c} para afinar la preparación de la parada.`,
  ],
  ejercicioNombre: ['Trabajo de paradas', 'Neck rein en círculo', 'Reunión vaquera', 'Transiciones galope-parada'],
};

const DEFAULT_BANK = DOMA_CLASICA_BANK;

const DISCIPLINE_BANKS: Partial<Record<Disciplina, DisciplineBank>> = {
  Salto: SALTO_BANK,
  'Doma clásica': DOMA_CLASICA_BANK,
  Completo: COMPLETO_BANK,
  'Doma vaquera': DOMA_VAQUERA_BANK,
};

function bankFor(input: AnalyzeClipInput): DisciplineBank {
  if (input.esPieATierra) return PIE_A_TIERRA_BANK;
  return DISCIPLINE_BANKS[input.disciplina] ?? DEFAULT_BANK;
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
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

  const bank = bankFor(input);
  const pool = bank.issues;
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
    const text = pick(group.texts, rand);
    const t = Math.max(3, Math.round(rand() * Math.max(3, input.durationSec - 3)));
    tips.push({ timeSec: t, timeLabel: secToLabel(t), text });
  }
  tips.sort((a, b) => a.timeSec - b.timeSec);

  const nota = Math.max(4, Math.min(9.5, 8.6 - tips.length * 0.45 - rand() * 0.6));
  const subscoreBase = (label: string, penalize: boolean) => {
    const base = 7.6 - rand() * 1.4;
    return { label, val: Math.round((penalize ? base - 0.9 : base) * 10) / 10 };
  };
  // Las 3 primeras etiquetas del banco de la disciplina, en el mismo orden en que
  // están definidas arriba, para que los subscores siempre encajen con lo que
  // realmente se puede haber corregido en tips.
  const subscoreLabels = pool.slice(0, 3).map((p) => p.label);
  const subscores = subscoreLabels.map((label) => subscoreBase(label, usedLabels.has(label)));

  const result: AnalysisResult = {
    id: `${Date.now()}-${Math.floor(rand() * 1e6)}`,
    fecha: new Date().toISOString(),
    caballo: input.caballo,
    disciplina: input.disciplina,
    foco: input.foco,
    ejercicio: pick(bank.ejercicioNombre, rand),
    esPieATierra: input.esPieATierra,
    nota: Math.round(nota * 10) / 10,
    subscores,
    bienHecho: pick(bank.bienHecho, rand),
    tips,
    ejercicioSemana: pick(bank.ejercicioSemana, rand)(input.caballo),
    videoUri: input.uri,
    origen: 'ondevice',
  };
  return result;
}
