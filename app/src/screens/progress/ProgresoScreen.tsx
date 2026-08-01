import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BottomNav } from '../../components/BottomNav';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { computeWeekStreak } from '../../utils/streak';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Progreso'>;

const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export default function ProgresoScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const analyses = useAppStore((s) => s.analyses);

  const notaMedia = useMemo(() => {
    if (analyses.length === 0) return 0;
    return analyses.reduce((sum, a) => sum + a.nota, 0) / analyses.length;
  }, [analyses]);
  const racha = useMemo(() => computeWeekStreak(analyses.map((a) => a.fecha)), [analyses]);

  const last7 = useMemo(() => {
    const now = new Date();
    const days: { label: string; nota: number | null; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toDateString();
      const found = analyses.filter((a) => new Date(a.fecha).toDateString() === key);
      const avg = found.length ? found.reduce((s, a) => s + a.nota, 0) / found.length : null;
      days.push({ label: DIAS[d.getDay()], nota: avg, isToday: i === 0 });
    }
    return days;
  }, [analyses]);

  const skills = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>();
    for (const a of analyses) {
      for (const ss of a.subscores) {
        const cur = map.get(ss.label) ?? { sum: 0, n: 0 };
        cur.sum += ss.val;
        cur.n += 1;
        map.set(ss.label, cur);
      }
    }
    return Array.from(map.entries())
      .map(([label, { sum, n }]) => ({ label, val: sum / n }))
      .slice(0, 4);
  }, [analyses]);

  const maxNota = 10;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <Text style={{ fontWeight: '800', fontSize: 24, color: colors.ink, marginVertical: 6 }}>{t('tuProgreso')}</Text>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.accent }}>{notaMedia ? notaMedia.toFixed(1).replace('.', ',') : '—'}</Text>
            <Text style={{ fontSize: 11, color: colors.m50, marginTop: 3 }}>{t('notaMedia')}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink }}>{analyses.length}</Text>
            <Text style={{ fontSize: 11, color: colors.m50, marginTop: 3 }}>{t('sesiones')}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink }}>🔥{racha}</Text>
            <Text style={{ fontSize: 11, color: colors.m50, marginTop: 3 }}>{t('semanas')}</Text>
          </View>
        </View>

        <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: 17, marginBottom: 22 }}>
          <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink, marginBottom: 14 }}>{t('evolucionNota')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 96 }}>
            {last7.map((d, i) => (
              <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 5 }}>
                <View
                  style={{
                    width: '100%',
                    borderRadius: 6,
                    height: d.nota ? `${Math.max(8, (d.nota / maxNota) * 100)}%` : 4,
                    backgroundColor: d.isToday ? colors.accent : d.nota ? '#e5b39c' : colors.border,
                  }}
                />
                <Text style={{ fontSize: 9.5, color: d.isToday ? colors.accent : colors.m40, fontWeight: d.isToday ? '700' : '400' }}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {skills.length > 0 && (
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: 17, marginBottom: 22 }}>
            <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink, marginBottom: 14 }}>{t('porDestreza')}</Text>
            <View style={{ gap: 12 }}>
              {skills.map((sk) => (
                <View key={sk.label}>
                  <View style={{ flexDirection: 'row', marginBottom: 5 }}>
                    <Text style={{ fontSize: 12, color: colors.ink }}>{sk.label}</Text>
                    <Text style={{ marginLeft: 'auto', fontWeight: '700', fontSize: 12, color: colors.ink }}>{sk.val.toFixed(1).replace('.', ',')}</Text>
                  </View>
                  <View style={{ height: 7, backgroundColor: colors.tint, borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ width: `${(sk.val / maxNota) * 100}%`, height: '100%', backgroundColor: colors.accent, borderRadius: 4 }} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink, marginBottom: 11 }}>{t('sesionesRecientes')}</Text>
        <View style={{ gap: 10 }}>
          {analyses.length === 0 ? (
            <Text style={{ fontSize: 12.5, color: colors.m55 }}>Todavía no hay sesiones. ¡Sube tu primer vídeo!</Text>
          ) : (
            analyses.slice(0, 10).map((a) => (
              <Pressable
                key={a.id}
                onPress={() => navigation.navigate('Resultado', { analysisId: a.id })}
                style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 13 }}
              >
                <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: colors.ph }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: colors.ink }}>
                    {a.ejercicio} · {a.caballo}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.m50 }}>{new Date(a.fecha).toLocaleDateString()} · {a.disciplina}</Text>
                </View>
                <Text style={{ fontWeight: '800', fontSize: 17, color: colors.accent }}>{a.nota.toFixed(1).replace('.', ',')}</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScreenContainer>
      <BottomNav active="progreso" />
    </SafeAreaView>
  );
}
