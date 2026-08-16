import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PurchasesOffering } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BackHeader } from '../../components/BackHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useT } from '../../i18n/useT';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { PLAN_DEFS, PlanTier } from '../../types/models';
import {
  HAS_REVENUECAT,
  getOfferings,
  openManageSubscriptions,
  productIdFor,
  purchase,
  purchaseExtraPack,
  restore,
  tierFromCustomerInfo,
} from '../../services/purchases';
import { notifyBackendOfExtraPack, notifyBackendOfPurchase } from '../../services/subscriptionService';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AjustesSuscripcion'>;

const TIERS: Exclude<PlanTier, 'free'>[] = ['premium', 'pro', 'elite'];

/**
 * Precios de referencia SOLO para el fallback sin tienda conectada (demo/dev).
 * Cuando hay una compra real, el precio y la moneda los decide Apple/Google según
 * la región de la cuenta del usuario — eso no se puede forzar desde la app.
 */
const USD_FALLBACK: Record<Exclude<PlanTier, 'free'>, { mensual: number; anual: number }> = {
  premium: { mensual: 8.99, anual: 89.9 },
  pro: { mensual: 17.99, anual: 179.99 },
  elite: { mensual: 29.99, anual: 299.99 },
};

function formatEUR(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} €`;
}
function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function AjustesSuscripcionScreen({ navigation }: Props) {
  const { t, lang } = useT();
  const { colors, radius } = useTheme();
  const planTier = useAppStore((s) => s.planTier);
  const ciclo = useAppStore((s) => s.ciclo);
  const setCiclo = useAppStore((s) => s.setCiclo);
  const subEstado = useAppStore((s) => s.subEstado);
  const usoMin = useAppStore((s) => s.usoMin);
  const usoTotal = useAppStore((s) => s.usoTotal);
  const subscribe = useAppStore((s) => s.subscribe);
  const cancelSubscription = useAppStore((s) => s.cancelSubscription);
  const reactivateSubscription = useAppStore((s) => s.reactivateSubscription);
  const buyExtraPack = useAppStore((s) => s.buyExtraPack);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [busy, setBusy] = useState<'purchase' | 'restore' | 'pack' | null>(null);
  // Plan que el usuario está MIRANDO en esta pantalla (no el que tiene contratado).
  // Nunca debe escribirse en el store hasta que se confirme la compra en subscribe():
  // de lo contrario, sólo con tocar una tarjeta para comparar precios ya se
  // desbloquearían las funciones Premium en el resto de la app sin haber pagado.
  const [previewTier, setPreviewTier] = useState<Exclude<PlanTier, 'free'>>(planTier !== 'free' ? planTier : 'premium');

  // Se vuelve a pedir cada vez que entras a la pantalla (no solo la primera vez que
  // se monta) — el catálogo de precios de StoreKit a veces cachea una región
  // distinta a la que luego usa la hoja de compra real; reintentarlo al reabrir
  // ayuda a que se refresque con la región correcta de la cuenta.
  useFocusEffect(
    useCallback(() => {
      if (HAS_REVENUECAT) {
        getOfferings()
          .then(setOffering)
          .catch(() => setOffering(null));
      }
    }, [])
  );

  const isAnual = ciclo === 'anual';
  // Mientras hay una suscripción activa, el precio grande de abajo refleja el plan
  // REALMENTE contratado; si aún estás en gratis, refleja el plan que previsualizas.
  const selDef = subEstado !== 'gratis' && planTier !== 'free' ? PLAN_DEFS[planTier] : PLAN_DEFS[previewTier];
  const usoPct = usoTotal > 0 ? Math.min(100, Math.round((usoMin / usoTotal) * 100)) : 0;
  const usoAviso = usoTotal > 0 && usoMin / usoTotal >= 0.8;
  const usoColor = usoAviso ? colors.warn : colors.accent;

  const packageFor = (tier: Exclude<PlanTier, 'free'>, c: 'mensual' | 'anual') => {
    if (!offering) return null;
    const id = productIdFor(tier, c);
    return offering.availablePackages.find((p) => p.product.identifier === id) ?? null;
  };
  const priceFor = (tier: Exclude<PlanTier, 'free'>) => {
    const pkg = packageFor(tier, ciclo);
    if (pkg) return pkg.product.priceString;
    // Sin tienda conectada: fallback local que sí respeta el idioma de la app
    // (una compra real muestra la moneda que decida Apple/Google según la
    // región de la cuenta, eso no se puede elegir desde aquí).
    if (lang === 'en') return formatUSD(USD_FALLBACK[tier][isAnual ? 'anual' : 'mensual']);
    const def = PLAN_DEFS[tier];
    return formatEUR(isAnual ? def.precioAnual : def.precioMensual);
  };

  const handleSubscribe = async () => {
    if (!HAS_REVENUECAT) {
      // Sin claves de RevenueCat configuradas: simulación local para poder
      // demostrar el flujo (ver app/.env.example).
      subscribe(previewTier);
      return;
    }
    const pkg = packageFor(previewTier, ciclo);
    if (!pkg) {
      Alert.alert(
        'Plan no disponible todavía',
        `No encuentro el producto "${productIdFor(previewTier, ciclo)}" en el offering de RevenueCat. Comprueba que existe en App Store Connect / Google Play y que está enlazado en RevenueCat.`
      );
      return;
    }
    setBusy('purchase');
    try {
      const info = await purchase(pkg);
      const ent = tierFromCustomerInfo(info);
      if (ent) {
        subscribe(ent.tier);
        void notifyBackendOfPurchase(info.originalAppUserId);
      }
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert('No se pudo completar la compra', err?.message ?? 'Inténtalo de nuevo en unos minutos.');
      }
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    if (!HAS_REVENUECAT) {
      Alert.alert('Sin tienda conectada', 'Esta compilación no tiene RevenueCat configurado todavía.');
      return;
    }
    setBusy('restore');
    try {
      const info = await restore();
      const ent = tierFromCustomerInfo(info);
      if (ent) {
        subscribe(ent.tier);
        void notifyBackendOfPurchase(info.originalAppUserId);
        Alert.alert('Compra restaurada', `Tienes ${PLAN_DEFS[ent.tier].nombre} activo.`);
      } else {
        Alert.alert('Nada que restaurar', 'No encontramos ninguna suscripción activa para tu cuenta de la tienda.');
      }
    } catch (err: any) {
      Alert.alert('No se pudo restaurar', err?.message ?? 'Inténtalo de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const handleBuyExtraPack = async () => {
    if (!HAS_REVENUECAT) {
      // Sin RevenueCat configurado: simulación local, igual que el resto de compras.
      buyExtraPack();
      return;
    }
    setBusy('pack');
    try {
      await purchaseExtraPack();
      buyExtraPack();
      void notifyBackendOfExtraPack();
      Alert.alert('Pack añadido', 'Se han sumado 100 minutos a tu cuota de este mes.');
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert('No se pudo completar la compra', err?.message ?? 'Inténtalo de nuevo en unos minutos.');
      }
    } finally {
      setBusy(null);
    }
  };

  const handleCancelPress = async () => {
    if (HAS_REVENUECAT) {
      // Apple/Google no permiten cancelar por API: abrimos la pantalla nativa de
      // gestión de suscripciones. El estado se actualizará solo cuando llegue el
      // webhook de RevenueCat (evento CANCELLATION) tras confirmar allí.
      await openManageSubscriptions();
      return;
    }
    setConfirmCancel(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenContainer>
        <BackHeader title={t('suscripcion')} onBack={() => navigation.goBack()} />

        <View style={{ backgroundColor: '#26221d', borderRadius: radius.xxl, padding: 22, marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 20 }}>⭐</Text>
            <Text style={{ fontWeight: '800', fontSize: 18, color: '#faf7f2' }}>{t('equusLabPremium')}</Text>
          </View>

          {subEstado === 'gratis' && (
            <Text style={{ fontSize: 12, color: 'rgba(250,247,242,0.6)', marginBottom: 16 }}>{t('planGratuitoDesc')}</Text>
          )}

          {subEstado !== 'gratis' && (
            <>
              <Text style={{ fontSize: 12, color: 'rgba(250,247,242,0.6)', marginBottom: 16 }}>
                {isAnual ? `${t('anual')} · ${t('ahorro20')}` : `${t('mensual')} · ${selDef.nombre}`}
              </Text>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 }}>
                  <Text style={{ fontWeight: '800', fontSize: 12, color: '#faf7f2' }}>{t('usoDeEsteMes')}</Text>
                  <Text style={{ marginLeft: 'auto', fontWeight: '700', fontSize: 12, color: usoColor }}>
                    {usoMin} / {usoTotal} min
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 5, overflow: 'hidden' }}>
                  <View style={{ width: `${usoPct}%`, height: '100%', backgroundColor: usoColor, borderRadius: 5 }} />
                </View>
                <Text style={{ fontSize: 11, color: 'rgba(250,247,242,0.55)', marginTop: 8, lineHeight: 15 }}>
                  {usoAviso ? t('usoAvisoMsg') : t('usoNormalMsg', { min: usoTotal })}
                </Text>
              </View>
              {subEstado === 'activa' && (
                <Pressable
                  onPress={handleBuyExtraPack}
                  disabled={busy === 'pack'}
                  style={{ backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 16, opacity: busy === 'pack' ? 0.7 : 1 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12.5 }}>{busy === 'pack' ? 'Comprando…' : t('comprarPack')}</Text>
                </Pressable>
              )}
            </>
          )}

          <View style={{ gap: 9 }}>
            {[t('caracteristicaJuez'), t('caracteristicaComparacion'), t('caracteristicaChat')].map((f) => (
              <View key={f} style={{ flexDirection: 'row', gap: 9 }}>
                <Text style={{ color: colors.accent }}>✓</Text>
                <Text style={{ fontSize: 12.5, color: '#faf7f2', flex: 1 }}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={{ fontWeight: '800', fontSize: 13.5, color: colors.ink, marginBottom: 11 }}>{t('eligeTuPlan')}</Text>
        <View style={{ flexDirection: 'row', gap: 6, backgroundColor: colors.tint, borderRadius: 14, padding: 4, marginBottom: 14 }}>
          {(['mensual', 'anual'] as const).map((c) => {
            const on = ciclo === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCiclo(c)}
                style={{
                  flex: 1,
                  borderRadius: 11,
                  paddingVertical: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: on ? colors.surface : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: on ? '800' : '600', color: on ? colors.ink : colors.m55 }}>{t(c)}</Text>
                {c === 'anual' && (
                  <View style={{ backgroundColor: colors.accent, borderRadius: 20, paddingVertical: 2, paddingHorizontal: 7 }}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 9 }}>−20%</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 10, marginBottom: 18 }}>
          {TIERS.map((id) => {
            const def = PLAN_DEFS[id];
            const on = (subEstado !== 'gratis' ? planTier : previewTier) === id;
            const price = priceFor(id);
            return (
              <Pressable
                key={id}
                onPress={() => setPreviewTier(id)}
                style={{
                  borderRadius: radius.xl,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 13,
                  backgroundColor: on ? '#26221d' : colors.surface,
                  borderWidth: on ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontWeight: '800', fontSize: 14.5, color: on ? '#faf7f2' : colors.ink }}>{def.nombre}</Text>
                    {id === 'pro' && (
                      <View style={{ backgroundColor: colors.accent, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 9 }}>POPULAR</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 11.5, color: on ? 'rgba(250,247,242,0.6)' : colors.m55, marginTop: 3 }}>
                    {def.minMes} min/mes · vídeos hasta {def.clipMaxMin} min
                  </Text>
                  {isAnual && <Text style={{ fontSize: 10.5, color: on ? '#e79877' : colors.accent, marginTop: 4, fontWeight: '700' }}>{t('ahorro20')}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: on ? '#faf7f2' : colors.ink }}>{price}</Text>
                  <Text style={{ fontSize: 10, color: on ? 'rgba(250,247,242,0.6)' : colors.m55 }}>{isAnual ? '/ año' : '/ mes'}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {subEstado === 'gratis' && (
          <>
            <PrimaryButton
              label={t('suscribirme', { plan: selDef.nombre, precio: priceFor(previewTier) })}
              onPress={handleSubscribe}
              loading={busy === 'purchase'}
              style={{ marginBottom: 8 }}
            />
            <Text style={{ textAlign: 'center', fontSize: 11, color: colors.m50, lineHeight: 16, marginBottom: 14 }}>{t('cobroTiendaNota')}</Text>
          </>
        )}

        {subEstado === 'activa' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
              <Text style={{ fontWeight: '800', fontSize: 26, color: colors.ink }}>{priceFor(planTier !== 'free' ? planTier : previewTier)}</Text>
              <Text style={{ fontSize: 12, color: colors.m50 }}>{isAnual ? '/ año' : '/ mes'}</Text>
            </View>
            {!HAS_REVENUECAT && (
              <PrimaryButton
                label={isAnual ? t('volverMensual') : t('cambiarAnual')}
                onPress={() => setCiclo(isAnual ? 'mensual' : 'anual')}
                style={{ marginBottom: 10 }}
              />
            )}
            {confirmCancel ? (
              <View style={{ backgroundColor: '#f7ece7', borderRadius: 14, padding: 15 }}>
                <Text style={{ fontSize: 12.5, lineHeight: 18, color: '#26221d', marginBottom: 12 }}>{t('seguroCancelar')}</Text>
                <View style={{ flexDirection: 'row', gap: 9 }}>
                  <PrimaryButton label={t('seguirPremium')} onPress={() => setConfirmCancel(false)} variant="outline" style={{ flex: 1 }} />
                  <Pressable
                    onPress={() => {
                      cancelSubscription();
                      setConfirmCancel(false);
                    }}
                    style={{ flex: 1, backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>{t('siCancelar')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={handleCancelPress} style={{ paddingVertical: 8, alignItems: 'center' }}>
                <Text style={{ color: colors.m40, fontWeight: '600', fontSize: 12.5 }}>{t('cancelarSuscripcion')}</Text>
              </Pressable>
            )}
          </>
        )}

        {subEstado === 'cancelada' && (
          <>
            <View style={{ backgroundColor: '#f7ece7', borderRadius: radius.xl, padding: 16, marginBottom: 14, flexDirection: 'row', gap: 12 }}>
              <Text style={{ fontSize: 20 }}>ℹ️</Text>
              <Text style={{ fontSize: 12.5, lineHeight: 18, color: '#26221d', flex: 1 }}>{t('suscripcionCancelada')}</Text>
            </View>
            <PrimaryButton label={t('reactivarPremium')} onPress={reactivateSubscription} style={{ marginBottom: 14 }} />
          </>
        )}

        <Pressable onPress={handleRestore} style={{ paddingVertical: 10, alignItems: 'center' }} disabled={busy === 'restore'}>
          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 12.5 }}>
            {busy === 'restore' ? 'Restaurando…' : 'Restaurar compras'}
          </Text>
        </Pressable>
      </ScreenContainer>
    </SafeAreaView>
  );
}
