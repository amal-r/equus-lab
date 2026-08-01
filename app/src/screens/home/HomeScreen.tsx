import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TintCard } from '../../components/TintCard';
import { BottomNav } from '../../components/BottomNav';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { FREE_LIMITS } from '../../types/models';
import { computeWeekStreak } from '../../utils/streak';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const CONSEJOS = [
  'Antes de reunir, activa el impulso: unos trancos de trote medio y vuelve a reunido. La grupa entra sola bajo la masa.',
  'Un buen contacto no se "tira", se cede. Piensa en manos que acompañan, no que sostienen.',
  'La rectitud empieza en tu propio asiento: reparte el peso por igual en ambos isquiones antes de pedir nada.',
  'Antes de saltar, comprueba el ritmo de galope dos zancadas antes de la línea de batida.',
  'En el trabajo pie a tierra, premia el primer intento, aunque sea pequeño: así el caballo entiende antes la pregunta.',
];

function greetKey(): 'buenosDias' | 'buenasTardes' | 'buenasNoches' {
  const h = new Date().getHours();
  if (h < 6 || h >= 20) return 'buenasNoches';
  if (h < 13) return 'buenosDias';
  return 'buenasTardes';
}

export default function HomeScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const rider = useAppStore((s) => s.rider);
  const planTier = useAppStore((s) => s.planTier);
  const analyses = useAppStore((s) => s.analyses);
  const analisisHoy = useAppStore((s) => s.analisisHoy);
  const chatHoy = useAppStore((s) => s.chatHoy);
  const ensureDailyReset = useAppStore((s) => s.ensureDailyReset);

  React.useEffect(() => {
    ensureDailyReset();
  }, [ensureDailyReset]);

  const consejo = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return CONSEJOS[dayOfYear % CONSEJOS.length];
  }, []);

  const ultima = analyses[0];
  const racha = useMemo(() => computeWeekStreak(analyses.map((a) => a.fecha)), [analyses]);
  const isFree = planTier === 'free';
  const analisisLeft = Math.max(0, FREE_LIMITS.analisisPorDia - analisisHoy);
  const chatLeft = Math.max(0, FREE_LIMITS.preguntasChatPorDia - chatHoy);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer contentStyle={{ flexGrow: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12.5, color: colors.m55 }}>{t(greetKey())},</Text>
            <Text style={{ fontWeight: '800', fontSize: 25, color: colors.ink, lineHeight: 28 }}>{rider.nombre} 🐴</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Chat')}
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 3,
            }}
          >
            <Text style={{ fontSize: 20 }}>🎓</Text>
            <View
              style={{
                position: 'absolute',
                top: 9,
                right: 9,
                width: 9,
                height: 9,
                borderRadius: 5,
                backgroundColor: colors.good,
                borderWidth: 2,
                borderColor: colors.surface,
              }}
            />
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate('Subir')}
          style={{ backgroundColor: colors.accent, borderRadius: radius.xxl, padding: 22, marginBottom: 16 }}
        >
          <Text style={{ fontWeight: '800', fontSize: 18, color: '#fff', marginBottom: 5 }}>{t('analizarSesion')}</Text>
          <Text style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.92)', lineHeight: 17 }}>{t('analizarSesionDesc')}</Text>
          <View
            style={{
              marginTop: 14,
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.22)',
              borderRadius: 20,
              paddingVertical: 9,
              paddingHorizontal: 15,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('subirVideo')}</Text>
          </View>
        </Pressable>

        <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink, marginVertical: 11 }}>{t('tuUltimaSesion')}</Text>
        {ultima ? (
          <Pressable
            onPress={() => navigation.navigate('Resultado', { analysisId: ultima.id })}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              marginBottom: 22,
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 3,
            }}
          >
            <View style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: colors.ph }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 14, color: colors.ink }}>
                {ultima.ejercicio} · {ultima.caballo}
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.m50, marginTop: 2 }}>{ultima.disciplina}</Text>
            </View>
            <Text style={{ fontWeight: '800', fontSize: 20, color: colors.accent }}>{ultima.nota.toFixed(1).replace('.', ',')}</Text>
          </Pressable>
        ) : (
          <TintCard style={{ marginBottom: 22 }}>
            <Text style={{ fontSize: 12.5, color: colors.ink, lineHeight: 18 }}>
              Aún no tienes sesiones analizadas. Sube tu primer vídeo para recibir tu primera corrección.
            </Text>
          </TintCard>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
          <View style={{ flex: 1, backgroundColor: colors.tint, borderRadius: radius.xl, padding: 15 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.good }}>🔥 {racha}</Text>
            <Text style={{ fontSize: 11, color: colors.m55, marginTop: 4 }}>{t('semanas')} seguidas</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.chip, borderRadius: radius.xl, padding: 15 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.accent }}>{analyses.length}</Text>
            <Text style={{ fontSize: 11, color: colors.m55, marginTop: 4 }}>{t('sesiones')} totales</Text>
          </View>
        </View>

        {isFree && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.xl,
              padding: 14,
              marginTop: 8,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 11 }}>
              <Text style={{ fontWeight: '800', fontSize: 12.5, color: colors.ink }}>{t('usoDeHoy')}</Text>
              <Pressable
                onPress={() => navigation.navigate('AjustesSuscripcion')}
                style={{ marginLeft: 'auto', backgroundColor: colors.chip, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 11 }}
              >
                <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 10.5 }}>{t('planGratisMejora')}</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontWeight: '800', fontSize: 19, color: colors.ink }}>{analisisLeft}</Text>
                  <Text style={{ fontSize: 11, color: colors.m50 }}>/ {FREE_LIMITS.analisisPorDia}</Text>
                </View>
                <Text style={{ fontSize: 10.5, color: colors.m55, marginTop: 1 }}>{t('analisisRestantes')}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.border }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontWeight: '800', fontSize: 19, color: colors.ink }}>{chatLeft}</Text>
                  <Text style={{ fontSize: 11, color: colors.m50 }}>/ {FREE_LIMITS.preguntasChatPorDia}</Text>
                </View>
                <Text style={{ fontSize: 10.5, color: colors.m55, marginTop: 1 }}>{t('preguntasChat')}</Text>
              </View>
            </View>
          </View>
        )}

        <TintCard style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text>💡</Text>
            <Text style={{ fontWeight: '800', fontSize: 12, color: colors.good }}>{t('consejoDelDia')}</Text>
          </View>
          <Text style={{ fontSize: 12.5, lineHeight: 18, color: colors.ink }}>{consejo}</Text>
        </TintCard>

        <View style={{ flex: 1, minHeight: 8 }} />

        <Pressable
          onPress={() => navigation.navigate('Perfil')}
          style={{ backgroundColor: '#26221d', borderRadius: radius.xl, padding: 15, flexDirection: 'row', gap: 12, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 22 }}>🎯</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12.5, lineHeight: 17, color: '#faf7f2' }}>
              {t('objetivo')}: <Text style={{ fontWeight: '800' }}>nota media de 8 en doma</Text>
            </Text>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
              <View style={{ width: '74%', height: '100%', backgroundColor: colors.accent, borderRadius: 4 }} />
            </View>
          </View>
        </Pressable>
      </ScreenContainer>
      <BottomNav active="home" />
    </SafeAreaView>
  );
}
