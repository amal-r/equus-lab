import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { FormField } from '../../components/FormField';
import { Chip } from '../../components/Chip';
import { AddDisciplineChip } from '../../components/AddDisciplineChip';
import { TintCard } from '../../components/TintCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { DISCIPLINAS_BASE, HorseType, Nivel } from '../../types/models';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NuevoCaballo'>;

const TIPOS: HorseType[] = ['Yegua', 'Semental', 'Castrado', 'Pony'];
const NIVELES: Nivel[] = ['Iniciado', 'Medio', 'Avanzado'];

export default function NuevoCaballoScreen({ navigation, route }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const editId = route.params?.editId;
  const horses = useAppStore((s) => s.horses);
  const addHorse = useAppStore((s) => s.addHorse);
  const updateHorse = useAppStore((s) => s.updateHorse);
  const customDisciplinas = useAppStore((s) => s.customDisciplinas);
  const addCustomDisciplina = useAppStore((s) => s.addCustomDisciplina);
  const editing = editId ? horses.find((h) => h.id === editId) : undefined;

  const [nombre, setNombre] = useState(editing?.nombre ?? '');
  const [raza, setRaza] = useState(editing?.raza ?? '');
  const [edad, setEdad] = useState(editing?.edad ?? '');
  const [alzada, setAlzada] = useState(editing?.alzada ?? '');
  const [tipo, setTipo] = useState<HorseType>(editing?.tipo ?? 'Yegua');
  const [disc, setDisc] = useState(editing?.disciplina ?? 'Doma clásica');
  const [nivel, setNivel] = useState<Nivel>((editing?.nivel as Nivel) ?? '');

  const save = () => {
    const payload = { nombre: nombre.trim() || 'Nuevo caballo', raza, edad, alzada, tipo, disciplina: disc, nivel };
    if (editing) updateHorse(editing.id, payload);
    else addHorse(payload);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title={editing ? t('editarCaballoTitulo') : t('anadirCaballoTitulo')} onBack={() => navigation.goBack()} />

        <FormField label={t('nombre')} value={nombre} onChangeText={setNombre} placeholder="Ej. Ondina" />
        <FormField label={t('raza')} value={raza} onChangeText={setRaza} placeholder="Ej. PRE, KWPN, Lusitano…" />
        <TintCard style={{ marginBottom: 16, marginTop: -6 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ color: colors.good }}>💡</Text>
            <Text style={{ fontSize: 11.5, lineHeight: 16, color: colors.ink, flex: 1 }}>{t('razaHint')}</Text>
          </View>
        </TintCard>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <FormField label={t('edad')} value={edad} onChangeText={setEdad} placeholder="años" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <FormField label={t('alzada')} hint={`· ${t('opcional')}`} value={alzada} onChangeText={setAlzada} placeholder="cm" keyboardType="numeric" />
          </View>
        </View>

        <Text style={{ fontWeight: '800', fontSize: 12.5, color: colors.ink, marginBottom: 8 }}>{t('tipo')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {TIPOS.map((tp) => (
            <Chip key={tp} label={tp} active={tipo === tp} onPress={() => setTipo(tp)} />
          ))}
        </View>

        <Text style={{ fontWeight: '800', fontSize: 12.5, color: colors.ink, marginBottom: 8 }}>{t('disciplinaPrincipal')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {[...DISCIPLINAS_BASE, ...customDisciplinas].map((d) => (
            <Chip key={d} label={d} active={disc === d} onPress={() => setDisc(d)} />
          ))}
          <AddDisciplineChip onAdd={(nombre) => { addCustomDisciplina(nombre); setDisc(nombre); }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={{ fontWeight: '800', fontSize: 12.5, color: colors.ink }}>{t('nivelQueCrees')}</Text>
          <View style={{ backgroundColor: colors.tint, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 }}>
            <Text style={{ color: colors.good, fontWeight: '700', fontSize: 10 }}>{t('opcional')}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 9 }}>
          {NIVELES.map((n) => (
            <Chip key={n} label={n} active={nivel === n} onPress={() => setNivel(nivel === n ? '' : n)} />
          ))}
        </View>
        <TintCard style={{ marginBottom: 26 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Text>🤖</Text>
            <Text style={{ fontSize: 11.5, lineHeight: 16, color: colors.ink, flex: 1 }}>{t('nivelHint')}</Text>
          </View>
        </TintCard>

        <PrimaryButton label={editing ? t('guardarCambios') : t('guardarCaballo')} onPress={save} />
      </ScreenContainer>
    </SafeAreaView>
  );
}
