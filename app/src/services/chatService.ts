import { ChatMessage } from '../types/models';
import { apiFetch, ApiError } from './apiClient';
import { HAS_BACKEND } from './config';

export interface ChatContext {
  esPieATierra?: boolean;
  disciplina?: string;
  ejercicio?: string;
}

// --- Charla (saludos, gracias, despedidas) -- se comprueba ANTES que nada de
// técnica, para no contestar "baja los talones" a un simple "hola". -------------------
const GREETING_RX = /^\s*(hola+|buenas(?!.*(silla|cuerda))|buenos d[ií]as|buenas tardes|buenas noches|hey|qu[eé] tal|ey)\b/i;
const THANKS_RX = /\bgracias\b|\bmil gracias\b/i;
const FAREWELL_RX = /\badi[oó]s\b|hasta luego|hasta pronto|nos vemos|\bchao\b|me voy ya/i;
const SHORT_ACK_RX = /^\s*(vale|ok|okay|genial|bien|entendido|guay|perfecto|de acuerdo)\.?!?\s*$/i;

const GREETING_REPLIES: ((ctx?: ChatContext) => string)[] = [
  (ctx) =>
    ctx?.ejercicio
      ? `¡Hola! Vi tu última sesión de ${ctx.ejercicio.toLowerCase()}. ¿Sobre qué parte quieres que hablemos?`
      : '¡Hola! Aún no tengo ningún vídeo tuyo analizado. Sube una sesión o cuéntame qué disciplina practicas y qué quieres mejorar.',
  () => '¡Hola! Dime con qué necesitas ayuda: asiento, contacto, un ejercicio concreto, o algo del último vídeo que subiste.',
  () => 'Hola, aquí estoy. ¿Qué tal fue la última sesión? Cuéntame qué te preocupa y vamos al grano.',
];

const THANKS_REPLIES = [
  'De nada. Si subes otro vídeo o tienes más dudas, aquí sigo.',
  'Para eso estoy. ¡Suerte con la próxima sesión!',
  'Cuando quieras. No dudes en preguntar cualquier cosa sobre tu monta.',
];

const FAREWELL_REPLIES = [
  '¡Hasta la próxima! Nos vemos en el siguiente análisis.',
  'Adiós, suerte con el entrenamiento.',
  'Nos vemos. Ánimo con lo que hemos hablado hoy.',
];

const SHORT_ACK_REPLIES = [
  '¿Hay algo más en lo que te pueda ayudar? Puedes preguntarme sobre técnica, un ejercicio o el último vídeo que subiste.',
  'Genial. Si te surge otra duda, aquí estoy.',
];

const MOUNTED_REPLIES = [
  'Para bajar el talón, piensa en estirar la pierna hacia el suelo desde la cadera, no en empujar el estribo. El peso cae solo y ganas base.',
  'Baja las manos hasta sentir una línea recta codo–mano–boca. Cede un instante y vuelve al contacto.',
  'La rectitud se corrige con la pierna interior hacia la mano exterior. En la diagonal, sostén la grupa con la pierna correspondiente.',
  'Empieza por 4 transiciones trote–paso por vuelta; cuando las hagas limpias, acórtalas a cada 8 trancos para reunir de verdad.',
  'La flexión del corvejón mejora con trabajo en dos pistas suave. No fuerces la reunión: viene del impulso hacia una mano que cede.',
  'Revisa el asiento antes que nada: hombro–cadera–talón en línea. Muchos fallos de mano o pierna en realidad vienen de un asiento inestable.',
];

const GROUNDWORK_REPLIES = [
  'En el trabajo pie a tierra, premia el primer intento de cesión aunque sea pequeño: así se acelera el aprendizaje.',
  'A la cuerda, cuida que el círculo sea constante y no se cierre: eso es lo que más desequilibra el trote de un caballo joven.',
  'Con un potro que estáis empezando, sesiones cortas y muchas transiciones paso–trote enseñan más que mantener el mismo aire mucho rato.',
  'En mano, la voz y el toque de la fusta tienen que ser siempre la misma señal antes del mismo pedido: la consistencia es lo que aprende el caballo, no la repetición.',
  'A la cuerda, vigila que el peso caiga parejo en las cuatro patas; si se apoya de más en el interior del círculo, ábrelo un poco.',
  'Da un pedido, espera la respuesta y solo entonces repite: pedir varias veces seguidas sin soltar confunde más que ayuda.',
];

interface KeywordReply {
  rx: RegExp;
  pool?: 'mounted' | 'ground';
  reply: string;
}

// Preguntas de técnica concretas. Se comprueban por palabra clave antes de caer
// en la rotación genérica montado/pie a tierra, para que la respuesta encaje
// con lo que realmente se pregunta.
const KEYWORD_REPLIES: KeywordReply[] = [
  { rx: /tal(o|ó)n/i, pool: 'mounted', reply: MOUNTED_REPLIES[0] },
  { rx: /mano|contacto|boca/i, pool: 'mounted', reply: MOUNTED_REPLIES[1] },
  { rx: /diagonal|rectitud|derecho/i, pool: 'mounted', reply: MOUNTED_REPLIES[2] },
  { rx: /reuni(o|ó)n|reunir|transici/i, pool: 'mounted', reply: MOUNTED_REPLIES[3] },
  { rx: /corvej(o|ó)n|dos pistas/i, pool: 'mounted', reply: MOUNTED_REPLIES[4] },
  { rx: /asiento/i, pool: 'mounted', reply: MOUNTED_REPLIES[5] },
  { rx: /batida|obst[aá]culo|salto\b|vuelo/i, pool: 'mounted', reply: 'En la batida, cierra el ángulo de cadera justo antes de despegar y deja que el caballo redondee el lomo en el aire sin bloquear con las manos. En la recepción, absorbe con las rodillas, no con la espalda.' },
  { rx: /parada\b|rienda suelta|neck rein|vaquer/i, pool: 'mounted', reply: 'Para una parada limpia a la rienda suelta, prepárala con medias paradas de asiento antes de pedirla solo con la mano; así queda escuadrada y no forzada.' },
  { rx: /galope de campo|cross|obst[aá]culo fijo|agua\b/i, pool: 'mounted', reply: 'Ante obstáculos fijos o el agua, mantén la pierna activa hasta el último momento y la mirada al frente: si dudas tú, el caballo lo nota antes que llegar al obstáculo.' },
  { rx: /cesi(o|ó)n|ceder/i, pool: 'ground', reply: GROUNDWORK_REPLIES[0] },
  { rx: /cuerda|c(i|í)rculo|lonje/i, pool: 'ground', reply: GROUNDWORK_REPLIES[1] },
  { rx: /potro|potranca|empezando/i, pool: 'ground', reply: GROUNDWORK_REPLIES[2] },
  { rx: /en mano|fusta|\bvoz\b/i, pool: 'ground', reply: GROUNDWORK_REPLIES[3] },
];

// Temas que no dependen de si es pie a tierra o montado -- se comprueban antes
// de la rotación genérica pero después de las palabras clave de técnica.
const NEUTRAL_KEYWORD_REPLIES: KeywordReply[] = [
  {
    rx: /calent(ar|amiento)/i,
    reply: 'Antes de pedir trabajo exigente, dedica al menos 10 minutos a paso activo y trote suave en ambas manos: el caballo necesita calentar músculos y articulaciones igual que tú.',
  },
  {
    rx: /miedo|nervios|asusta|espant/i,
    reply: 'Si el caballo se pone nervioso ante algo, no lo fuerces de golpe: aléjate un poco, deja que lo mire tranquilo y acércate premiando la calma, no la reacción de huida.',
  },
  {
    rx: /silla|bocado|embocadura|martingala|protecciones|guante/i,
    reply: 'Revisa que el material esté bien ajustado antes de empezar: una silla que se desliza o un bocado mal puesto genera tensión que luego se confunde con un problema de técnica.',
  },
  {
    rx: /cansad|fatiga|descans/i,
    reply: 'Si notas al caballo apagado, revisa primero descanso y trabajo de los últimos días: un exceso de repetición del mismo ejercicio cansa más que ayuda a fijarlo.',
  },
];

// Frases que, dichas EN el chat, indican que se habla de trabajo pie a tierra
// aunque el último análisis guardado fuera montado (o al revés) -- lo que se
// escribe ahora mismo pesa más que el contexto del análisis anterior.
const GROUND_SIGNALS = /no le monto|no lo monto|pie a tierra|a la cuerda|en mano|lonje|potro|potranca/i;
const MOUNTED_SIGNALS = /montado|monta|silla|jinete/i;

const NO_CONTEXT_REPLIES = [
  'Aún no tengo ningún vídeo tuyo analizado, así que no puedo ser muy específico todavía. Cuéntame qué disciplina practicas y qué te preocupa, o sube una sesión para que pueda darte algo más ajustado.',
  'Sin un análisis reciente me cuesta afinar. Dime si el trabajo es montado o pie a tierra y en qué disciplina, y te doy algo más concreto.',
];

let mountedIdx = 0;
let groundIdx = 0;
let greetingIdx = 0;
let thanksIdx = 0;
let farewellIdx = 0;
let noContextIdx = 0;

function rotate<T>(arr: T[], get: () => number, set: (n: number) => void): T {
  const i = get() % arr.length;
  set(get() + 1);
  return arr[i];
}

function pickLocalReply(question: string, context?: ChatContext): string {
  const q = question.trim();

  if (FAREWELL_RX.test(q)) return rotate(FAREWELL_REPLIES, () => farewellIdx, (n) => (farewellIdx = n));
  if (THANKS_RX.test(q)) return rotate(THANKS_REPLIES, () => thanksIdx, (n) => (thanksIdx = n));
  if (GREETING_RX.test(q)) return rotate(GREETING_REPLIES, () => greetingIdx, (n) => (greetingIdx = n))(context);
  if (SHORT_ACK_RX.test(q)) return SHORT_ACK_REPLIES[q.length % SHORT_ACK_REPLIES.length];

  const neutralHit = NEUTRAL_KEYWORD_REPLIES.find((k) => k.rx.test(q));
  if (neutralHit) return neutralHit.reply;

  const keywordHit = KEYWORD_REPLIES.find((k) => k.rx.test(q));
  if (keywordHit) return keywordHit.reply;

  if (!context || (context.esPieATierra === undefined && !context.disciplina && !context.ejercicio)) {
    return rotate(NO_CONTEXT_REPLIES, () => noContextIdx, (n) => (noContextIdx = n));
  }

  let isGround = context?.esPieATierra ?? false;
  if (GROUND_SIGNALS.test(q)) isGround = true;
  else if (MOUNTED_SIGNALS.test(q)) isGround = false;

  if (isGround) return rotate(GROUNDWORK_REPLIES, () => groundIdx, (n) => (groundIdx = n));
  return rotate(MOUNTED_REPLIES, () => mountedIdx, (n) => (mountedIdx = n));
}

/**
 * Responde a una pregunta del chat.
 * Premium con backend configurado → `/api/chat` (Gemini, ver server/src/ai), que
 * recibe la pregunta con contexto real y puede razonar de verdad sobre ella.
 * Si no hay backend o falla → réplica local: primero detecta charla (saludos,
 * gracias, despedidas) para no soltar un consejo de técnica fuera de lugar,
 * luego palabras clave de técnica (neutrales, montado o pie a tierra), y solo
 * al final cae en una rotación genérica según el último análisis guardado.
 * Sin backend desplegado esto NO es una IA real, es un mejor sustituto offline.
 */
export async function askCoach(
  question: string,
  isPremium: boolean,
  history: ChatMessage[],
  context?: ChatContext
): Promise<string> {
  if (isPremium && HAS_BACKEND) {
    try {
      const res = await apiFetch<{ reply: string }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ question, context, history: history.slice(-6).map((m) => ({ role: m.role, text: m.text })) }),
      });
      return res.reply;
    } catch (err) {
      if (err instanceof ApiError && err.code !== 'no_backend') throw err;
    }
  }
  return pickLocalReply(question, context);
}
