import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { VoiceScreen } from '../screens/VoiceScreen';
import { ManageModelsScreen } from '../screens/ManageModelsScreen';

export type RootStackParamList = {
  Home: undefined;
  Chat: { conversationId: string };
  Voice: { conversationId: string };
  ManageModels: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0D12' },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Voice" component={VoiceScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ManageModels" component={ManageModelsScreen} />
    </Stack.Navigator>
  );
}
