import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { FormField } from '../../components/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch, ApiError } from '../../services/apiClient';
import { HAS_BACKEND } from '../../services/config';
import { setToken } from '../../services/session';
import { identifyUser } from '../../services/purchases';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

interface RegisterResponse {
  token: string;
  user: { id: string; name: string; email: string };
}

export default function RegisterScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const registerWithEmail = useAppStore((s) => s.registerWithEmail);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!HAS_BACKEND) {
      registerWithEmail(name.trim(), email.trim());
      return;
    }
    setBusy(true);
    try {
      const { token, user } = await apiFetch<RegisterResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password: pass }),
      });
      await setToken(token);
      registerWithEmail(user.name, user.email, user.id);
      void identifyUser(user.id);
    } catch (err) {
      Alert.alert(
        'No se pudo crear la cuenta',
        err instanceof ApiError && err.code === 'email_en_uso' ? 'Ese correo ya está en uso.' : 'Revisa los datos e inténtalo de nuevo.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title={t('crear')} onBack={() => navigation.goBack()} />
        <FormField label={t('nombre')} value={name} onChangeText={setName} placeholder="Laura" />
        <FormField
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          placeholder="jinete@equuslab.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <FormField label={t('pass')} value={pass} onChangeText={setPass} placeholder={t('passMinima')} secureTextEntry />
        <PrimaryButton label={t('crear')} onPress={submit} loading={busy} style={{ marginTop: 6, marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Text style={{ fontSize: 12.5, color: colors.m55 }}>{t('yaCuenta')}</Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 12.5 }}>{t('entrar')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    </SafeAreaView>
  );
}
