import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import type { RootStackParamList } from './types';

import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import LoginScreen from '../screens/onboarding/LoginScreen';
import RegisterScreen from '../screens/onboarding/RegisterScreen';
import ForgotScreen from '../screens/onboarding/ForgotScreen';

import HomeScreen from '../screens/home/HomeScreen';
import SubirScreen from '../screens/upload/SubirScreen';
import ProcesandoScreen from '../screens/upload/ProcesandoScreen';
import ResultadoScreen from '../screens/upload/ResultadoScreen';
import ComparacionScreen from '../screens/upload/ComparacionScreen';

import ChatScreen from '../screens/chat/ChatScreen';
import ProgresoScreen from '../screens/progress/ProgresoScreen';

import ConcursosScreen from '../screens/shows/ConcursosScreen';
import VeredictoScreen from '../screens/shows/VeredictoScreen';

import PerfilScreen from '../screens/profile/PerfilScreen';
import EditarPerfilScreen from '../screens/profile/EditarPerfilScreen';
import NuevoCaballoScreen from '../screens/profile/NuevoCaballoScreen';

import AjustesMenuScreen from '../screens/settings/AjustesMenuScreen';
import AjustesNivelScreen from '../screens/settings/AjustesNivelScreen';
import AjustesNotifScreen from '../screens/settings/AjustesNotifScreen';
import AjustesSuscripcionScreen from '../screens/settings/AjustesSuscripcionScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const hasSession = useAppStore((s) => s.hasSession);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
      {!hasSession ? (
        <Stack.Group>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Forgot" component={ForgotScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Subir" component={SubirScreen} />
          <Stack.Screen name="Procesando" component={ProcesandoScreen} />
          <Stack.Screen name="Resultado" component={ResultadoScreen} />
          <Stack.Screen name="Comparacion" component={ComparacionScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Progreso" component={ProgresoScreen} />
          <Stack.Screen name="Concursos" component={ConcursosScreen} />
          <Stack.Screen name="Veredicto" component={VeredictoScreen} />
          <Stack.Screen name="Perfil" component={PerfilScreen} />
          <Stack.Screen name="EditarPerfil" component={EditarPerfilScreen} />
          <Stack.Screen name="NuevoCaballo" component={NuevoCaballoScreen} />
          <Stack.Screen name="AjustesMenu" component={AjustesMenuScreen} />
          <Stack.Screen name="AjustesNivel" component={AjustesNivelScreen} />
          <Stack.Screen name="AjustesNotif" component={AjustesNotifScreen} />
          <Stack.Screen name="AjustesSuscripcion" component={AjustesSuscripcionScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
