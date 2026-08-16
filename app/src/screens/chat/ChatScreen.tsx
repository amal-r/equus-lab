import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { askCoach } from '../../services/chatService';
import { toneGreeting } from '../../utils/coachTone';
import { FREE_LIMITS } from '../../types/models';
import { nextDailyResetLabel } from '../../utils/resetTime';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ navigation }: Props) {
  const { t, lang } = useT();
  const { colors } = useTheme();
  const messages = useAppStore((s) => s.messages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const rider = useAppStore((s) => s.rider);
  const tone = useAppStore((s) => s.toneSel) ?? 'Cercano';
  const planTier = useAppStore((s) => s.planTier);
  const chatHoy = useAppStore((s) => s.chatHoy);
  const canAskChat = useAppStore((s) => s.canAskChat);
  const registerChatQuestion = useAppStore((s) => s.registerChatQuestion);
  const lastAnalysis = useAppStore((s) => s.analyses[0]);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length === 0) {
      addChatMessage({ role: 'coach', text: toneGreeting(tone, rider.nombre, lastAnalysis?.tips.length ?? 0) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFree = planTier === 'free';

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (isFree && !canAskChat()) {
      setInput('');
      Alert.alert(
        'Límite diario alcanzado',
        `${t('limiteChatGratis', { n: FREE_LIMITS.preguntasChatPorDia })} ${lang === 'en' ? 'Resets' : 'Se renueva'} ${nextDailyResetLabel(lang)}.`,
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Ver planes', onPress: () => navigation.navigate('AjustesSuscripcion') },
        ]
      );
      return;
    }
    if (isFree) registerChatQuestion();
    addChatMessage({ role: 'user', text: trimmed });
    setInput('');
    setSending(true);
    try {
      const reply = await askCoach(trimmed, !isFree, messages);
      addChatMessage({ role: 'coach', text: reply });
    } finally {
      setSending(false);
    }
  };

  const suggestions = ['¿Cómo bajo los talones?', '¿Qué ejercicios hago para reunir?', '¿Cómo corrijo la rectitud en la diagonal?'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.nav }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={{ fontSize: 20, color: colors.m40 }}>‹</Text>
        </Pressable>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 17 }}>🎓</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', fontSize: 14, color: colors.ink }}>{t('entrenadorIA')}</Text>
          <Text style={{ fontSize: 11, color: colors.good }}>{t('enLinea')}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isCoach = item.role === 'coach';
            return (
              <View
                style={{
                  maxWidth: '80%',
                  alignSelf: isCoach ? 'flex-start' : 'flex-end',
                  backgroundColor: isCoach ? colors.surface : colors.accent,
                  borderRadius: 16,
                  borderTopLeftRadius: isCoach ? 4 : 16,
                  borderTopRightRadius: isCoach ? 16 : 4,
                  padding: 12,
                }}
              >
                <Text style={{ color: isCoach ? colors.ink : '#fff', fontSize: 13, lineHeight: 18 }}>{item.text}</Text>
              </View>
            );
          }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: colors.bg, paddingTop: 8, paddingHorizontal: 14 }} contentContainerStyle={{ gap: 8 }}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => send(s)}
              style={{ borderWidth: 1, borderColor: 'rgba(192,95,58,0.35)', backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 13 }}
            >
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingBottom: 24, backgroundColor: colors.bg }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('escribePregunta')}
            placeholderTextColor={colors.m45}
            onSubmitEditing={() => send(input)}
            style={{ flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 16, color: colors.ink, fontSize: 13 }}
          />
          <Pressable
            onPress={() => send(input)}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 17 }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
