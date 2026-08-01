import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  pct: number; // 0-100
  size?: number;
  stroke?: number;
  color: string;
  trackColor: string;
  label: string;
}

export function ProgressRing({ pct, size = 120, stroke = 10, color, trackColor, label }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 31, fontWeight: '800', color: '#faf7f2' }}>
          {Math.round(pct)}
          <Text style={{ fontSize: 15 }}>%</Text>
        </Text>
        <Text style={{ fontSize: 10, color: 'rgba(250,247,242,0.5)', marginTop: 1 }}>{label}</Text>
      </View>
    </View>
  );
}
