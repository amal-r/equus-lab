import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { TintCard } from '../../components/TintCard';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import type { RootStackParamList } from '../../navigation/types';
import type { MorphZona } from '../../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'MorfologiaResultado'>;

// Posiciones aproximadas de cada zona sobre la foto de perfil (no hay
// keypoints reales todavía, ver analyzeMorphology.ts) -- suficiente para una
// referencia visual, no una localización anatómica exacta.
const ZONA_POS: Record<string, { top: `${number}%`; left: `${number}%` }> = {
  'Dorso / lomo': { top: '26%', left: '46%' },
  'Grupa izquierda': { top: '34%', left: '74%' },
  'Grupa derecha': { top: '50%', left: '80%' },
  'Cuello / trapecio': { top: '20%', left: '16%' },
  'Pectoral / antebrazo': { top: '58%', left: '12%' },
};

const ESTADO_COLOR: Record<MorphZona['estado'], string> = { correcto: '#6a9450', debil: '#c9992f', atrofia: '#c05f3a' };
const ESTADO_LABEL: Record<MorphZona['estado'], string> = { correcto: 'Correcto', debil: 'Débil', atrofia: 'Atrofia' };
const REF_COLOR: Record<string, string> = { 'en rango': '#6a9450', 'algo cerrado': '#c9992f', asimetria: '#c05f3a' };

export default function MorfologiaResultScreen({ navigation, route }: Props) {
  const { colors, radius } = useTheme();
  const scan = useAppStore((s) => s.scans.find((sc) => sc.id === route.params.scanId));
  const planTier = useAppStore((s) => s.planTier);
  const showPremiumTeaser = planTier === 'free' && scan?.origen === 'ondevice';

  if (!scan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenContainer>
          <Text style={{ color: colors.ink }}>No se encontró el escaneo.</Text>
        </ScreenContainer>
      </SafeAreaView>
    );
  }

  const preguntar = () => {
    const q = `Sobre el escaneo morfológico de ${scan.caballo} (índice ${scan.indice.toFixed(1)}/10): ${scan.resumen} ¿Qué debería priorizar en el trabajo de las próximas semanas?`;
    navigation.navigate('Chat', { initialQuestion: q });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title="Morfología · resultado" onBack={() => navigation.goBack()} />

        <View style={{ backgroundColor: colors.accent, borderRadius: radius.xxl, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <Text style={{ fontSize: 40, fontWeight: '800', color: '#fff' }}>{scan.indice.toFixed(1).replace('.', ',')}</Text>
          <Text style={{ fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.96)', flex: 1 }}>{scan.resumen}</Text>
        </View>

        {showPremiumTeaser && (
          <Pressable
            onPress={() => navigation.navigate('AjustesSuscripcion')}
            style={{ backgroundColor: '#26221d', borderRadius: 16, padding: 16, marginBottom: 18, flexDirection: 'row', gap: 12, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 22 }}>🔍</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#faf7f2', fontWeight: '800', fontSize: 12.5, marginBottom: 3 }}>
                Este escaneo no es 100% fiable
              </Text>
              <Text style={{ color: 'rgba(250,247,242,0.8)', fontSize: 12, lineHeight: 17 }}>
                Es la versión gratis, on-device, sin IA real analizando tus fotos. Con Premium, Gemini analiza las
                fotos de verdad y el informe es fiable. Ver planes →
              </Text>
            </View>
          </Pressable>
        )}

        <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink, marginBottom: 11 }}>Mapa muscular</Text>
        <View style={{ borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.ph, height: 220, marginBottom: 12 }}>
          {scan.images.perfil ? (
            <Image source={{ uri: scan.images.perfil }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 11, color: colors.m40 }}>foto no disponible</Text>
            </View>
          )}
          {scan.zonas.map((z) => {
            const pos = ZONA_POS[z.zona] ?? { top: '40%', left: '45%' };
            return (
              <View
                key={z.zona}
                style={{
                  position: 'absolute',
                  top: pos.top,
                  left: pos.left,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: ESTADO_COLOR[z.estado],
                  borderWidth: 2,
                  borderColor: '#fff',
                }}
              />
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          {(['correcto', 'debil', 'atrofia'] as const).map((k) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ESTADO_COLOR[k] }} />
              <Text style={{ fontSize: 11, color: colors.m55 }}>{ESTADO_LABEL[k]}</Text>
            </View>
          ))}
        </View>

        <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink, marginBottom: 11 }}>Desarrollo por zona</Text>
        <View style={{ gap: 10, marginBottom: 20 }}>
          {scan.zonas.map((z) => (
            <View key={z.zona} style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 }}>
                <Text style={{ fontWeight: '700', fontSize: 12.5, color: colors.ink }}>{z.zona}</Text>
                <Text style={{ marginLeft: 'auto', fontWeight: '800', fontSize: 12.5, color: ESTADO_COLOR[z.estado] }}>{z.pct}%</Text>
              </View>
              <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                <View style={{ width: `${z.pct}%`, height: '100%', backgroundColor: ESTADO_COLOR[z.estado], borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 11.5, lineHeight: 16, color: colors.m55 }}>{z.nota}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 }}>
          <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink }}>Medidas y proporciones</Text>
          <View style={{ backgroundColor: colors.tint, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 }}>
            <Text style={{ color: colors.good, fontWeight: '700', fontSize: 9.5 }}>ESTIMADO</Text>
          </View>
        </View>
        <View style={{ gap: 8, marginBottom: 10 }}>
          {scan.medidas.map((m) => (
            <View key={m.label} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.ink }}>{m.label}</Text>
                <Text style={{ fontSize: 11, color: colors.m50, marginTop: 2 }}>{m.valor}</Text>
              </View>
              <View style={{ backgroundColor: `${REF_COLOR[m.ref]}22`, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 }}>
                <Text style={{ color: REF_COLOR[m.ref], fontWeight: '700', fontSize: 10.5 }}>{m.ref}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 10.5, color: colors.m50, lineHeight: 15, marginBottom: 20, paddingHorizontal: 2 }}>
          📐 Medidas estimadas a partir de las fotos, no tomadas con cinta. Sirven para comparar escaneos del mismo
          caballo y ver su evolución; para cifras exactas, mide en persona. Los ángulos y la simetría sí son fiables
          porque se calculan sobre proporciones.
        </Text>

        {scan.alertas.length > 0 && (
          <View style={{ backgroundColor: '#f7ece7', borderRadius: radius.xl, padding: 15, marginBottom: 20, flexDirection: 'row', gap: 10 }}>
            <Text style={{ fontSize: 18 }}>⚠️</Text>
            <Text style={{ fontSize: 12, lineHeight: 17, color: '#26221d', flex: 1 }}>{scan.alertas[0]}</Text>
          </View>
        )}

        <TintCard style={{ marginBottom: 18 }}>
          <Text style={{ fontWeight: '800', fontSize: 12.5, color: colors.good, marginBottom: 6 }}>💪 Plan de 4 semanas</Text>
          <Text style={{ fontSize: 12.5, lineHeight: 18, color: colors.ink }}>{scan.plan}</Text>
        </TintCard>

        <View style={{ backgroundColor: colors.chip, borderRadius: radius.lg, padding: 13, marginBottom: 20 }}>
          <Text style={{ fontSize: 10.5, lineHeight: 15, color: colors.m55 }}>
            Este informe es orientativo, generado a partir de fotos y no sustituye la valoración de un veterinario,
            fisioterapeuta equino ni técnico de sillas. Ante cualquier asimetría marcada, consulta con un profesional.
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <Pressable onPress={preguntar} style={{ backgroundColor: '#26221d', borderRadius: radius.lg, padding: 15, alignItems: 'center' }}>
            <Text style={{ color: '#faf7f2', fontWeight: '700', fontSize: 13.5 }}>Preguntar a la IA</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.replace('Morfologia')}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 15, alignItems: 'center' }}
          >
            <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 13.5 }}>Nuevo escaneo</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    </SafeAreaView>
  );
}
