import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export type NavTab = 'home' | 'progreso' | 'concursos' | 'perfil';

export function BottomNav({ active }: { active: NavTab }) {
  const { colors } = useTheme();
  const { tArr } = useT();
  const nav = useNavigation<Nav>();
  const labels = tArr('nav');

  const item = (tab: NavTab, label: string, onPress: () => void) => {
    const on = tab === active;
    return (
      <Pressable onPress={onPress} hitSlop={8}>
        <Text style={{ fontSize: 10.5, fontWeight: on ? '800' : '600', color: on ? colors.accent : colors.m40 }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.row, { backgroundColor: colors.nav, borderTopColor: colors.border }]}>
      {item('home', labels[0], () => nav.navigate('Home'))}
      {item('progreso', labels[1], () => nav.navigate('Progreso'))}
      <Pressable onPress={() => nav.navigate('Subir')} style={[styles.fab, { backgroundColor: colors.accent }]}>
        <Text style={styles.fabIcon}>＋</Text>
      </Pressable>
      {item('concursos', labels[2], () => nav.navigate('Concursos'))}
      {item('perfil', labels[3], () => nav.navigate('Perfil'))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  fabIcon: { color: '#fff', fontSize: 22, lineHeight: 24 },
});
