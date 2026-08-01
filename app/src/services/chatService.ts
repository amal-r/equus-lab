import { ChatMessage } from '../types/models';
import { apiFetch, ApiError } from './apiClient';
import { HAS_BACKEND } from './config';

const LOCAL_REPLIES = [
  'Para bajar el talón, piensa en estirar la pierna hacia el suelo desde la cadera, no en empujar el estribo. El peso cae solo y ganas base.',
  'Baja las manos hasta sentir una línea recta codo–mano–boca. Cede un instante y vuelve al contacto.',
  'La rectitud se corrige con la pierna interior hacia la mano exterior. En la diagonal, sostén la grupa con la pierna correspondiente.',
  'Empieza por 4 transiciones trote–paso por vuelta; cuando las hagas limpias, acórtalas a cada 8 trancos para reunir de verdad.',
  'La flexión del corvejón mejora con trabajo en dos pistas suave. No fuerces la reunión: viene del impulso hacia una mano que cede.',
  'En el trabajo pie a tierra, premia el primer intento de cesión aunque sea pequeño: así se acelera el aprendizaje.',
];

let replyIdx = 0;

/**
 * Responde a una pregunta del chat.
 * Premium con backend configurado → `/api/chat` (Gemini, ver server/src/ai).
 * Si no hay backend o falla → réplica local (mismo comportamiento gratis/demo).
 */
export async function askCoach(question: string, isPremium: boolean, history: ChatMessage[]): Promise<string> {
  if (isPremium && HAS_BACKEND) {
    try {
      const res = await apiFetch<{ reply: string }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ question, history: history.slice(-6).map((m) => ({ role: m.role, text: m.text })) }),
      });
      return res.reply;
    } catch (err) {
      if (err instanceof ApiError && err.code !== 'no_backend') throw err;
    }
  }
  const reply = LOCAL_REPLIES[replyIdx % LOCAL_REPLIES.length];
  replyIdx++;
  return reply;
}
