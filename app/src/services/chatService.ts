import { ChatMessage } from '../types/models';
import { apiFetch, ApiError } from './apiClient';
import { HAS_BACKEND } from './config';

export interface ChatContext {
  esPieATierra?: boolean;
  disciplina?: string;
  ejercicio?: string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Evita el caso más cantoso de "siempre la misma respuesta": si toca literalmente
// la misma frase que la última vez, se vuelve a tirar el dado una vez.
let lastReply = '';
function pickNoRepeat(arr: string[]): string {
  if (arr.length <= 1) return arr[0];
  let choice = pick(arr);
  if (choice === lastReply) choice = pick(arr);
  lastReply = choice;
  return choice;
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
  () => '¡Qué tal! Pregúntame lo que quieras sobre tu técnica, un ejercicio para esta semana, o el último análisis.',
  () => 'Hola de nuevo. ¿Seguimos con lo de la última sesión o tienes una duda nueva?',
];

const THANKS_REPLIES = [
  'De nada. Si subes otro vídeo o tienes más dudas, aquí sigo.',
  'Para eso estoy. ¡Suerte con la próxima sesión!',
  'Cuando quieras. No dudes en preguntar cualquier cosa sobre tu monta.',
  'Un placer. Ánimo con el entrenamiento.',
  'De nada, aquí me tienes para lo que necesites.',
];

const FAREWELL_REPLIES = [
  '¡Hasta la próxima! Nos vemos en el siguiente análisis.',
  'Adiós, suerte con el entrenamiento.',
  'Nos vemos. Ánimo con lo que hemos hablado hoy.',
  'Hasta pronto, cuídate y cuida al caballo.',
];

const SHORT_ACK_REPLIES = [
  '¿Hay algo más en lo que te pueda ayudar? Puedes preguntarme sobre técnica, un ejercicio o el último vídeo que subiste.',
  'Genial. Si te surge otra duda, aquí estoy.',
  'Perfecto. Cuando quieras seguimos.',
];

const MOUNTED_REPLIES = [
  'Para bajar el talón, piensa en estirar la pierna hacia el suelo desde la cadera, no en empujar el estribo. El peso cae solo y ganas base.',
  'Baja las manos hasta sentir una línea recta codo–mano–boca. Cede un instante y vuelve al contacto.',
  'La rectitud se corrige con la pierna interior hacia la mano exterior. En la diagonal, sostén la grupa con la pierna correspondiente.',
  'Empieza por 4 transiciones trote–paso por vuelta; cuando las hagas limpias, acórtalas a cada 8 trancos para reunir de verdad.',
  'La flexión del corvejón mejora con trabajo en dos pistas suave. No fuerces la reunión: viene del impulso hacia una mano que cede.',
  'Revisa el asiento antes que nada: hombro–cadera–talón en línea. Muchos fallos de mano o pierna en realidad vienen de un asiento inestable.',
  'Si el caballo se cae de la línea al trote, revisa que no le estés bloqueando con una mano más fija que la otra.',
  'Trabaja los cambios de mano al paso antes de pedirlos al trote: si el caballo no responde bien despacio, tampoco lo hará rápido.',
  'La transición ascendente mejora si primero consigues más impulso de la pierna, en vez de "tirar" al caballo hacia adelante con el cuerpo.',
  'Cuida la respiración: contener el aire tensa el asiento sin que te des cuenta y el caballo lo nota en la espalda.',
];

const GROUNDWORK_REPLIES = [
  'En el trabajo pie a tierra, premia el primer intento de cesión aunque sea pequeño: así se acelera el aprendizaje.',
  'A la cuerda, cuida que el círculo sea constante y no se cierre: eso es lo que más desequilibra el trote de un caballo joven.',
  'Con un potro que estáis empezando, sesiones cortas y muchas transiciones paso–trote enseñan más que mantener el mismo aire mucho rato.',
  'En mano, la voz y el toque de la fusta tienen que ser siempre la misma señal antes del mismo pedido: la consistencia es lo que aprende el caballo, no la repetición.',
  'A la cuerda, vigila que el peso caiga parejo en las cuatro patas; si se apoya de más en el interior del círculo, ábrelo un poco.',
  'Da un pedido, espera la respuesta y solo entonces repite: pedir varias veces seguidas sin soltar confunde más que ayuda.',
  'Si el potro se distrae fácil, acorta las sesiones y termina siempre en un momento bueno, aunque sea pronto.',
  'La distancia a la que trabajas al caballo en mano debe ser constante: acercarte y alejarte sin querer manda señales contradictorias.',
  'Antes de pedir más energía con la fusta, asegúrate de que ya conoce bien la ayuda de la voz para ese mismo pedido.',
];

interface KeywordReply {
  rx: RegExp;
  replies: string[];
}

// Preguntas de técnica concretas. Se comprueban por palabra clave antes de caer
// en la rotación genérica montado/pie a tierra, para que la respuesta encaje
// con lo que realmente se pregunta. Cada categoría tiene varias variantes para
// que preguntar lo mismo dos veces no dé literalmente la misma frase.
const KEYWORD_REPLIES: KeywordReply[] = [
  {
    rx: /tal(o|ó)n/i,
    replies: [
      'Para bajar el talón, piensa en estirar la pierna hacia el suelo desde la cadera, no en empujar el estribo. El peso cae solo y ganas base.',
      'Un talón que sube suele venir de una rodilla demasiado cerrada: relaja la cadera y deja caer el peso, no fuerces el tobillo.',
      'Prueba sin estribos unos minutos al paso: ayuda a sentir dónde cae realmente el peso de la pierna sin depender del estribo.',
    ],
  },
  {
    rx: /mano|contacto|boca/i,
    replies: [
      'Baja las manos hasta sentir una línea recta codo–mano–boca. Cede un instante y vuelve al contacto.',
      'Un contacto duro casi siempre viene de manos que no acompañan el movimiento de la cabeza al paso o al galope: deja que las muñecas cedan con cada zancada.',
      'Si el caballo se apoya en exceso en la mano, no tires hacia atrás: cede un instante y vuelve a pedir con la pierna primero.',
    ],
  },
  {
    rx: /diagonal|rectitud|derecho/i,
    replies: [
      'La rectitud se corrige con la pierna interior hacia la mano exterior. En la diagonal, sostén la grupa con la pierna correspondiente.',
      'Si el caballo se tuerce en la diagonal, mira primero si tú mismo vas centrado en la silla: a veces el jinete tuerce antes que el caballo.',
      'Marca puntos de referencia en la pista (una letra, una valla) y comprueba que pasas justo por ellos: ayuda a notar hacia qué lado se desvía.',
    ],
  },
  {
    rx: /reuni(o|ó)n|reunir|transici/i,
    replies: [
      'Empieza por 4 transiciones trote–paso por vuelta; cuando las hagas limpias, acórtalas a cada 8 trancos para reunir de verdad.',
      'La reunión no se pide solo con la mano: primero necesitas más impulso de la pierna, y luego "recoges" ese impulso con la rienda.',
      'Practica transiciones dentro del mismo aire (trote de trabajo a trote reunido y vuelta) antes de subir a transiciones entre aires distintos.',
    ],
  },
  {
    rx: /corvej(o|ó)n|dos pistas/i,
    replies: [
      'La flexión del corvejón mejora con trabajo en dos pistas suave. No fuerces la reunión: viene del impulso hacia una mano que cede.',
      'En dos pistas, prioriza que el caballo cruce con soltura antes que buscar mucho ángulo: el ángulo sin soltura no sirve de nada.',
    ],
  },
  {
    rx: /asiento/i,
    replies: [
      'Revisa el asiento antes que nada: hombro–cadera–talón en línea. Muchos fallos de mano o pierna en realidad vienen de un asiento inestable.',
      'Un asiento estable acompaña el balanceo del dorso del caballo en cada zancada, no lo bloquea ni se adelanta a él.',
    ],
  },
  {
    rx: /batida|obst[aá]culo|salto\b|vuelo/i,
    replies: [
      'En la batida, cierra el ángulo de cadera justo antes de despegar y deja que el caballo redondee el lomo en el aire sin bloquear con las manos.',
      'En la recepción, absorbe con las rodillas, no con la espalda: así mantienes el equilibrio para la siguiente zancada.',
      'Si el caballo bate largo o corto siempre en el mismo obstáculo, revisa el ritmo de galope 3-4 zancadas antes, no solo la última.',
    ],
  },
  {
    rx: /parada\b|rienda suelta|neck rein|vaquer/i,
    replies: [
      'Para una parada limpia a la rienda suelta, prepárala con medias paradas de asiento antes de pedirla solo con la mano; así queda escuadrada y no forzada.',
      'En el neck rein, la ayuda se apoya en el cuello con precisión: si el caballo no responde, revisa primero que vaya reunido y no solo "de largo".',
    ],
  },
  {
    rx: /galope de campo|cross|obst[aá]culo fijo|agua\b/i,
    replies: [
      'Ante obstáculos fijos o el agua, mantén la pierna activa hasta el último momento y la mirada al frente: si dudas tú, el caballo lo nota antes de llegar.',
      'En el galope de campo, sostén el ritmo con la pierna exterior antes de cada curva para que no se caiga hacia adentro.',
    ],
  },
  {
    rx: /cesi(o|ó)n|ceder/i,
    replies: [
      'En el trabajo pie a tierra, premia el primer intento de cesión aunque sea pequeño: así se acelera el aprendizaje.',
      'Pide la cesión con la cuerda o la fusta y suelta en cuanto ceda un paso, por pequeño que sea: soltar tarde apaga la respuesta.',
    ],
  },
  {
    rx: /cuerda|c(i|í)rculo|lonje/i,
    replies: [
      'A la cuerda, cuida que el círculo sea constante y no se cierre: eso es lo que más desequilibra el trote de un caballo joven.',
      'A la cuerda, vigila que el peso caiga parejo en las cuatro patas; si se apoya de más en el interior del círculo, ábrelo un poco.',
    ],
  },
  {
    rx: /potro|potranca|empezando/i,
    replies: [
      'Con un potro que estáis empezando, sesiones cortas y muchas transiciones paso–trote enseñan más que mantener el mismo aire mucho rato.',
      'Con un caballo joven, termina siempre la sesión en un momento bueno, aunque sea pronto: así asocia el trabajo con algo positivo.',
    ],
  },
  {
    rx: /en mano|fusta|\bvoz\b/i,
    replies: [
      'En mano, la voz y el toque de la fusta tienen que ser siempre la misma señal antes del mismo pedido: la consistencia es lo que aprende el caballo.',
      'Da un pedido, espera la respuesta y solo entonces repite: pedir varias veces seguidas sin soltar confunde más que ayuda.',
    ],
  },
];

// Temas que no dependen de si es pie a tierra o montado -- se comprueban antes
// de la rotación genérica pero después de las palabras clave de técnica.
const NEUTRAL_KEYWORD_REPLIES: KeywordReply[] = [
  {
    rx: /calent(ar|amiento)/i,
    replies: [
      'Antes de pedir trabajo exigente, dedica al menos 10 minutos a paso activo y trote suave en ambas manos: el caballo necesita calentar músculos y articulaciones igual que tú.',
      'Un buen calentamiento incluye cambios de dirección suaves desde el principio, no solo dar vueltas rectas: ayuda a soltar ambos lados por igual.',
    ],
  },
  {
    rx: /miedo|nervios|asusta|espant/i,
    replies: [
      'Si el caballo se pone nervioso ante algo, no lo fuerces de golpe: aléjate un poco, deja que lo mire tranquilo y acércate premiando la calma.',
      'Ante un caballo nervioso, revisa primero tu propia respiración y tensión en las riendas: se contagia la calma igual que los nervios.',
    ],
  },
  {
    rx: /silla|bocado|embocadura|martingala|protecciones|guante/i,
    replies: [
      'Revisa que el material esté bien ajustado antes de empezar: una silla que se desliza o un bocado mal puesto genera tensión que luego se confunde con un problema de técnica.',
      'Si notas resistencias nuevas de repente, descarta primero el material (silla, bocado, protecciones) antes de pensar en un problema de doma.',
    ],
  },
  {
    rx: /cansad|fatiga|descans/i,
    replies: [
      'Si notas al caballo apagado, revisa primero descanso y trabajo de los últimos días: un exceso de repetición del mismo ejercicio cansa más que ayuda a fijarlo.',
      'La fatiga mental cansa tanto como la física: variar los ejercicios dentro de la misma sesión mantiene mejor la atención del caballo.',
    ],
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

const UPSELL_SUFFIXES = [
  'Ten en cuenta que esto es orientativo (asistente básico del plan gratis, sin ver tu vídeo real). Con Premium, la IA (Gemini) analiza tu pregunta junto con tu vídeo de verdad.',
  'Recuerda que es un consejo general, no basado en tu vídeo concreto: en el plan gratis el chat no "ve" la sesión. Premium sí analiza tu vídeo real con IA.',
  'Esto es una orientación genérica del plan gratis. Si quieres una respuesta basada en tu vídeo real, Premium usa IA de verdad para eso.',
];

let freeReplyCount = 0;

function pickLocalReply(question: string, context?: ChatContext): { text: string; technical: boolean } {
  const q = question.trim();

  if (FAREWELL_RX.test(q)) return { text: pickNoRepeat(FAREWELL_REPLIES), technical: false };
  if (THANKS_RX.test(q)) return { text: pickNoRepeat(THANKS_REPLIES), technical: false };
  if (GREETING_RX.test(q)) return { text: pick(GREETING_REPLIES)(context), technical: false };
  if (SHORT_ACK_RX.test(q)) return { text: pick(SHORT_ACK_REPLIES), technical: false };

  const neutralHit = NEUTRAL_KEYWORD_REPLIES.find((k) => k.rx.test(q));
  if (neutralHit) return { text: pickNoRepeat(neutralHit.replies), technical: true };

  const keywordHit = KEYWORD_REPLIES.find((k) => k.rx.test(q));
  if (keywordHit) return { text: pickNoRepeat(keywordHit.replies), technical: true };

  if (!context || (context.esPieATierra === undefined && !context.disciplina && !context.ejercicio)) {
    return { text: pickNoRepeat(NO_CONTEXT_REPLIES), technical: true };
  }

  let isGround = context?.esPieATierra ?? false;
  if (GROUND_SIGNALS.test(q)) isGround = true;
  else if (MOUNTED_SIGNALS.test(q)) isGround = false;

  return { text: pickNoRepeat(isGround ? GROUNDWORK_REPLIES : MOUNTED_REPLIES), technical: true };
}

/**
 * Responde a una pregunta del chat.
 * Premium con backend configurado → `/api/chat` (Gemini, ver server/src/ai), que
 * recibe la pregunta con contexto real y puede razonar de verdad sobre ella.
 * Si no hay backend o falla → réplica local: primero detecta charla (saludos,
 * gracias, despedidas) para no soltar un consejo de técnica fuera de lugar,
 * luego palabras clave de técnica (con varias variantes cada una para no repetir
 * literalmente la misma frase), y solo al final una rotación genérica según el
 * último análisis guardado. Para el plan gratis, cada pocas respuestas se avisa
 * de que esto es orientativo y que Premium analiza el vídeo real con IA.
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
  const { text, technical } = pickLocalReply(question, context);
  if (!isPremium && technical) {
    freeReplyCount++;
    if (freeReplyCount % 3 === 0) {
      return `${text}\n\n${pick(UPSELL_SUFFIXES)}`;
    }
  }
  return text;
}
