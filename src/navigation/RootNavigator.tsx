import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '../onboarding/OnboardingScreen';
import { HomeScreen } from '../home/HomeScreen';
import { ChatScreen } from '../chat/ChatScreen';
import { ManageModelsScreen } from '../models/ManageModelsScreen';
import { storage, KEYS } from '../shared/persistence';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Chat: { conversationId: string };
  ManageModels: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const hasOnboarded = storage.getBoolean(KEYS.onboardingDone) === true;

  return (
    <Stack.Navigator
      initialRouteName={hasOnboarded ? 'Home' : 'Onboarding'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0D12' },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ManageModels" component={ManageModelsScreen} />
    </Stack.Navigator>
  );
}
