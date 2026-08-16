import React from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { Chip } from '../../components/Chip';
import { AddDisciplineChip } from '../../components/AddDisciplineChip';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { DISCIPLINAS_BASE, Nivel } from '../../types/models';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AjustesNivel'>;

const NIVELES: Nivel[] = ['Iniciación', 'Medio', 'Avanzado'];

export default function AjustesNivelScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const rider = useAppStore((s) => s.rider);
  const updateRiderProfile = useAppStore((s) => s.updateRiderProfile);
  const toggleDisciplinaPracticada = useAppStore((s) => s.toggleDisciplinaPracticada);
  const customDisciplinas = useAppStore((s) => s.customDisciplinas);
  const addCustomDisciplina = useAppStore((s) => s.addCustomDisciplina);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title={t('nivelYDisciplinas')} onBack={() => navigation.goBack()} />
        <Text style={{ fontWeight: '800', fontSize: 13, color: colors.ink, marginBottom: 10 }}>{t('tuNivel')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 22 }}>
          {NIVELES.map((n) => (
            <View key={n} style={{ flex: 1 }}>
              <Chip label={n} active={rider.nivel === n} onPress={() => updateRiderProfile({ nivel: n })} />
            </View>
          ))}
        </View>
        <Text style={{ fontWeight: '800', fontSize: 13, color: colors.ink, marginBottom: 10 }}>{t('disciplinasQuePracticas')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[...DISCIPLINAS_BASE, ...customDisciplinas].map((d) => (
            <Chip
              key={d}
              label={rider.disciplinasPracticadas[d] ? `${d} ✓` : d}
              active={!!rider.disciplinasPracticadas[d]}
              onPress={() => toggleDisciplinaPracticada(d)}
            />
          ))}
          <AddDisciplineChip
            onAdd={(nombre) => {
              addCustomDisciplina(nombre);
              if (!rider.disciplinasPracticadas[nombre]) toggleDisciplinaPracticada(nombre);
            }}
          />
        </View>
      </ScreenContainer>
    </SafeAreaView>
  );
}
