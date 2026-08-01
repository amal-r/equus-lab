import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'equus_lab_session_token';

/** Token de sesión guardado en Keychain (iOS) / Keystore (Android) vía expo-secure-store. */
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // no-op: puede que nunca se haya guardado
  }
}
