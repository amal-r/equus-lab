import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TintCard } from '../../components/TintCard';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { toneScoreMsg } from '../../utils/coachTone';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Resultado'>;

export default function ResultadoScreen({ navigation, route }: Props) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const analysis = useAppStore((s) => s.analyses.find((a) => a.id === route.params.analysisId));
  const tone = useAppStore((s) => s.toneSel) ?? 'Cercano';

  const player = useVideoPlayer(analysis?.videoUri ?? null, (p) => {
    p.loop = false;
  });
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  const focoLabel = useMemo(() => {
    if (!analysis) return '';
    return analysis.foco === t('todoElConjunto') ? t('sesionCompleta') : `foco: ${analysis.foco.toLowerCase()}`;
  }, [analysis, t]);

  if (!analysis) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenContainer>
          <Text style={{ color: colors.ink }}>No se encontró el análisis.</Text>
        </ScreenContainer>
      </SafeAreaView>
    );
  }

  const seekTo = (sec: number) => {
    player.currentTime = sec;
    setPlaying(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ paddingHorizontal: 22, paddingTop: 6, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={{ fontSize: 20, color: colors.m40 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', fontSize: 19, color: colors.ink }} numberOfLines={1}>
            {analysis.ejercicio}
          </Text>
          <Text style={{ fontSize: 12, color: colors.m55, marginTop: 2 }}>
            {analysis.caballo} · {focoLabel}
          </Text>
        </View>
      </View>

      <View style={{ marginHorizontal: 22, borderRadius: 22, overflow: 'hidden', height: 150, backgroundColor: colors.ph }}>
        {analysis.videoUri ? (
          <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, color: colors.m40 }}>vídeo no disponible</Text>
          </View>
        )}
        <Pressable
          onPress={() => setPlaying((p) => !p)}
          style={{
            position: 'absolute',
            left: 14,
            bottom: 12,
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 17 }}>{playing ? '❚❚' : '▶'}</Text>
        </Pressable>
      </View>

      <ScreenContainer contentStyle={{ paddingTop: 16 }}>
        <View style={{ backgroundColor: colors.accent, borderRadius: radius.xxl, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <Text style={{ fontSize: 40, fontWeight: '800', color: '#fff' }}>{analysis.nota.toFixed(1).replace('.', ',')}</Text>
          <Text style={{ fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.96)', flex: 1 }}>
            {toneScoreMsg(tone, analysis.nota, analysis.tips.length)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
          {analysis.subscores.map((ss) => (
            <View key={ss.label} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 12 }}>
              <Text style={{ fontWeight: '800', fontSize: 18, color: colors.ink }}>{ss.val.toFixed(1).replace('.', ',')}</Text>
              <Text style={{ fontSize: 10, color: colors.m50, marginTop: 3 }}>{ss.label}</Text>
            </View>
          ))}
        </View>

        <TintCard style={{ marginBottom: 18 }}>
          <Text style={{ fontWeight: '800', fontSize: 12, color: colors.good, marginBottom: 6 }}>{t('loQueHicisteBien')}</Text>
          <Text style={{ fontSize: 12.5, lineHeight: 18, color: colors.ink }}>{analysis.bienHecho}</Text>
        </TintCard>

        <Text style={{ fontWeight: '800', fontSize: 14, color: colors.ink, marginBottom: 10 }}>{t('loQuePuedesMejorar')}</Text>
        <View style={{ gap: 10, marginBottom: 20 }}>
          {analysis.tips.map((tip, i) => (
            <Pressable
              key={i}
              onPress={() => seekTo(tip.timeSec)}
              style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
            >
              <View style={{ backgroundColor: colors.chip, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 8 }}>
                <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 11 }}>{tip.timeLabel}</Text>
              </View>
              <Text style={{ fontSize: 13, lineHeight: 18, color: colors.ink, flex: 1 }}>{tip.text}</Text>
            </Pressable>
          ))}
        </View>

        <TintCard style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: '800', fontSize: 12.5, color: colors.good, marginBottom: 5 }}>{t('ejercicioSemana')}</Text>
          <Text style={{ fontSize: 12.5, lineHeight: 18, color: colors.ink }}>{analysis.ejercicioSemana}</Text>
        </TintCard>

        <Pressable
          onPress={() => navigation.navigate('Comparacion', { analysisId: analysis.id })}
          style={{ backgroundColor: '#26221d', borderRadius: 16, padding: 15, alignItems: 'center' }}
        >
          <Text style={{ color: '#faf7f2', fontWeight: '700', fontSize: 13.5 }}>{t('verComparacion')}</Text>
        </Pressable>
      </ScreenContainer>

      <Pressable
        onPress={() => navigation.navigate('Chat')}
        style={{ padding: 12, paddingBottom: 24, paddingHorizontal: 20, backgroundColor: colors.nav, flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 12.5, color: colors.m45 }}>{t('hablaConEntrenador')}</Text>
        </View>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 17 }}>↑</Text>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}
