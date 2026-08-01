import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Chip } from '../../components/Chip';
import { BottomNav } from '../../components/BottomNav';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { judgeShow } from '../../ondevice/judgeShow';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Concursos'>;

const DISCIPLINAS = ['Doma clásica', 'Salto', 'Completo', 'Doma vaquera'];

export default function ConcursosScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const planTier = useAppStore((s) => s.planTier);
  const concDisciplina = useAppStore((s) => s.concDisciplina);
  const setConcDisciplina = useAppStore((s) => s.setConcDisciplina);
  const veredictos = useAppStore((s) => s.veredictos);
  const addVeredicto = useAppStore((s) => s.addVeredicto);
  const horses = useAppStore((s) => s.horses);
  const selectedHorseId = useAppStore((s) => s.selectedHorseId);
  const [judging, setJudging] = useState(false);

  const isPremium = planTier !== 'free';
  const caballo = horses.find((h) => h.id === selectedHorseId)?.nombre ?? horses[0]?.nombre ?? '—';

  const startConcurso = async () => {
    if (!isPremium) {
      Alert.alert('Función Premium', t('necesitaPremium'), [
        { text: 'Ahora no', style: 'cancel' },
        { text: 'Ver planes', onPress: () => navigation.navigate('AjustesSuscripcion') },
      ]);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Necesito acceso a tu galería para elegir el vídeo del simulacro.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setJudging(true);
    try {
      const veredicto = await judgeShow({
        uri: asset.uri,
        durationSec: Math.round((asset.duration ?? 60000) / 1000),
        caballo,
        disciplina: concDisciplina,
        prueba: `${concDisciplina} · simulacro`,
      });
      addVeredicto(veredicto);
      navigation.navigate('Veredicto', { veredictoId: veredicto.id });
    } finally {
      setJudging(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <Text style={{ fontWeight: '800', fontSize: 24, color: colors.ink, marginTop: 6, marginBottom: 4 }}>{t('concursos')}</Text>
        <Text style={{ fontSize: 12.5, color: colors.m55, lineHeight: 18, marginBottom: 18 }}>{t('concursosDesc')}</Text>

        <Pressable
          onPress={startConcurso}
          disabled={judging}
          style={{ backgroundColor: '#26221d', borderRadius: radius.xxl, padding: 20, marginBottom: 20, opacity: judging ? 0.7 : 1 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Text style={{ fontSize: 20 }}>⚖️</Text>
            <Text style={{ fontWeight: '800', fontSize: 17, color: '#faf7f2' }}>{t('simularPrueba')}</Text>
          </View>
          <Text style={{ fontSize: 12.5, color: 'rgba(250,247,242,0.85)', lineHeight: 17 }}>{t('simularPruebaDesc')}</Text>
          <View
            style={{
              marginTop: 14,
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: colors.accent,
              borderRadius: 20,
              paddingVertical: 9,
              paddingHorizontal: 15,
            }}
          >
            {judging ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t('empezarSimulacro')}</Text>}
          </View>
        </Pressable>

        <Text style={{ fontWeight: '800', fontSize: 13, color: colors.ink, marginBottom: 10 }}>{t('disciplinas')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {DISCIPLINAS.map((d) => (
            <Chip key={d} label={d} active={concDisciplina === d} onPress={() => setConcDisciplina(d)} />
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 11 }}>
          <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink }}>{t('veredictosRecientes')}</Text>
          <Text style={{ marginLeft: 'auto', fontSize: 11, color: colors.m40 }}>{veredictos.length} pruebas</Text>
        </View>
        <View style={{ gap: 10 }}>
          {veredictos.length === 0 ? (
            <Text style={{ fontSize: 12.5, color: colors.m55 }}>Aún no has hecho ningún simulacro.</Text>
          ) : (
            veredictos.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => navigation.navigate('Veredicto', { veredictoId: v.id })}
                style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13 }}
              >
                <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: colors.ph, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>🎯</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: colors.ink }}>{v.prueba}</Text>
                  <Text style={{ fontSize: 11, color: colors.m50 }}>{new Date(v.fecha).toLocaleDateString()} · juez IA</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: colors.accent }}>{v.puntuacionFinal.toFixed(1)}%</Text>
                  <Text style={{ fontSize: 10, color: colors.m45 }}>{v.puesto}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScreenContainer>
      <BottomNav active="concursos" />
    </SafeAreaView>
  );
}
