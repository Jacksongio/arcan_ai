import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
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
import { colors, radii, spacing } from '../shared/theme';
import {
  cancelGeneration,
  ensureModelLoaded,
  isGenerating,
  sendMessage,
} from './chatEngine';
import { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Chat'>;
type Route = RouteProp<RootStackParamList, 'Chat'>;

export function ChatScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { conversationId } = route.params;

  const conversation = useChatStore(s => s.conversations.find(c => c.id === conversationId));
  const clearCurrent = useChatStore(s => s.clearCurrent);
  const selectedModel = useModelStore(s =>
    s.models.find(m => m.id === (conversation?.modelId ?? s.selectedModelId)),
  );

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<any>>(null);

  useEffect(() => {
    if (selectedModel) {
      ensureModelLoaded(selectedModel).catch(err => {
        Alert.alert('Could not load model', err?.message ?? String(err));
      });
    }
  }, [selectedModel]);

  const messages = conversation?.messages ?? [];

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(scrollToEnd, [messages.length, scrollToEnd]);

  const onSend = async () => {
    if (!input.trim() || busy || isGenerating()) return;
    if (!selectedModel) {
      Alert.alert('No model selected', 'Pick a model on the home screen first.');
      return;
    }
    HapticFeedback.trigger('impactLight');
    const text = input;
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
      // already written into the bubble as [error: ...]
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

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={12}>
          <Text style={styles.headerBtn}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToEnd}
          ListEmptyComponent={<EmptyChat />}
        />

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            multiline
            editable={!busy}
          />
          {busy ? (
            <Pressable onPress={onCancel} style={[styles.sendBtn, { backgroundColor: colors.danger }]}>
              <Text style={styles.sendBtnText}>Stop</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onSend}
              style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]}
              disabled={!input.trim()}>
              <Text style={styles.sendBtnText}>Send</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.footerRow}>
          <Pressable onPress={onClear}>
            <Text style={styles.footerLink}>Clear</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmptyChat() {
  return (
    <View style={styles.emptyChat}>
      <Text style={styles.emptyChatTitle}>Start the conversation</Text>
      <Text style={styles.emptyChatBody}>
        All inference happens on your device. Nothing is sent to the cloud.
      </Text>
    </View>
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
    gap: spacing.md,
  },
  headerBtn: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  headerTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  listContent: { paddingVertical: spacing.md, flexGrow: 1 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 140,
    backgroundColor: colors.bgInput,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    fontSize: 16,
  },
  sendBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    minWidth: 72,
    alignItems: 'center',
  },
  sendBtnText: { color: '#FFFFFF', fontWeight: '700' },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  footerLink: { color: colors.textDim, fontSize: 13 },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyChatTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  emptyChatBody: { color: colors.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
