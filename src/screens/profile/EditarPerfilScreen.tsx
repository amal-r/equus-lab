import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { FormField } from '../../components/FormField';
import { Chip } from '../../components/Chip';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { Nivel } from '../../types/models';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditarPerfil'>;

const NIVELES: Nivel[] = ['Iniciación', 'Medio', 'Avanzado'];

export default function EditarPerfilScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const rider = useAppStore((s) => s.rider);
  const updateRiderProfile = useAppStore((s) => s.updateRiderProfile);

  const [nombre, setNombre] = useState(rider.nombre);
  const [edad, setEdad] = useState(rider.edad);
  const [anios, setAnios] = useState(rider.aniosMontando);
  const [nivel, setNivel] = useState<Nivel>((rider.nivel as Nivel) || 'Medio');

  const save = () => {
    updateRiderProfile({ nombre: nombre.trim() || rider.nombre, edad, aniosMontando: anios, nivel });
    navigation.navigate('Perfil');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title={t('editarPerfil')} onBack={() => navigation.goBack()} />
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <View style={{ width: 82, height: 82, borderRadius: 41, backgroundColor: colors.ph, borderWidth: 3, borderColor: colors.accent }} />
        </View>
        <FormField label={t('nombreJinete')} value={nombre} onChangeText={setNombre} placeholder="Tu nombre" />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <FormField label={t('edad')} value={edad} onChangeText={setEdad} placeholder="años" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <FormField label={t('aniosMontando')} value={anios} onChangeText={setAnios} placeholder="años" keyboardType="numeric" />
          </View>
        </View>
        <Text style={{ fontWeight: '800', fontSize: 12.5, color: colors.ink, marginBottom: 8 }}>{t('nivel')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 26 }}>
          {NIVELES.map((n) => (
            <View key={n} style={{ flex: 1 }}>
              <Chip label={n} active={nivel === n} onPress={() => setNivel(n)} />
            </View>
          ))}
        </View>
        <PrimaryButton label={t('guardarCambios')} onPress={save} />
      </ScreenContainer>
    </SafeAreaView>
  );
}
