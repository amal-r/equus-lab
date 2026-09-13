import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { Chip } from '../../components/Chip';
import { TintCard } from '../../components/TintCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { persistPickedFile } from '../../utils/persistMedia';
import { runMorphologyScan } from '../../services/morphologyService';
import { ensurePremiumIdentity } from '../../services/backendAccount';
import type { RootStackParamList } from '../../navigation/types';
import { MORPH_LIMITS, type MorphEscala, type MorphImages } from '../../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Morfologia'>;

const TOMAS: { key: keyof MorphImages; label: string; hint: string }[] = [
  { key: 'perfil', label: 'Perfil izquierdo', hint: 'Cuerpo entero, cámara a la altura de la cruz' },
  { key: 'frontal', label: 'Frontal', hint: 'De frente, aplomos visibles hasta el suelo' },
  { key: 'posterior', label: 'Posterior', hint: 'Desde atrás, para comparar grupa y muslos' },
];

export default function MorfologiaScreen({ navigation }: Props) {
  const { colors, radius } = useTheme();
  const horses = useAppStore((s) => s.horses);
  const scanHorseId = useAppStore((s) => s.scanHorseId);
  const setScanHorse = useAppStore((s) => s.setScanHorse);
  const scanImages = useAppStore((s) => s.scanImages);
  const setScanImage = useAppStore((s) => s.setScanImage);
  const clearScanImages = useAppStore((s) => s.clearScanImages);
  const planTier = useAppStore((s) => s.planTier);
  const canStartFreeScan = useAppStore((s) => s.canStartFreeScan);
  const registerScan = useAppStore((s) => s.registerScan);
  const addScan = useAppStore((s) => s.addScan);
  const rider = useAppStore((s) => s.rider);
  const backendUserId = useAppStore((s) => s.backendUserId);
  const setBackendUserId = useAppStore((s) => s.setBackendUserId);

  const [busyKey, setBusyKey] = useState<keyof MorphImages | null>(null);
  const [scanning, setScanning] = useState(false);
  const [hasVara, setHasVara] = useState(false);

  const selectedHorse = horses.find((h) => h.id === scanHorseId);
  const isFree = planTier === 'free';
  const allReady = TOMAS.every((t) => !!scanImages[t.key]);
  // Con qué se calibran las medidas en cm: la vara marcada por el jinete, o si
  // no, la alzada que ya tenga guardada el caballo en su ficha (ver PROMPT-
  // CAMARA-Y-AJUSTES.md -- sin ninguna de las dos, se ocultan los centímetros).
  const escala: MorphEscala = hasVara ? 'vara' : selectedHorse?.alzada ? 'alzada_ficha' : 'ninguna';

  const launch = async (key: keyof MorphImages, camera: boolean) => {
    setBusyKey(key);
    try {
      const perm = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permiso necesario',
          camera ? 'Necesito acceso a la cámara para hacer la foto.' : 'Necesito acceso a tu galería para elegir la foto.',
          [
            { text: 'Ahora no', style: 'cancel' },
            { text: 'Ir a Ajustes', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        // Copia a almacenamiento persistente: la URI del picker vive en la caché de la
        // app y se pierde al actualizar la app (ver persistMedia.ts), no solo al
        // reinstalarla -- si no, la foto dejaría de verse en el resultado del escaneo.
        const persistedUri = await persistPickedFile(result.assets[0].uri, 'jpg');
        setScanImage(key, persistedUri);
      }
    } finally {
      setBusyKey(null);
    }
  };

  const startScan = async () => {
    if (!selectedHorse) {
      Alert.alert('Falta el caballo', 'Elige a qué caballo pertenecen las fotos.');
      return;
    }
    if (!allReady) return;
    const isPremium = !isFree;
    if (!isPremium && !canStartFreeScan()) {
      Alert.alert(
        'Ya usaste tu escaneo gratis de este mes',
        `El plan gratis incluye ${MORPH_LIMITS.scansPorMesGratis} escaneo morfológico al mes. Pásate a Premium para escanear más veces.`,
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Ver planes', onPress: () => navigation.navigate('AjustesSuscripcion') },
        ]
      );
      return;
    }
    setScanning(true);
    try {
      if (isPremium) await ensurePremiumIdentity(rider, backendUserId, setBackendUserId);
      const scan = await runMorphologyScan({
        images: scanImages,
        caballo: selectedHorse.nombre,
        horseId: selectedHorse.id,
        escala,
        isPremium,
      });
      if (!isPremium) registerScan();
      addScan(scan);
      clearScanImages();
      navigation.replace('MorfologiaResultado', { scanId: scan.id });
    } catch {
      Alert.alert('No se pudo completar el escaneo', 'Inténtalo de nuevo en unos minutos.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title="Escaneo morfológico" onBack={() => navigation.goBack()} />

        <Text style={{ fontWeight: '800', fontSize: 13, color: colors.ink, marginBottom: 9 }}>Caballo</Text>
        <View style={{ flexDirection: 'row', gap: 9, flexWrap: 'wrap', marginBottom: 20 }}>
          {horses.map((h) => (
            <Chip key={h.id} label={h.nombre} active={scanHorseId === h.id} onPress={() => setScanHorse(h.id)} />
          ))}
        </View>

        <Text style={{ fontWeight: '800', fontSize: 13, color: colors.ink, marginBottom: 9 }}>Las 3 tomas</Text>
        <View style={{ gap: 12, marginBottom: 18 }}>
          {TOMAS.map((toma) => {
            const uri = scanImages[toma.key];
            const busy = busyKey === toma.key;
            return (
              <View
                key={toma.key}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  padding: 12,
                  borderWidth: uri ? 1.5 : 1,
                  borderColor: uri ? colors.good : colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 10 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: colors.ph, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                    {busy ? (
                      <ActivityIndicator color={colors.accent} />
                    ) : uri ? (
                      <Image source={{ uri }} style={{ width: 56, height: 56 }} />
                    ) : (
                      <Text style={{ fontSize: 20 }}>📷</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 13.5, color: colors.ink }}>{toma.label}</Text>
                    <Text style={{ fontSize: 11, color: colors.m50, marginTop: 2, lineHeight: 15 }}>{toma.hint}</Text>
                  </View>
                  {uri && (
                    <View style={{ backgroundColor: colors.good, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 9 }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 10.5 }}>Lista ✓</Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => launch(toma.key, true)}
                    disabled={busy}
                    style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 9 }}
                  >
                    <Text style={{ fontSize: 13 }}>📷</Text>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Cámara</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => launch(toma.key, false)}
                    disabled={busy}
                    style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chip, borderRadius: 12, paddingVertical: 9 }}
                  >
                    <Text style={{ fontSize: 13 }}>🖼️</Text>
                    <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 12 }}>Galería</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        <TintCard style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: '800', fontSize: 12, color: colors.good, marginBottom: 6 }}>📐 Para un buen encuadre</Text>
          <Text style={{ fontSize: 12, lineHeight: 17, color: colors.ink }}>
            Caballo parado y cuadrado, sobre suelo llano, con luz lateral uniforme. Si incluyes una vara o palo de altura
            conocida junto al caballo, la IA puede calibrar las medidas en centímetros reales.
          </Text>
        </TintCard>

        <Pressable
          onPress={() => setHasVara((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, marginBottom: 20 }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              borderWidth: 1.5,
              borderColor: hasVara ? colors.accent : colors.border,
              backgroundColor: hasVara ? colors.accent : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {hasVara && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
          </View>
          <Text style={{ fontSize: 12.5, color: colors.ink, flex: 1 }}>He incluido una vara de referencia en las fotos</Text>
        </Pressable>

        {!hasVara && escala === 'alzada_ficha' && (
          <Text style={{ fontSize: 10.5, color: colors.m50, marginTop: -12, marginBottom: 20, paddingHorizontal: 4 }}>
            Sin vara, se usará la alzada guardada en la ficha de {selectedHorse?.nombre} para calcular los centímetros.
          </Text>
        )}
        {!hasVara && escala === 'ninguna' && (
          <Text style={{ fontSize: 10.5, color: colors.m50, marginTop: -12, marginBottom: 20, paddingHorizontal: 4 }}>
            Sin vara ni alzada guardada, el resultado mostrará proporciones y ángulos, sin centímetros.
          </Text>
        )}

        <Text style={{ fontSize: 11, color: colors.m45, textAlign: 'center', marginBottom: 14 }}>
          {isFree
            ? `${MORPH_LIMITS.scansPorMesGratis} escaneo al mes en el plan gratis · mensual en Premium`
            : `Hasta ${MORPH_LIMITS.scansPorMesPremium} escaneos al mes en tu plan`}
        </Text>

        <PrimaryButton
          label={scanning ? 'Escaneando…' : 'Escanear morfología'}
          onPress={startScan}
          loading={scanning}
          disabled={!allReady || !selectedHorse}
        />
      </ScreenContainer>
    </SafeAreaView>
  );
}
