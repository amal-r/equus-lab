import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { HorseType } from '../types/models';

const BADGES: Record<HorseType, { bg: string; glyph: string; color: string }> = {
  Yegua: { bg: '#f4e2ea', glyph: '♀', color: '#c0568a' },
  Semental: { bg: '#dfe8f2', glyph: '♂', color: '#3a6ea5' },
  Macho: { bg: '#dfe8f2', glyph: '♂', color: '#3a6ea5' },
  Castrado: { bg: '#e6e3dd', glyph: '⚆', color: '#7c766c' },
  Pony: { bg: '#e2efe0', glyph: 'P', color: '#5a7048' },
};

interface Props {
  tipo: HorseType;
  size?: number;
}

export function HorseAvatar({ tipo, size = 48 }: Props) {
  const { colors } = useTheme();
  const badge = BADGES[tipo] ?? BADGES.Yegua;
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.29, backgroundColor: badge.bg }]}>
      <Text style={{ fontSize: size * 0.5 }}>🐴</Text>
      <View
        style={[
          styles.badge,
          { backgroundColor: badge.color, borderColor: colors.surface, width: size * 0.38, height: size * 0.38, borderRadius: size * 0.19 },
        ]}
      >
        <Text style={{ color: '#fff', fontSize: size * 0.22, fontWeight: '800' }}>{badge.glyph}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
