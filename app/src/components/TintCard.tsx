import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props {
  children: React.ReactNode;
  variant?: 'tint' | 'chip' | 'surface' | 'dark';
  style?: ViewStyle;
}

export function TintCard({ children, variant = 'tint', style }: Props) {
  const { colors, radius } = useTheme();
  const bg =
    variant === 'tint' ? colors.tint : variant === 'chip' ? colors.chip : variant === 'dark' ? '#26221d' : colors.surface;
  return <View style={[styles.card, { backgroundColor: bg, borderRadius: radius.lg }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { padding: 16 },
});
