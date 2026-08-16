import React, { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { Chip } from '../../components/Chip';
import { AddDisciplineChip } from '../../components/AddDisciplineChip';
import { TintCard } from '../../components/TintCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { BottomNav } from '../../components/BottomNav';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { DISCIPLINAS_BASE, FREE_LIMITS, PLAN_DEFS } from '../../types/models';
import { nextDailyResetLabel } from '../../utils/resetTime';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Subir'>;

export default function SubirScreen({ navigation }: Props) {
  const { t, lang } = useT();
  const { colors } = useTheme();
  const horses = useAppStore((s) => s.horses);
  const selectedHorseId = useAppStore((s) => s.selectedHorseId);
  const setSelectedHorse = useAppStore((s) => s.setSelectedHorse);
  const disciplinaSel = useAppStore((s) => s.disciplinaSel);
  const setDisciplinaSel = useAppStore((s) => s.setDisciplinaSel);
  const focoSel = useAppStore((s) => s.focoSel);
  const setFocoSel = useAppStore((s) => s.setFocoSel);
  const customDisciplinas = useAppStore((s) => s.customDisciplinas);
  const addCustomDisciplina = useAppStore((s) => s.addCustomDisciplina);
  const videoUri = useAppStore((s) => s.videoUri);
  const videoName = useAppStore((s) => s.videoName);
  const setVideo = useAppStore((s) => s.setVideo);
  const planTier = useAppStore((s) => s.planTier);
  const canStartFreeAnalysis = useAppStore((s) => s.canStartFreeAnalysis);

  const [busyPicking, setBusyPicking] = useState(false);

  const isFree = planTier === 'free';
  const clipMaxMin = isFree ? FREE_LIMITS.clipMaxMin : PLAN_DEFS[planTier].clipMaxMin;

  const focoOpts = useMemo(() => {
    const base =
      disciplinaSel === 'Salto'
        ? [t('todoElConjunto'), 'Aproximación', 'Batida', 'Vuelo', 'Recepción']
        : [t('todoElConjunto'), 'Asiento', 'Contacto', 'Reunión', 'Transiciones'];
    return [...base, t('pieATierra')];
  }, [disciplinaSel, t]);

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Necesito acceso a tu galería para elegir el vídeo.');
      return;
    }
    setBusyPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const durationSec = Math.max(1, Math.round((asset.duration ?? 0) / 1000) || 60);
        setVideo(asset.uri, asset.fileName ?? 'vídeo', durationSec);
      }
    } finally {
      setBusyPicking(false);
    }
  };

  const startAnalysis = () => {
    if (!videoUri) {
      Alert.alert('Falta el vídeo', 'Sube un vídeo antes de analizar la sesión.');
      return;
    }
    if (isFree && (useAppStore.getState().videoDurationSec ?? 0) > FREE_LIMITS.clipMaxMin * 60) {
      Alert.alert(
        'Clip demasiado largo',
        `En el plan gratis el vídeo debe durar ${FREE_LIMITS.clipMaxMin} min o menos. Pásate a Premium para vídeos más largos.`
      );
      return;
    }
    if (isFree && !canStartFreeAnalysis()) {
      Alert.alert(
        'Límite diario alcanzado',
        `Has usado tu${FREE_LIMITS.analisisPorDia > 1 ? 's' : ''} ${FREE_LIMITS.analisisPorDia} análisis gratis de hoy. Se renueva ${nextDailyResetLabel(lang)}, o pásate a Premium para seguir ahora.`,
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Ver planes', onPress: () => navigation.navigate('AjustesSuscripcion') },
        ]
      );
      return;
    }
    navigation.navigate('Procesando');
  };

  const selectedHorse = horses.find((h) => h.id === selectedHorseId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title={t('nuevaSesion')} onBack={() => navigation.goBack()} />

        <Pressable
          onPress={pickVideo}
          style={{
            backgroundColor: colors.ph,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: '#c9a488',
            borderRadius: 22,
            height: 196,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 25 }}>↑</Text>
          </View>
          <Text style={{ fontWeight: '700', fontSize: 14, color: colors.ink }}>
            {busyPicking ? 'Abriendo galería…' : videoUri ? `${videoName ?? 'vídeo'} ✓` : t('subeTuVideo')}
          </Text>
          <Text style={{ fontSize: 11.5, color: colors.m50, textAlign: 'center', lineHeight: 15, paddingHorizontal: 20 }}>
            {t('subirHint')}
          </Text>
        </Pressable>

        <Text style={{ fontWeight: '800', fontSize: 13, color: colors.ink, marginBottom: 9 }}>{t('caballo')}</Text>
        <View style={{ flexDirection: 'row', gap: 9, flexWrap: 'wrap', marginBottom: 18 }}>
          {horses.map((h) => (
            <Chip key={h.id} label={h.nombre} active={selectedHorseId === h.id} onPress={() => setSelectedHorse(h.id)} />
          ))}
          <Pressable
            onPress={() => navigation.navigate('Perfil')}
            style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14 }}
          >
            <Text style={{ color: colors.m40, fontSize: 13 }}>＋</Text>
          </Pressable>
        </View>

        <Text style={{ fontWeight: '800', fontSize: 13, color: colors.ink, marginBottom: 9 }}>{t('disciplina')}</Text>
        <View style={{ flexDirection: 'row', gap: 9, flexWrap: 'wrap', marginBottom: 18 }}>
          {[...DISCIPLINAS_BASE, ...customDisciplinas].map((d) => (
            <Chip key={d} label={d} active={disciplinaSel === d} onPress={() => setDisciplinaSel(d)} />
          ))}
          <AddDisciplineChip onAdd={addCustomDisciplina} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ fontWeight: '800', fontSize: 13, color: colors.ink }}>{t('focoPregunta')}</Text>
          <View style={{ backgroundColor: colors.tint, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 }}>
            <Text style={{ color: colors.good, fontWeight: '700', fontSize: 10 }}>{t('opcional')}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 11.5, color: colors.m50, lineHeight: 15, marginBottom: 11 }}>{t('focoHint')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {focoOpts.map((f) => (
            <Chip key={f} label={f} active={focoSel === f} onPress={() => setFocoSel(f)} />
          ))}
        </View>

        <TintCard style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: '800', fontSize: 12, color: colors.good, marginBottom: 8 }}>{t('consejosTitulo')}</Text>
          {[t('consejo1'), t('consejo2'), t('consejo3')].map((c) => (
            <View key={c} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              <Text style={{ color: colors.good }}>✓</Text>
              <Text style={{ fontSize: 12, color: colors.ink, flex: 1, lineHeight: 16 }}>{c}</Text>
            </View>
          ))}
        </TintCard>

        <PrimaryButton label={t('analizarBtn')} onPress={startAnalysis} disabled={!selectedHorse} />
      </ScreenContainer>
      <BottomNav active="home" />
    </SafeAreaView>
  );
}
