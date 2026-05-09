import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import HapticFeedback from 'react-native-haptic-feedback';
import { useChatStore, useModelStore } from '../store';
import { sendMessage, isGenerating, cancelGeneration } from '../services/chatEngine';
import {
  destroyVoice,
  speak,
  startListening,
  stopListening,
  stopSpeaking,
} from '../services/voice';
import { AudioWaveform } from '../components/AudioWaveform';
import { colors, radii, spacing } from '../theme/colors';
import { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Voice'>;
type Route = RouteProp<RootStackParamList, 'Voice'>;

type Stage = 'idle' | 'listening' | 'thinking' | 'speaking';

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone access',
      message: 'ArcanAI needs microphone access for voice mode.',
      buttonPositive: 'OK',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function VoiceScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { conversationId } = route.params;

  const conversation = useChatStore(s => s.conversations.find(c => c.id === conversationId));
  const model = useModelStore(s =>
    s.models.find(m => m.id === (conversation?.modelId ?? s.selectedModelId)),
  );

  const [stage, setStage] = useState<Stage>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [level, setLevel] = useState(0);
  const finalizingRef = useRef(false);

  const stop = useCallback(async () => {
    await stopListening();
    await stopSpeaking();
    await cancelGeneration();
    setStage('idle');
  }, []);

  useEffect(() => {
    return () => {
      stop();
      destroyVoice();
    };
  }, [stop]);

  const handleFinal = useCallback(
    async (text: string) => {
      if (finalizingRef.current) return;
      finalizingRef.current = true;
      try {
        await stopListening();
        if (!text.trim()) {
          setStage('idle');
          return;
        }
        if (!model) {
          Alert.alert('No model', 'Select a model first.');
          setStage('idle');
          return;
        }
        setStage('thinking');
        let acc = '';
        await sendMessage({
          conversationId,
          model,
          userInput: text,
          onAssistantToken: t => {
            acc = t;
            setReply(t);
          },
        });
        setStage('speaking');
        await speak(acc);
        setStage('idle');
      } catch (err: any) {
        Alert.alert('Voice error', err?.message ?? String(err));
        setStage('idle');
      } finally {
        finalizingRef.current = false;
      }
    },
    [conversationId, model],
  );

  const onPressMic = async () => {
    if (stage !== 'idle') {
      await stop();
      return;
    }
    const ok = await ensureMicPermission();
    if (!ok) {
      Alert.alert('Permission denied', 'Microphone access is required for voice mode.');
      return;
    }
    HapticFeedback.trigger('impactMedium');
    setTranscript('');
    setReply('');
    setStage('listening');
    try {
      await startListening('en-US', {
        onPartial: t => setTranscript(t),
        onFinal: handleFinal,
        onError: msg => {
          if (isGenerating()) return;
          Alert.alert('Listening error', msg);
          setStage('idle');
        },
        onVolume: v => setLevel(Math.max(0, Math.min(1, (v + 2) / 12))),
      });
    } catch (err: any) {
      Alert.alert('Could not start listening', err?.message ?? String(err));
      setStage('idle');
    }
  };

  const stageLabel = {
    idle: 'Tap to talk',
    listening: 'Listening…',
    thinking: 'Thinking…',
    speaking: 'Speaking…',
  }[stage];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={12}>
          <Text style={styles.headerBtn}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Voice</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.stage}>{stageLabel}</Text>

        <AudioWaveform level={level} active={stage === 'listening'} />

        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>You</Text>
          <Text style={styles.transcriptText}>{transcript || '…'}</Text>
        </View>

        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>ArcanAI</Text>
          <Text style={styles.transcriptText}>{reply || '…'}</Text>
        </View>

        <Pressable
          onPress={onPressMic}
          style={[
            styles.micButton,
            stage !== 'idle' && { backgroundColor: colors.danger },
          ]}>
          <Text style={styles.micText}>{stage === 'idle' ? 'Tap to talk' : 'Stop'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBtn: { color: colors.accent, fontSize: 15, fontWeight: '600', width: 50 },
  headerTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  body: { flex: 1, padding: spacing.lg, gap: spacing.lg, alignItems: 'stretch' },

  stage: {
    color: colors.textDim,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  transcriptBox: {
    backgroundColor: colors.bgElev,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transcriptLabel: {
    color: colors.textDim,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  transcriptText: { color: colors.text, fontSize: 16, lineHeight: 22 },

  micButton: {
    marginTop: 'auto',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  micText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
