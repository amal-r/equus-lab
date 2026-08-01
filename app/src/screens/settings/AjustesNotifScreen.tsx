import React from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { NotifPrefs } from '../../types/models';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AjustesNotif'>;

const ROWS: { k: keyof NotifPrefs; label: string; desc: string }[] = [
  { k: 'analisis', label: 'Análisis listo', desc: 'Cuando la IA termina de corregir tu vídeo' },
  { k: 'retos', label: 'Reto semanal', desc: 'Tu ejercicio de la semana cada lunes' },
  { k: 'concursos', label: 'Recordatorio de concursos', desc: 'Antes de tus pruebas guardadas' },
  { k: 'marketing', label: 'Novedades de Equus Lab', desc: 'Consejos y actualizaciones de la app' },
];

export default function AjustesNotifScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const notif = useAppStore((s) => s.notif);
  const toggleNotif = useAppStore((s) => s.toggleNotif);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title={t('notificaciones')} onBack={() => navigation.goBack()} />
        <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 4 }}>
          {ROWS.map((r, i) => (
            <View
              key={r.k}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 14,
                paddingHorizontal: 14,
                borderBottomWidth: i === ROWS.length - 1 ? 0 : 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: colors.ink }}>{r.label}</Text>
                <Text style={{ fontSize: 11, color: colors.m50, marginTop: 2 }}>{r.desc}</Text>
              </View>
              <ToggleSwitch value={notif[r.k]} onValueChange={() => toggleNotif(r.k)} />
            </View>
          ))}
        </View>
      </ScreenContainer>
    </SafeAreaView>
  );
}
