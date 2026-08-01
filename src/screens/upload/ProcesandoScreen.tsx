import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressRing } from '../../components/ProgressRing';
import { useT } from '../../i18n/useT';
import { useAppStore } from '../../store/useAppStore';
import { runAnalysis } from '../../services/analysisService';
import { ProgressEvent } from '../../ondevice/analyzeClip';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Procesando'>;

export default function ProcesandoScreen({ navigation }: Props) {
  const { t } = useT();
  const videoUri = useAppStore((s) => s.videoUri);
  const videoDurationSec = useAppStore((s) => s.videoDurationSec);
  const selectedHorseId = useAppStore((s) => s.selectedHorseId);
  const horses = useAppStore((s) => s.horses);
  const disciplinaSel = useAppStore((s) => s.disciplinaSel);
  const focoSel = useAppStore((s) => s.focoSel);
  const planTier = useAppStore((s) => s.planTier);
  const registerFreeAnalysis = useAppStore((s) => s.registerFreeAnalysis);
  const addAnalysis = useAppStore((s) => s.addAnalysis);
  const clearVideo = useAppStore((s) => s.clearVideo);

  const [progress, setProgress] = useState<ProgressEvent>({ pct: 0, step: 0, pointCount: 0, strideCount: 0 });
  const startedRef = useRef(false);
  const caballo = horses.find((h) => h.id === selectedHorseId)?.nombre ?? '—';
  const pieATierra = focoSel === t('pieATierra');

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const isPremium = planTier !== 'free';

    (async () => {
      const result = await runAnalysis(
        {
          uri: videoUri ?? 'demo',
          durationSec: videoDurationSec ?? 60,
          caballo,
          disciplina: disciplinaSel,
          foco: focoSel,
          esPieATierra: pieATierra,
          isPremium,
        },
        setProgress
      );
      if (!isPremium) registerFreeAnalysis();
      addAnalysis(result);
      clearVideo();
      navigation.replace('Resultado', { analysisId: result.id });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = [
    { label: t('pasoDetectar'), threshold: 0 },
    { label: t('pasoAngulos'), threshold: 30 },
    { label: t('pasoBiomecanica'), threshold: 60 },
    { label: t('pasoRedactar'), threshold: 90 },
  ];

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <View style={styles.wrap}>
        <View style={styles.videoPh}>
          <Text style={styles.videoPhText}>
            {caballo} · {pieATierra ? t('pieATierra') : disciplinaSel}
          </Text>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <ProgressRing pct={progress.pct} color="#c05f3a" trackColor="rgba(255,255,255,0.12)" label={t('analizando')} />
          <Text style={styles.measuring}>{t('midiendoAsiento', { caballo })}</Text>
        </View>

        <View style={{ gap: 14 }}>
          {steps.map((s, i) => {
            const done = progress.pct >= (steps[i + 1]?.threshold ?? 101) || progress.pct >= 100;
            const active = !done && progress.pct >= s.threshold;
            return (
              <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                <View
                  style={[
                    styles.stepDot,
                    done
                      ? { backgroundColor: '#c05f3a', borderWidth: 0 }
                      : active
                      ? { borderWidth: 2, borderColor: '#e79877' }
                      : { borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
                  ]}
                >
                  {done && <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text>}
                </View>
                <Text style={{ fontSize: 13.5, fontWeight: active ? '700' : '500', color: active || done ? '#faf7f2' : 'rgba(250,247,242,0.45)' }}>
                  {s.label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ flex: 1, minHeight: 14 }} />

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{progress.pointCount}</Text>
            <Text style={styles.statLabel}>{t('puntosDelCuerpo')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{progress.strideCount}</Text>
            <Text style={styles.statLabel}>{t('trancosLeidos')}</Text>
          </View>
        </View>
        <Text style={styles.footerNote}>{t('sueleTardar')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#26221d' },
  wrap: { flex: 1, padding: 16, paddingHorizontal: 26 },
  videoPh: {
    backgroundColor: '#3a332b',
    borderRadius: 20,
    height: 132,
    marginBottom: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPhText: { fontSize: 11, color: 'rgba(250,247,242,0.4)' },
  measuring: { fontSize: 13, color: 'rgba(250,247,242,0.6)', marginTop: 16, textAlign: 'center', lineHeight: 18 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 13 },
  statVal: { fontWeight: '800', fontSize: 20, color: '#e79877' },
  statLabel: { fontSize: 10.5, color: 'rgba(250,247,242,0.5)', marginTop: 3 },
  footerNote: { textAlign: 'center', fontSize: 11, color: 'rgba(250,247,242,0.4)', paddingVertical: 6 },
});
