import React from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props {
  value: boolean;
  onValueChange: () => void;
}

export function ToggleSwitch({ value, onValueChange }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onValueChange}
      style={[styles.track, { backgroundColor: value ? colors.accent : 'rgba(128,128,128,0.35)' }]}
    >
      <Animated.View style={[styles.knob, { left: value ? 22 : 2 }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: 20, justifyContent: 'center' },
  knob: {
    position: 'absolute',
    top: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
