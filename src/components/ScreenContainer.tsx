import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function ScreenContainer({ children, scroll = true, padded = true, style, contentStyle }: Props) {
  const { colors } = useTheme();
  const pad = padded ? styles.padded : undefined;
  if (!scroll) {
    return <View style={[styles.flex, { backgroundColor: colors.bg }, pad, style]}>{children}</View>;
  }
  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.bg }, style]}
      contentContainerStyle={[pad, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 18 },
});
