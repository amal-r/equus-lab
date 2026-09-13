/**
 * Proveedor de IA "mock": determinista, sin red, coste 0. Se usa automáticamente
 * cuando GEMINI_API_KEY está vacío, para poder probar el flujo Premium completo
 * (backend + cuotas + JSON de feedback) sin gastar nada ni tener la clave todavía.
 * Implementa el mismo contrato que geminiProvider.js — la app nunca sabe cuál corre.
 */
function hashSeed(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function analyzeVideo({ videoUrl, disciplina, foco, esPieATierra, caballo, durationSec }) {
  const rand = rng(hashSeed(`${videoUrl}|${disciplina}|${foco}`));
  const nIssues = 2 + Math.floor(rand() * 3);
  const tips = Array.from({ length: nIssues }, (_, i) => {
    const t = Math.max(3, Math.round(rand() * Math.max(3, (durationSec ?? 60) - 3)));
    return {
      timeSec: t,
      timeLabel: `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`,
      text: `[simulado] Corrige la biomecánica en torno al segundo ${t} para mejorar la reunión de ${caballo}.`,
    };
  }).sort((a, b) => a.timeSec - b.timeSec);
  const nota = Math.round(Math.max(4, Math.min(9.5, 8.6 - tips.length * 0.45 - rand() * 0.6)) * 10) / 10;

  return {
    nota,
    subscores: [
      { label: 'Asiento', val: Math.round((6 + rand() * 2) * 10) / 10 },
      { label: 'Contacto', val: Math.round((6 + rand() * 2) * 10) / 10 },
      { label: 'Rectitud', val: Math.round((5.5 + rand() * 2) * 10) / 10 },
    ],
    bienHecho: `Buen ritmo general en ${disciplina.toLowerCase()}${esPieATierra ? ' (trabajo pie a tierra)' : ''}.`,
    tips,
    ejercicioSemana: `Trabaja transiciones cortas con ${caballo} para consolidar el impulso.`,
    biomecanicaCaballo: `Biomecánica estimada dentro de rango normal para su morfología (respuesta simulada — sin GEMINI_API_KEY configurada).`,
    origen: 'mock',
  };
}

export async function chat({ question, history, metrics }) {
  const replies = [
    'Para bajar el talón, estira la pierna hacia el suelo desde la cadera, no empujes el estribo.',
    'Baja las manos hasta sentir la línea codo–mano–boca; cede un instante y vuelve al contacto.',
    'La rectitud se corrige con la pierna interior hacia la mano exterior.',
    'Empieza con transiciones cortas y sube la dificultad cuando salgan limpias.',
  ];
  const idx = Math.abs(hashSeed(question)) % replies.length;
  return { reply: `${replies[idx]} (respuesta simulada — sin GEMINI_API_KEY configurada)` };
}

export async function analyzeMorphology({ caballo }) {
  const rand = rng(hashSeed(`${caballo}|morfo`));
  const zonas = ['Dorso / lomo', 'Grupa izquierda', 'Grupa derecha', 'Cuello / trapecio', 'Pectoral / antebrazo'].map((zona) => {
    const roll = rand();
    const estado = roll > 0.82 ? 'atrofia' : roll > 0.55 ? 'debil' : 'correcto';
    const pct = Math.round(estado === 'correcto' ? 78 + rand() * 18 : estado === 'debil' ? 55 + rand() * 20 : 30 + rand() * 20);
    return { zona, estado, pct, nota: `[simulado] Desarrollo ${estado} en ${zona.toLowerCase()}.` };
  });
  const medidas = [
    { label: 'Alzada a la cruz', unidad: 'cm', base: 158 },
    { label: 'Longitud escápula–isquion', unidad: 'cm', base: 132 },
    { label: 'Ángulo de grupa', unidad: '°', base: 24 },
    { label: 'Ángulo escápula–húmero', unidad: '°', base: 100 },
    { label: 'Simetría de grupa', unidad: '%', base: 96 },
    { label: 'Perímetro torácico', unidad: 'cm', base: 182 },
  ].map((def) => ({ label: def.label, valor: `${Math.round((def.base + (rand() - 0.5) * 10) * 10) / 10} ${def.unidad}`, ref: 'en rango' }));
  const nAtrofias = zonas.filter((z) => z.estado === 'atrofia').length;
  const indice = Math.round(Math.max(3, Math.min(9.5, 8.4 - nAtrofias * 1.3 - rand() * 0.4)) * 10) / 10;
  return {
    indice,
    resumen: `Desarrollo general dentro de lo esperado para ${caballo} (respuesta simulada — sin GEMINI_API_KEY configurada).`,
    zonas,
    medidas,
    plan: '[simulado] Trabajo progresivo de 4 semanas centrado en equilibrar la carga muscular entre ambos lados.',
    alertas: nAtrofias > 0 ? ['La diferencia detectada conviene revisarla con un profesional.'] : [],
    origen: 'mock',
  };
}

export async function judgeShow({ videoUrl, disciplina, prueba }) {
  const rand = rng(hashSeed(`${videoUrl}|${disciplina}|${prueba}`));
  const movs = ['Entrada y saludo', 'Figura central', 'Transición', 'Salida'];
  const sheetRows = movs.map((mov, i) => ({
    n: String(i + 1),
    mov,
    coef: rand() > 0.75 ? '×2' : '×1',
    nota: Math.round((5.5 + rand() * 3.5) * 2) / 2,
  }));
  const colectivas = ['Aires', 'Impulsión', 'Sumisión', 'Posición y asiento del jinete'].map((k) => ({
    k,
    v: Math.round((5.5 + rand() * 3) * 2) / 2,
  }));
  const weighted = sheetRows.reduce((s, r) => s + r.nota * (r.coef === '×2' ? 2 : 1), 0);
  const totalCoef = sheetRows.reduce((s, r) => s + (r.coef === '×2' ? 2 : 1), 0);
  const puntuacionFinal = Math.round((weighted / totalCoef / 10) * 1000) / 10;
  return {
    puntuacionFinal,
    puesto: puntuacionFinal >= 70 ? 'muy buena' : puntuacionFinal >= 60 ? 'buena' : 'a mejorar',
    sheetRows,
    colectivas,
    comentario: `Veredicto simulado (sin GEMINI_API_KEY configurada) para ${prueba}.`,
    origen: 'mock',
  };
}
