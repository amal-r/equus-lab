import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Comparacion'>;

export default function ComparacionScreen({ navigation, route }: Props) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const analysis = useAppStore((s) => s.analyses.find((a) => a.id === route.params.analysisId));
  const [playing, setPlaying] = useState(false);

  if (!analysis) return null;

  const diffs = [
    ...analysis.tips.slice(0, 2).map((tip) => ({ icon: '∠', color: colors.accent, text: tip.text })),
    { icon: '✓', color: colors.good, text: 'Tu cadencia y ritmo coinciden con la referencia. ¡Bien!' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title={t('comparacion')} onBack={() => navigation.goBack()} />

        <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: colors.ph, height: 158, marginBottom: 10 }}>
          <View
            style={{
              position: 'absolute',
              top: 12,
              left: 14,
              backgroundColor: colors.accent,
              borderRadius: 10,
              paddingVertical: 5,
              paddingHorizontal: 10,
              zIndex: 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>{t('tuMonta')} · 0:34</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 10.5, color: colors.m40 }}>frame del vídeo</Text>
          </View>
        </View>

        <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: '#dbe3d5', height: 158, marginBottom: 16 }}>
          <View
            style={{
              position: 'absolute',
              top: 12,
              left: 14,
              backgroundColor: colors.good,
              borderRadius: 10,
              paddingVertical: 5,
              paddingHorizontal: 10,
              zIndex: 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>{t('referenciaNivel')}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 10.5, color: colors.m40 }}>técnica correcta</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#26221d', borderRadius: 14, padding: 12, marginBottom: 18 }}>
          <Pressable
            onPress={() => setPlaying((p) => !p)}
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 14 }}>{playing ? '❚❚' : '▶'}</Text>
          </Pressable>
          <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ width: '40%', height: '100%', backgroundColor: colors.accent, borderRadius: 4 }} />
          </View>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>0:34</Text>
        </View>

        <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink, marginBottom: 11 }}>{t('diferenciasClave')}</Text>
        <View style={{ gap: 10 }}>
          {diffs.map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: 14 }}>
              <Text style={{ color: d.color, fontSize: 16 }}>{d.icon}</Text>
              <Text style={{ fontSize: 12.5, lineHeight: 18, color: colors.ink, flex: 1 }}>{d.text}</Text>
            </View>
          ))}
        </View>
      </ScreenContainer>
    </SafeAreaView>
  );
}
