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

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

interface LoginResponse {
  token: string;
  user: { id: string; name: string; email: string };
}

export default function LoginScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const loginWithEmail = useAppStore((s) => s.loginWithEmail);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!HAS_BACKEND) {
      loginWithEmail(email.trim());
      return;
    }
    setBusy(true);
    try {
      const { token, user } = await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });
      await setToken(token);
      loginWithEmail(user.email, user.id);
      void identifyUser(user.id);
    } catch (err) {
      Alert.alert('No se pudo iniciar sesión', err instanceof ApiError ? 'Revisa tu correo y contraseña.' : 'Inténtalo de nuevo en unos minutos.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title={t('entrar')} onBack={() => navigation.goBack()} />
        <FormField
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          placeholder="jinete@equuslab.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <FormField label={t('pass')} value={pass} onChangeText={setPass} placeholder="••••••••" secureTextEntry />
        <Pressable onPress={() => navigation.navigate('Forgot')} style={{ marginBottom: 22 }}>
          <Text style={{ color: colors.accent, fontSize: 12.5, fontWeight: '700' }}>{t('olvidar')}</Text>
        </Pressable>
        <PrimaryButton label={t('entrar')} onPress={submit} loading={busy} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Text style={{ fontSize: 12.5, color: colors.m55 }}>{t('sinCuenta')}</Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 12.5 }}>{t('crear')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    </SafeAreaView>
  );
}
