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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const registerWithEmail = useAppStore((s) => s.registerWithEmail);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const submit = () => {
    registerWithEmail(name.trim(), email.trim());
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
        <PrimaryButton label={t('crear')} onPress={submit} style={{ marginTop: 6, marginBottom: 16 }} />
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
