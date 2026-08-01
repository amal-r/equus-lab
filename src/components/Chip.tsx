import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
  dashed?: boolean;
}

export function Chip({ label, active, onPress, dashed }: Props) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderRadius: radius.md,
          backgroundColor: active ? colors.accent : colors.surface,
          borderWidth: dashed ? 1 : active ? 0 : 1,
          borderStyle: dashed ? 'dashed' : 'solid',
          borderColor: dashed ? colors.m45 : colors.border,
        },
      ]}
    >
      <Text style={{ color: active ? '#fff' : colors.ink, fontWeight: active ? '700' : '500', fontSize: 12.5 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingVertical: 10, paddingHorizontal: 14 },
});
