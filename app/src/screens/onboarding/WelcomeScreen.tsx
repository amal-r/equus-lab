import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useT } from '../../i18n/useT';
import { useAppStore } from '../../store/useAppStore';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const { t } = useT();
  const enterDemo = useAppStore((s) => s.enterDemo);

  return (
    <LinearGradient colors={['#4a2f22', '#2a201a', '#171310']} start={{ x: 0.8, y: 0 }} end={{ x: 0.3, y: 1 }} style={styles.flex}>
      <View style={[styles.glow]} pointerEvents="none" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <View style={styles.brandDot}>
              <Text style={{ fontSize: 15 }}>🐴</Text>
            </View>
            <Text style={styles.brandText}>EQUUS LAB</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.accentBar} />
          <Text style={styles.title}>{t('welcomeTitle')}</Text>
          <Text style={styles.body}>{t('welcomeBody')}</Text>
          <View style={{ gap: 11 }}>
            <PrimaryButton label={t('crear')} onPress={() => navigation.navigate('Register')} variant="accent" />
            <View style={{ flexDirection: 'row', gap: 11 }}>
              <Pressable
                onPress={() => navigation.navigate('Login')}
                style={[styles.ghostBtn, { borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(255,255,255,0.06)' }]}
              >
                <Text style={styles.ghostLabel}>{t('entrar')}</Text>
              </Pressable>
              <Pressable onPress={enterDemo} style={[styles.ghostBtn, { borderColor: 'rgba(255,255,255,0.14)' }]}>
                <Text style={[styles.ghostLabel, { color: 'rgba(250,247,242,0.75)' }]}>{t('demo')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  glow: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(192,95,58,0.35)',
  },
  content: { flex: 1, paddingHorizontal: 28, paddingBottom: 34, paddingTop: 30 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#c05f3a', alignItems: 'center', justifyContent: 'center' },
  brandText: { color: '#faf7f2', fontWeight: '800', fontSize: 13, letterSpacing: 3 },
  accentBar: { width: 36, height: 3, backgroundColor: '#c05f3a', marginBottom: 22 },
  title: { color: '#faf7f2', fontWeight: '800', fontSize: 42, lineHeight: 42, letterSpacing: -1, marginBottom: 16 },
  body: { color: 'rgba(250,247,242,0.72)', fontSize: 14.5, lineHeight: 21, maxWidth: 300, marginBottom: 30 },
  ghostBtn: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  ghostLabel: { color: '#faf7f2', fontWeight: '700', fontSize: 13.5 },
});
