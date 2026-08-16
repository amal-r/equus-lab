import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props {
  onAdd: (nombre: string) => void;
  label?: string;
}

/** Chip "+ Otra" que, al tocarla, abre un campo de texto para que el jinete
 * escriba una disciplina que no esté en la lista (p. ej. Volteo, Enganche…). */
export function AddDisciplineChip({ onAdd, label = '+ Otra' }: Props) {
  const { colors, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setOpen(false);
      return;
    }
    onAdd(trimmed);
    setValue('');
    setOpen(false);
  };

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          borderRadius: radius.md,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.m45,
          paddingVertical: 10,
          paddingHorizontal: 14,
        }}
      >
        <Text style={{ color: colors.m45, fontWeight: '600', fontSize: 12.5 }}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', width: '100%' }}>
      <TextInput
        autoFocus
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        placeholder="Escribe la disciplina…"
        placeholderTextColor={colors.m45}
        style={{
          flex: 1,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          paddingVertical: 10,
          paddingHorizontal: 14,
          fontSize: 13,
          color: colors.ink,
        }}
      />
      <Pressable onPress={submit} style={{ backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>Añadir</Text>
      </Pressable>
      <Pressable onPress={() => setOpen(false)} hitSlop={8}>
        <Text style={{ color: colors.m40, fontSize: 18 }}>✕</Text>
      </Pressable>
    </View>
  );
}
