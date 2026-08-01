import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function BackHeader({ title, onBack, right }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <Text style={{ fontSize: 22, color: colors.m40 }}>‹</Text>
        </Pressable>
      ) : (
        <View style={{ width: 8 }} />
      )}
      <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
        {title}
      </Text>
      {right ?? <View style={{ width: 8 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 18 },
  backBtn: { padding: 0 },
  title: { fontWeight: '800', fontSize: 22, flex: 1 },
});
