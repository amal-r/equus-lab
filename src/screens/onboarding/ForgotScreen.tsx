import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { FormField } from '../../components/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TintCard } from '../../components/TintCard';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Forgot'>;

export default function ForgotScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title={t('recuperar')} onBack={() => navigation.goBack()} />
        {sent ? (
          <>
            <TintCard style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 22 }}>
              <Text style={{ fontSize: 22 }}>📩</Text>
              <Text style={{ fontSize: 13, lineHeight: 19, color: colors.ink, flex: 1 }}>{t('enviado')}</Text>
            </TintCard>
            <PrimaryButton label={t('volver')} onPress={() => navigation.navigate('Login')} />
          </>
        ) : (
          <>
            <Text style={{ fontSize: 13, color: colors.m55, lineHeight: 19, marginBottom: 18 }}>
              Introduce tu correo y te enviaremos un enlace para restablecer la contraseña.
            </Text>
            <FormField
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              placeholder="jinete@equuslab.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <PrimaryButton label={t('enviar')} onPress={() => setSent(true)} />
          </>
        )}
      </ScreenContainer>
    </SafeAreaView>
  );
}
