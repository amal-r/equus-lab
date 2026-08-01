import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'accent' | 'dark' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({ label, onPress, variant = 'accent', loading, disabled, style }: Props) {
  const { colors, radius } = useTheme();
  const bg = variant === 'accent' ? colors.accent : variant === 'dark' ? '#26221d' : 'transparent';
  const fg = variant === 'outline' ? colors.ink : '#fff';
  const border = variant === 'outline' ? { borderWidth: 1, borderColor: colors.border } : null;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        { backgroundColor: bg, borderRadius: radius.lg, opacity: disabled ? 0.5 : 1 },
        border,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.label, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: '100%', paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '800' },
});
