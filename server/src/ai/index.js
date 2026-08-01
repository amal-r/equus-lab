/**
 * Punto único de acceso a la IA. Elige el proveedor real (Gemini) si hay
 * GEMINI_API_KEY configurada; si no, cae al mock determinista (coste 0).
 * El resto del backend importa SOLO de aquí — nunca de mockProvider/geminiProvider
 * directamente — así que mañana un qwenProvider.js entra cambiando una línea.
 */
import * as mockProvider from './mockProvider.js';

let provider = mockProvider;
let providerName = 'mock';

if (process.env.GEMINI_API_KEY) {
  const geminiProvider = await import('./geminiProvider.js');
  provider = geminiProvider;
  providerName = 'gemini';
}

export const aiProviderName = providerName;
export const analyzeVideo = provider.analyzeVideo;
export const chat = provider.chat;
export const judgeShow = provider.judgeShow;
