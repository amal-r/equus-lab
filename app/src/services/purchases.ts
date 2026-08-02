import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { PlanTier } from '../types/models';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

export const HAS_REVENUECAT = Platform.select({ ios: !!IOS_KEY, android: !!ANDROID_KEY, default: false });

/**
 * Los identificadores de "entitlement" que se crean en el dashboard de RevenueCat
 * (App Store Connect solo conoce Product IDs; RevenueCat los agrupa en estos
 * "entitlements", uno por nivel de plan). Deben coincidir exactamente con lo que
 * configures en RevenueCat.
 */
const ENTITLEMENT_TO_TIER: Record<string, Exclude<PlanTier, 'free'>> = {
  premium: 'premium',
  pro: 'pro',
  elite: 'elite',
};

let configured = false;

/** Llamar una vez al arrancar la app (ver App.tsx). No hace nada si no hay claves configuradas. */
export function configurePurchases(appUserID?: string) {
  if (configured || !HAS_REVENUECAT) return;
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  Purchases.configure({ apiKey, appUserID });
  configured = true;
}

export interface ActiveEntitlement {
  tier: Exclude<PlanTier, 'free'>;
  willRenew: boolean;
  expirationDate: string | null;
}

/** Deriva nuestro PlanTier a partir de los entitlements activos que devuelve RevenueCat. */
export function tierFromCustomerInfo(info: CustomerInfo): ActiveEntitlement | null {
  const active = info.entitlements.active;
  // Si el usuario tuviera más de un entitlement activo a la vez (no debería, son
  // mutuamente excluyentes dentro del mismo grupo de suscripción), nos quedamos
  // con el de mayor rango.
  const order: Exclude<PlanTier, 'free'>[] = ['elite', 'pro', 'premium'];
  for (const tier of order) {
    const key = Object.keys(ENTITLEMENT_TO_TIER).find((k) => ENTITLEMENT_TO_TIER[k] === tier);
    if (key && active[key]) {
      return { tier, willRenew: active[key].willRenew, expirationDate: active[key].expirationDate };
    }
  }
  return null;
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!HAS_REVENUECAT) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchase(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restore(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!HAS_REVENUECAT) return null;
  return Purchases.getCustomerInfo();
}

/**
 * Apple/Google no dejan que una app cancele una suscripción por API: el
 * usuario lo hace en la pantalla nativa de gestión de suscripciones. Esto
 * solo abre esa pantalla; el estado real se actualiza después vía el webhook
 * de RevenueCat (evento CANCELLATION) cuando el usuario confirme allí.
 */
export async function openManageSubscriptions(): Promise<void> {
  if (!HAS_REVENUECAT) return;
  await Purchases.showManageSubscriptions();
}

/** Identificador de producto tal y como se crea en App Store Connect / Google Play. */
export function productIdFor(tier: Exclude<PlanTier, 'free'>, ciclo: 'mensual' | 'anual'): string {
  return `com.equuslab.app.${tier}.${ciclo === 'anual' ? 'annual' : 'monthly'}`;
}
