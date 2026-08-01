import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props extends TextInputProps {
  label: string;
  hint?: string;
}

export function FormField({ label, hint, style, ...rest }: Props) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
        {hint ? <Text style={{ color: colors.m40, fontWeight: '600', fontSize: 10.5 }}>{hint}</Text> : null}
      </View>
      <TextInput
        placeholderTextColor={colors.m45}
        style={[
          styles.input,
          { borderColor: colors.border, backgroundColor: colors.surface, color: colors.ink, borderRadius: radius.md },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  label: { fontWeight: '800', fontSize: 12.5 },
  input: { borderWidth: 1, paddingVertical: 13, paddingHorizontal: 15, fontSize: 13.5 },
});
