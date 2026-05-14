import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import HapticFeedback from 'react-native-haptic-feedback';
import { useChatStore } from '../shared';
import { useModelStore } from '../models';
import { MessageBubble } from './MessageBubble';
import { colors, glass, radii, spacing } from '../shared/theme';
import {
  cancelGeneration,
  ensureModelLoaded,
  isGenerating,
  sendMessage,
} from './chatEngine';
import { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Chat'>;
type Route = RouteProp<RootStackParamList, 'Chat'>;

const MAX_INPUT_CHARS = 4000;

export function ChatScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { conversationId } = route.params;

  const conversation = useChatStore(s => s.conversations.find(c => c.id === conversationId));
  const clearCurrent = useChatStore(s => s.clearCurrent);
  const truncateFromMessage = useChatStore(s => s.truncateFromMessage);
  const selectedModel = useModelStore(s =>
    s.models.find(m => m.id === (conversation?.modelId ?? s.selectedModelId)),
  );

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const listRef = useRef<FlatList<any>>(null);
  const inputRef = useRef<TextInput>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const onEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (busy || isGenerating() || !selectedModel) return;
    truncateFromMessage(conversationId, messageId);
    setBusy(true);
    try {
      await sendMessage({
        conversationId,
        model: selectedModel,
        userInput: newContent,
        onAssistantToken: () => scrollToEnd(),
      });
    } catch (err: any) {
      console.warn('sendMessage failed', err?.message ?? err);
    } finally {
      setBusy(false);
    }
  }, [busy, conversationId, selectedModel, truncateFromMessage, scrollToEnd]);

  useEffect(() => {
    if (selectedModel) {
      ensureModelLoaded(selectedModel).catch(err => {
        Alert.alert('Could not load model', err?.message ?? String(err));
      });
    }
  }, [selectedModel]);

  const messages = conversation?.messages ?? [];

  useEffect(scrollToEnd, [messages.length, scrollToEnd]);

  const onSend = async () => {
    if (!input.trim() || busy || isGenerating()) return;
    if (!selectedModel) {
      Alert.alert('No model selected', 'Pick a model on the home screen first.');
      return;
    }
    HapticFeedback.trigger('impactLight');
    let text = input;
    setInput('');
    setBusy(true);
    try {
      await sendMessage({
        conversationId,
        model: selectedModel,
        userInput: text,
        onAssistantToken: () => scrollToEnd(),
      });
    } catch (err: any) {
      console.warn('sendMessage failed', err?.message ?? err);
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async () => {
    await cancelGeneration();
    setBusy(false);
  };

  const onClear = () => {
    Alert.alert('Clear conversation?', 'All messages in this chat will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => clearCurrent(),
      },
    ]);
  };

  const headerTitle = useMemo(() => selectedModel?.displayName ?? 'No model', [selectedModel]);
  const canSend = input.trim().length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backArrow}>{'‹'}</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.statusDot} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
        </View>
        {messages.length > 0 ? (
          <Pressable onPress={onClear} hitSlop={12} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              onEdit={item.role === 'user' ? (content) => onEditMessage(item.id, content) : undefined}
            />
          )}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToEnd}
          ListEmptyComponent={<EmptyChat onSuggestion={(text) => {
            setInput(text);
            setTimeout(() => inputRef.current?.focus(), 100);
          }} />}
        />

        <View style={styles.inputWrapper}>
          <View style={[styles.inputGlass, focused && styles.inputGlassFocused]}>
            <View pointerEvents="none" style={styles.glassEdgeTop} />
            <View pointerEvents="none" style={styles.glassEdgeBottom} />
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Message ArcanAI..."
              placeholderTextColor={colors.textDim}
              style={styles.input}
              multiline
              editable={!busy}
              returnKeyType="default"
              maxLength={MAX_INPUT_CHARS}
            />
            {busy ? (
              <Pressable onPress={onCancel} style={styles.stopBtn}>
                <View style={styles.stopIcon} />
              </Pressable>
            ) : (
              <Pressable
                onPress={onSend}
                style={[styles.sendBtn, canSend && styles.sendBtnActive]}
                disabled={!canSend}>
                <Text style={[styles.sendArrow, !canSend && styles.sendArrowDim]}>{'↑'}</Text>
              </Pressable>
            )}
          </View>
          {input.length >= MAX_INPUT_CHARS * 0.9 && (
            <Text style={[
              styles.charCount,
              input.length >= MAX_INPUT_CHARS && styles.charCountLimit,
            ]}>
              {input.length} / {MAX_INPUT_CHARS}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const SUGGESTIONS: Array<{ label: string; prompt: string }> = [
  { label: 'Explain a concept', prompt: 'Explain how neural networks learn, in simple terms.' },
  { label: 'Brainstorm ideas', prompt: 'Give me 5 creative weekend project ideas.' },
  { label: 'Write something', prompt: 'Write a short poem about the ocean at night.' },
  { label: 'Plan & summarize', prompt: 'Help me plan a productive morning routine.' },
];

function EmptyChat({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <View style={styles.emptyChat}>
      <Image
        source={require('../../assets/clipped_logo.png')}
        style={styles.emptyLogo}
        resizeMode="contain"
      />
      <Text style={styles.emptyChatTitle}>How can I help?</Text>

      <View style={styles.suggestions}>
        {SUGGESTIONS.map((s, i) => (
          <Pressable
            key={i}
            onPress={() => onSuggestion(s.prompt)}
            style={({ pressed }) => [
              styles.suggestCard,
              pressed && styles.suggestPressed,
            ]}>
            <View pointerEvents="none" style={styles.glassEdgeTop} />
            <View pointerEvents="none" style={styles.glassEdgeBottom} />
            <View style={styles.suggestText}>
              <Text style={styles.suggestLabel}>{s.label}</Text>
              <Text style={styles.suggestPrompt} numberOfLines={2}>
                {s.prompt}
              </Text>
            </View>
            <View style={styles.suggestArrowWrap}>
              <Text style={styles.suggestArrow}>{'↗'}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.ok,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  clearBtnText: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '500',
  },

  listContent: { paddingVertical: spacing.md, flexGrow: 1 },

  charCount: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
    marginTop: 4,
  },
  charCountLimit: {
    color: colors.danger,
  },
  inputWrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  inputGlass: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: glass.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: glass.edge,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 6 : 2,
    gap: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  inputGlassFocused: {
    borderColor: 'rgba(138, 107, 255, 0.45)',
    backgroundColor: glass.surfaceHigh,
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
  },
  sendBtn: {
    width: Platform.OS === 'ios' ? 34 : 28,
    height: Platform.OS === 'ios' ? 34 : 28,
    borderRadius: Platform.OS === 'ios' ? 17 : 14,
    backgroundColor: glass.surfaceHigh,
    borderWidth: 1,
    borderColor: glass.edge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 3 : 0,
    alignSelf: 'center',
  },
  sendBtnActive: {
    backgroundColor: colors.accent,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  sendArrow: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 19 : 16,
    fontWeight: '700',
    marginTop: -1,
  },
  sendArrowDim: {
    color: colors.textDim,
  },
  stopBtn: {
    width: Platform.OS === 'ios' ? 34 : 28,
    height: Platform.OS === 'ios' ? 34 : 28,
    borderRadius: Platform.OS === 'ios' ? 17 : 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 3 : 0,
    alignSelf: 'center',
    shadowColor: colors.danger,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },

  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyLogo: {
    width: 160,
    height: 160,
    marginBottom: spacing.lg,
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  emptyChatTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    textShadowColor: 'rgba(138, 107, 255, 0.45)',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  suggestions: {
    width: '100%',
    maxWidth: 440,
    gap: 10,
  },
  suggestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glass.surface,
    borderWidth: 1,
    borderColor: glass.edge,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  suggestPressed: {
    backgroundColor: glass.accentTint,
    borderColor: 'rgba(138, 107, 255, 0.45)',
    transform: [{ scale: 0.985 }],
  },
  suggestText: {
    flex: 1,
  },
  suggestLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  suggestPrompt: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  suggestArrowWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: glass.accentTint,
    borderWidth: 1,
    borderColor: 'rgba(138, 107, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestArrow: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },

  glassEdgeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: glass.highlight,
  },
  glassEdgeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
});
