import React, { useMemo } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BottomNav } from '../../components/BottomNav';
import { HorseAvatar } from '../../components/HorseAvatar';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { computeWeekStreak } from '../../utils/streak';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Perfil'>;

const LOGROS = [
  { icon: '🔥', name: 'Racha activa', minRacha: 2 },
  { icon: '🎯', name: 'Primer 8', minNota: 8 },
  { icon: '⚖️', name: '3 concursos', minVeredictos: 3 },
  { icon: '🏆', name: 'Nivel avanzado', minSesiones: 30 },
];

export default function PerfilScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors, radius } = useTheme();
  const rider = useAppStore((s) => s.rider);
  const horses = useAppStore((s) => s.horses);
  const analyses = useAppStore((s) => s.analyses);
  const veredictos = useAppStore((s) => s.veredictos);
  const deleteHorse = useAppStore((s) => s.deleteHorse);

  const racha = useMemo(() => computeWeekStreak(analyses.map((a) => a.fecha)), [analyses]);
  const notaMedia = analyses.length ? analyses.reduce((s, a) => s + a.nota, 0) / analyses.length : 0;
  const maxNota = analyses.length ? Math.max(...analyses.map((a) => a.nota)) : 0;
  const horasAnalizadas = Math.round((analyses.length * 2.5) / 60 * 10) / 10;

  const practicadas = Object.entries(rider.disciplinasPracticadas)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const confirmDelete = (id: string, nombre: string) => {
    Alert.alert('Eliminar caballo', `¿Seguro que quieres eliminar a ${nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteHorse(id) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: -6 }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>{t('nav')[3] ?? 'Perfil'}</Text>
          <Pressable
            onPress={() => navigation.navigate('AjustesMenu')}
            style={{ marginLeft: 'auto', backgroundColor: colors.surface, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 19 }}>⚙️</Text>
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <View style={{ width: 82, height: 82, borderRadius: 41, backgroundColor: colors.ph, borderWidth: 3, borderColor: colors.accent }} />
          <Text style={{ fontWeight: '800', fontSize: 20, color: colors.ink, marginTop: 12 }}>{rider.nombre}</Text>
          <Text style={{ fontSize: 12.5, color: colors.m55, marginTop: 2 }}>
            {rider.nivel} · {rider.edad} años · {rider.aniosMontando} {t('aniosMontando')}
          </Text>
          <Pressable
            onPress={() => navigation.navigate('EditarPerfil')}
            style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginTop: 12 }}
          >
            <Text style={{ fontWeight: '700', fontSize: 11.5, color: colors.ink }}>{t('editarPerfil')}</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 7, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <View style={{ backgroundColor: colors.chip, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 11 }}>🏅 {racha} semanas</Text>
            </View>
            {practicadas.map((p) => (
              <View key={p} style={{ backgroundColor: colors.tint, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 }}>
                <Text style={{ color: colors.good, fontWeight: '700', fontSize: 11 }}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, marginBottom: 22 }}>
          {[
            { v: analyses.length, l: t('sesiones') },
            { v: notaMedia ? notaMedia.toFixed(1).replace('.', ',') : '—', l: t('notaMedia'), accent: true },
            { v: veredictos.length, l: 'concursos' },
            { v: `${horasAnalizadas}h`, l: 'analizadas' },
          ].map((s, i, arr) => (
            <React.Fragment key={s.l}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 19, color: s.accent ? colors.accent : colors.ink }}>{s.v}</Text>
                <Text style={{ fontSize: 10, color: colors.m50, marginTop: 3 }}>{s.l}</Text>
              </View>
              {i < arr.length - 1 && <View style={{ width: 1, backgroundColor: colors.border }} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink, marginBottom: 11 }}>{t('misCaballos')}</Text>
        <View style={{ gap: 10, marginBottom: 22 }}>
          {horses.map((h) => (
            <View key={h.id} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <HorseAvatar tipo={h.tipo} />
              <Pressable onPress={() => navigation.navigate('NuevoCaballo', { editId: h.id })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: '700', fontSize: 13.5, color: colors.ink }}>{h.nombre}</Text>
                  <Text style={{ fontSize: 11, color: colors.m50 }} numberOfLines={1}>
                    {[h.raza ? `${h.tipo} ${h.raza}` : h.tipo, h.edad ? `${h.edad} años` : null, h.disciplina].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', fontSize: 15, color: colors.ink }}>{h.notaMedia ?? '—'}</Text>
                  <Text style={{ fontSize: 10, color: colors.m45 }}>{h.sesiones} sesiones</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => confirmDelete(h.id, h.nombre)} hitSlop={8}>
                <Text style={{ color: colors.m30, fontSize: 18 }}>✕</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() => navigation.navigate('NuevoCaballo')}
            style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 16, padding: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Text style={{ fontSize: 18, color: colors.m45 }}>＋</Text>
            <Text style={{ color: colors.m45, fontSize: 12.5, fontWeight: '600' }}>{t('anadirCaballo')}</Text>
          </Pressable>
        </View>

        <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink, marginBottom: 11 }}>{t('logros')}</Text>
        <View style={{ flexDirection: 'row', gap: 9, marginBottom: 22 }}>
          {LOGROS.map((l) => {
            const achieved =
              (l.minRacha !== undefined && racha >= l.minRacha) ||
              (l.minNota !== undefined && maxNota >= l.minNota) ||
              (l.minVeredictos !== undefined && veredictos.length >= l.minVeredictos) ||
              (l.minSesiones !== undefined && analyses.length >= l.minSesiones);
            return (
              <View
                key={l.name}
                style={{ flex: 1, backgroundColor: achieved ? colors.chip : colors.tint, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, opacity: achieved ? 1 : 0.5 }}
              >
                <Text style={{ fontSize: 22 }}>{l.icon}</Text>
                <Text style={{ fontSize: 9.5, fontWeight: '700', color: achieved ? colors.accent : colors.m45, textAlign: 'center' }}>{l.name}</Text>
              </View>
            );
          })}
        </View>

        <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink, marginBottom: 11 }}>{t('miObjetivo')}</Text>
        <View style={{ backgroundColor: colors.tint, borderRadius: 18, padding: 16, flexDirection: 'row', gap: 13, alignItems: 'center' }}>
          <Text style={{ fontSize: 24 }}>🎯</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: colors.ink }}>Nota media de 8 en doma</Text>
            <View style={{ height: 7, backgroundColor: '#d8e0d0', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, (notaMedia / 8) * 100)}%`, height: '100%', backgroundColor: colors.good, borderRadius: 4 }} />
            </View>
          </View>
        </View>
      </ScreenContainer>
      <BottomNav active="perfil" />
    </SafeAreaView>
  );
}
