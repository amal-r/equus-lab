import { ChatMessage } from '../types/models';
import { apiFetch, ApiError } from './apiClient';
import { HAS_BACKEND } from './config';

export interface ChatContext {
  esPieATierra?: boolean;
  disciplina?: string;
  ejercicio?: string;
}

const MOUNTED_REPLIES = [
  'Para bajar el talón, piensa en estirar la pierna hacia el suelo desde la cadera, no en empujar el estribo. El peso cae solo y ganas base.',
  'Baja las manos hasta sentir una línea recta codo–mano–boca. Cede un instante y vuelve al contacto.',
  'La rectitud se corrige con la pierna interior hacia la mano exterior. En la diagonal, sostén la grupa con la pierna correspondiente.',
  'Empieza por 4 transiciones trote–paso por vuelta; cuando las hagas limpias, acórtalas a cada 8 trancos para reunir de verdad.',
  'La flexión del corvejón mejora con trabajo en dos pistas suave. No fuerces la reunión: viene del impulso hacia una mano que cede.',
];

const GROUNDWORK_REPLIES = [
  'En el trabajo pie a tierra, premia el primer intento de cesión aunque sea pequeño: así se acelera el aprendizaje.',
  'A la cuerda, cuida que el círculo sea constante y no se cierre: eso es lo que más desequilibra el trote de un caballo joven.',
  'Con un potro que estáis empezando, sesiones cortas y muchas transiciones paso–trote enseñan más que mantener el mismo aire mucho rato.',
  'En mano, la voz y el toque de la fusta tienen que ser siempre la misma señal antes del mismo pedido: la consistencia es lo que aprende el caballo, no la repetición.',
  'A la cuerda, vigila que el peso caiga parejo en las cuatro patas; si se apoya de más en el interior del círculo, ábrelo un poco.',
];

interface KeywordReply {
  rx: RegExp;
  pool: 'mounted' | 'ground';
  reply: string;
}

const KEYWORD_REPLIES: KeywordReply[] = [
  { rx: /tal(o|ó)n/i, pool: 'mounted', reply: MOUNTED_REPLIES[0] },
  { rx: /mano|contacto|boca/i, pool: 'mounted', reply: MOUNTED_REPLIES[1] },
  { rx: /diagonal|rectitud|derecho/i, pool: 'mounted', reply: MOUNTED_REPLIES[2] },
  { rx: /reuni(o|ó)n|reunir|transici/i, pool: 'mounted', reply: MOUNTED_REPLIES[3] },
  { rx: /corvej(o|ó)n|dos pistas/i, pool: 'mounted', reply: MOUNTED_REPLIES[4] },
  { rx: /cesi(o|ó)n|ceder/i, pool: 'ground', reply: GROUNDWORK_REPLIES[0] },
  { rx: /cuerda|c(i|í)rculo|lonje/i, pool: 'ground', reply: GROUNDWORK_REPLIES[1] },
  { rx: /potro|potranca|empezando/i, pool: 'ground', reply: GROUNDWORK_REPLIES[2] },
  { rx: /en mano|fusta|\bvoz\b/i, pool: 'ground', reply: GROUNDWORK_REPLIES[3] },
];

// Frases que, dichas EN el chat, indican que se habla de trabajo pie a tierra
// aunque el último análisis guardado fuera montado (o al revés) -- lo que se
// escribe ahora mismo pesa más que el contexto del análisis anterior.
const GROUND_SIGNALS = /no le monto|no lo monto|pie a tierra|a la cuerda|en mano|lonje|potro|potranca/i;
const MOUNTED_SIGNALS = /montado|monta|silla|jinete/i;

let mountedIdx = 0;
let groundIdx = 0;

function pickLocalReply(question: string, context?: ChatContext): string {
  const keywordHit = KEYWORD_REPLIES.find((k) => k.rx.test(question));
  if (keywordHit) return keywordHit.reply;

  let isGround = context?.esPieATierra ?? false;
  if (GROUND_SIGNALS.test(question)) isGround = true;
  else if (MOUNTED_SIGNALS.test(question)) isGround = false;

  if (isGround) {
    const reply = GROUNDWORK_REPLIES[groundIdx % GROUNDWORK_REPLIES.length];
    groundIdx++;
    return reply;
  }
  const reply = MOUNTED_REPLIES[mountedIdx % MOUNTED_REPLIES.length];
  mountedIdx++;
  return reply;
}

/**
 * Responde a una pregunta del chat.
 * Premium con backend configurado → `/api/chat` (Gemini, ver server/src/ai), que
 * recibe la pregunta con contexto real y puede razonar de verdad sobre ella.
 * Si no hay backend o falla → réplica local por palabras clave + si el último
 * análisis fue pie a tierra o montado (ver esPieATierra en AnalysisResult).
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
