import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Chip } from '../../components/Chip';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { CoachTone, PLAN_DEFS } from '../../types/models';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AjustesMenu'>;

export default function AjustesMenuScreen({ navigation }: Props) {
  const { t, lang } = useT();
  const { colors, isDark } = useTheme();
  const setLang = useAppStore((s) => s.setLang);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const logout = useAppStore((s) => s.logout);
  const deleteAccount = useAppStore((s) => s.deleteAccount);
  const planTier = useAppStore((s) => s.planTier);
  const toneSel = useAppStore((s) => s.toneSel) ?? 'Cercano';
  const setTone = useAppStore((s) => s.setTone);
  const [confirmDel, setConfirmDel] = useState(false);
  const TONOS: CoachTone[] = ['Cercano', 'Técnico', 'Exigente'];

  const planLabel = planTier === 'free' ? (lang === 'es' ? 'Gratis' : 'Free') : PLAN_DEFS[planTier].nombre;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title={t('ajustes')} onBack={() => navigation.goBack()} />

        <Text style={{ fontWeight: '800', fontSize: 12.5, color: colors.ink, marginBottom: 8 }}>{t('idioma')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {(['es', 'en'] as const).map((l) => {
            const on = lang === l;
            return (
              <Pressable
                key={l}
                onPress={() => setLang(l)}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: 'center',
                  backgroundColor: on ? colors.accent : colors.surface,
                  borderWidth: on ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: on ? '#fff' : colors.ink, fontWeight: on ? '700' : '500', fontSize: 12.5 }}>{l === 'es' ? 'Español' : 'English'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 16, marginBottom: 18 }}>
          <Text style={{ fontSize: 17 }}>🌙</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 13, color: colors.ink }}>{t('oscuro')}</Text>
            <Text style={{ fontSize: 11, color: colors.m55, marginTop: 2 }}>{t('oscuroD')}</Text>
          </View>
          <ToggleSwitch value={isDark} onValueChange={toggleTheme} />
        </View>

        <Text style={{ fontWeight: '800', fontSize: 12.5, color: colors.ink, marginBottom: 8 }}>{t('tonoEntrenador')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
          {TONOS.map((tn) => (
            <View key={tn} style={{ flex: 1 }}>
              <Chip label={tn} active={toneSel === tn} onPress={() => setTone(tn)} />
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 4, marginBottom: 18 }}>
          <Pressable onPress={() => navigation.navigate('AjustesNivel')} style={{ paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 13.5, color: colors.ink }}>{t('nivelYDisciplinas')}</Text>
            <Text style={{ marginLeft: 'auto', color: colors.m30 }}>›</Text>
          </Pressable>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Pressable onPress={() => navigation.navigate('AjustesNotif')} style={{ paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 13.5, color: colors.ink }}>{t('notificaciones')}</Text>
            <Text style={{ marginLeft: 'auto', color: colors.m30 }}>›</Text>
          </Pressable>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Pressable onPress={() => navigation.navigate('AjustesSuscripcion')} style={{ paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 13.5, color: colors.ink }}>
              {t('suscripcion')} · <Text style={{ color: colors.good, fontWeight: '700' }}>{planLabel}</Text>
            </Text>
            <Text style={{ marginLeft: 'auto', color: colors.m30 }}>›</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={logout}
          style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.ink }}>{t('cerrarSesion')}</Text>
          <Text style={{ marginLeft: 'auto', color: colors.m40 }}>↩</Text>
        </Pressable>

        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(192,71,58,0.3)', borderRadius: 18, padding: 16 }}>
          <Text style={{ fontWeight: '800', fontSize: 13, color: colors.danger, marginBottom: 4 }}>{t('eliminarPerfil')}</Text>
          <Text style={{ fontSize: 12, lineHeight: 18, color: colors.ink, marginBottom: 14 }}>{t('eliminarPerfilDesc')}</Text>
          {confirmDel ? (
            <View style={{ flexDirection: 'row', gap: 9 }}>
              <PrimaryButton label={t('cancelar')} onPress={() => setConfirmDel(false)} variant="outline" style={{ flex: 1 }} />
              <Pressable onPress={deleteAccount} style={{ flex: 1, backgroundColor: colors.danger, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>{t('siEliminar')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmDel(true)} style={{ borderWidth: 1, borderColor: colors.danger, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}>
              <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>{t('eliminarPerfil')}</Text>
            </Pressable>
          )}
        </View>
      </ScreenContainer>
    </SafeAreaView>
  );
}
