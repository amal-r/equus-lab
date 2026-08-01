import { analyzeClip, AnalyzeClipInput, ProgressEvent } from '../ondevice/analyzeClip';
import { AnalysisResult } from '../types/models';
import { apiFetch, ApiError } from './apiClient';
import { HAS_BACKEND } from './config';

interface RunAnalysisArgs extends AnalyzeClipInput {
  isPremium: boolean;
}

/**
 * Orquesta el análisis de una sesión:
 * - Plan gratis → siempre on-device (MediaPipe simulado hoy, real mañana), coste 0, sin red.
 * - Plan Premium → intenta `/api/analyses` en el backend (que valida cuota y llama a Gemini).
 *   Si el backend no está configurado (EXPO_PUBLIC_API_URL vacío) o falla, cae a la simulación
 *   on-device para no romper la demo, marcando el resultado como simulado.
 */
export async function runAnalysis(args: RunAnalysisArgs, onProgress?: (e: ProgressEvent) => void): Promise<AnalysisResult> {
  if (args.isPremium && HAS_BACKEND) {
    try {
      onProgress?.({ pct: 20, step: 0, pointCount: 4, strideCount: 10 });
      const result = await apiFetch<AnalysisResult>('/api/analyses', {
        method: 'POST',
        body: JSON.stringify({
          videoUrl: args.uri,
          durationSec: args.durationSec,
          disciplina: args.disciplina,
          foco: args.foco,
          esPieATierra: args.esPieATierra,
          caballo: args.caballo,
        }),
      });
      onProgress?.({ pct: 100, step: 3, pointCount: 17, strideCount: 120 });
      return result;
    } catch (err) {
      if (err instanceof ApiError && err.code !== 'no_backend') throw err;
      // backend no disponible: seguimos con la simulación local para no bloquear la demo
    }
  }
  return analyzeClip(args, onProgress);
}
