import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Veredicto'>;

export default function VeredictoScreen({ navigation, route }: Props) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const veredicto = useAppStore((s) => s.veredictos.find((v) => v.id === route.params.veredictoId));

  if (!veredicto) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenContainer>
          <Text style={{ color: colors.ink }}>No se encontró el veredicto.</Text>
        </ScreenContainer>
      </SafeAreaView>
    );
  }

  const notaColor = (nota: number) => (nota >= 7 ? colors.good : nota >= 6 ? colors.ink : colors.accent);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title={veredicto.prueba} onBack={() => navigation.goBack()} />

        <View style={{ backgroundColor: '#26221d', borderRadius: radius.xxl, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 18 }}>
          <View>
            <Text style={{ fontSize: 40, fontWeight: '800', color: '#faf7f2' }}>
              {veredicto.puntuacionFinal.toFixed(1)}
              <Text style={{ fontSize: 20 }}>%</Text>
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(250,247,242,0.55)', marginTop: 3 }}>{t('puntuacionFinal')}</Text>
          </View>
          <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.14)', paddingLeft: 16 }}>
            <Text style={{ fontSize: 12, lineHeight: 18, color: 'rgba(250,247,242,0.85)' }}>
              Prueba <Text style={{ fontWeight: '800' }}>{veredicto.puesto}</Text>. {veredicto.caballo} · {new Date(veredicto.fecha).toLocaleDateString()}.
            </Text>
          </View>
        </View>

        <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink, marginBottom: 10 }}>{t('notasPorMovimiento')}</Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 18 }}>
          {veredicto.sheetRows.map((r, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 15,
                borderBottomWidth: i === veredicto.sheetRows.length - 1 ? 0 : 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ width: 22, fontSize: 11, color: colors.m40, fontWeight: '700' }}>{r.n}</Text>
              <Text style={{ flex: 1, fontSize: 12.5, color: colors.ink, lineHeight: 17 }}>{r.mov}</Text>
              <Text style={{ fontSize: 10, color: colors.m40, fontWeight: '600' }}>{r.coef}</Text>
              <Text style={{ fontWeight: '800', fontSize: 15, color: notaColor(r.nota), width: 34, textAlign: 'right' }}>{r.nota}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink, marginBottom: 10 }}>{t('notasDeConjunto')}</Text>
        <View style={{ gap: 8, marginBottom: 18 }}>
          {veredicto.colectivas.map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 12 }}>
              <Text style={{ flex: 1, fontSize: 12.5, color: colors.ink }}>{c.k}</Text>
              <Text style={{ fontWeight: '800', fontSize: 14, color: notaColor(c.v) }}>{c.v}</Text>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: colors.chip, borderRadius: 16, padding: 16, marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text>⚖️</Text>
            <Text style={{ fontWeight: '800', fontSize: 12, color: colors.accent }}>{t('comentarioJuez')}</Text>
          </View>
          <Text style={{ fontSize: 12.5, lineHeight: 19, color: colors.ink }}>{veredicto.comentario}</Text>
        </View>

        <Pressable onPress={() => navigation.navigate('Chat')} style={{ backgroundColor: '#26221d', borderRadius: 16, padding: 15, alignItems: 'center' }}>
          <Text style={{ color: '#faf7f2', fontWeight: '700', fontSize: 13.5 }}>{t('preguntarJuez')}</Text>
        </Pressable>
      </ScreenContainer>
    </SafeAreaView>
  );
}
