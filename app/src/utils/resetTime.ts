import { Lang } from '../types/models';

/**
 * Los contadores diarios (analisisHoy/chatHoy, ver useAppStore.ensureDailyReset)
 * se resetean a medianoche UTC, no "24h desde el último uso". Esto calcula un
 * texto legible en la hora LOCAL del usuario para mostrarlo en los avisos de límite.
 */
export function nextDailyResetLabel(lang: Lang): string {
  const now = new Date();
  const nextUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const diffMs = nextUtcMidnight.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffM = Math.max(0, Math.round((diffMs % 3600000) / 60000));
  const localTime = nextUtcMidnight.toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-ES', { hour: '2-digit', minute: '2-digit' });

  if (lang === 'en') {
    return diffH <= 0 ? `in ${diffM} min (${localTime})` : `in ${diffH}h ${diffM}min (${localTime})`;
  }
  return diffH <= 0 ? `en ${diffM} min (${localTime})` : `en ${diffH}h ${diffM}min (${localTime})`;
}
