import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { FormField } from '../../components/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const loginWithEmail = useAppStore((s) => s.loginWithEmail);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const submit = () => {
    loginWithEmail(email.trim());
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
        <PrimaryButton label={t('entrar')} onPress={submit} style={{ marginBottom: 16 }} />
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
