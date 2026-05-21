import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import HapticFeedback from 'react-native-haptic-feedback';
import { Message } from '../shared/types';
import { colors, glass, radii, spacing } from '../shared/theme';
import { CheckIcon, CopyIcon, PencilIcon } from '../shared/icons';
import { MarkdownText } from './MarkdownText';

interface Props {
  message: Message;
  onEdit?: (newContent: string) => void;
}

export function MessageBubble({ message, onEdit }: Props) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);

  const onCopy = () => {
    Clipboard.setString(message.content);
    HapticFeedback.trigger('impactLight');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const startEdit = () => {
    setDraft(message.content);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft('');
  };

  const submitEdit = () => {
    const trimmed = draft.trim();
    if (!trimmed || !onEdit) return;
    setEditing(false);
    setDraft('');
    HapticFeedback.trigger('impactLight');
    onEdit(trimmed);
  };

  const showActions = !message.isStreaming && message.content.length > 0 && !editing;

  if (isUser && editing) {
    return (
      <View style={[styles.row, styles.rowEnd]}>
        <View style={styles.editCol}>
          <View style={styles.editBubble}>
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              style={styles.editInput}
              multiline
              autoFocus
            />
          </View>
          <View style={styles.editActions}>
            <Pressable onPress={cancelEdit} hitSlop={6} style={styles.editCancelBtn}>
              <Text style={styles.editCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submitEdit}
              disabled={!draft.trim()}
              style={[styles.editSendBtn, !draft.trim() && styles.editSendDisabled]}>
              <Text style={styles.editSendText}>Resend</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, isUser ? styles.rowEnd : styles.rowStart]}>
      <View style={[styles.bubbleCol, !isUser && !message.isStreaming && styles.bubbleColAssistant]}>
        <Pressable
          onLongPress={onCopy}
          style={({ pressed }) => [
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
            pressed && styles.pressed,
          ]}>
          <View pointerEvents="none" style={styles.bubbleHighlight} />

          {isUser ? (
            <Text style={styles.userText} selectable>
              {message.content}
            </Text>
          ) : message.isStreaming ? (
            <ThinkingIndicator />
          ) : (
            <MarkdownText content={message.content} />
          )}
        </Pressable>
        {showActions && (
          <View style={[styles.actionRow, isUser && styles.actionRowEnd]}>
            {isUser && onEdit && (
              <Pressable onPress={startEdit} hitSlop={6} style={styles.actionBtn}>
                <PencilIcon size={13} color={colors.textDim} />
              </Pressable>
            )}
            <Pressable onPress={onCopy} hitSlop={6} style={styles.actionBtn}>
              {copied ? (
                <CheckIcon size={14} color={colors.ok} />
              ) : (
                <CopyIcon size={14} color={colors.textDim} />
              )}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const THINKING_WORDS = [
  'Fuzzwuzzling',
  'Cogitating',
  'Rumbling neurons',
  'Herding photons',
  'Wrangling tokens',
  'Percolating thoughts',
  'Tickling synapses',
  'Consulting the void',
  'Untangling logic',
  'Simmering ideas',
  'Juggling qubits',
  'Whispering to silicon',
  'Aligning stars',
  'Brewing brilliance',
  'Poking the matrix',
];

function ThinkingIndicator() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * THINKING_WORDS.length));
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const cycle = () => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setIndex(prev => (prev + 1) % THINKING_WORDS.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
    };
    const interval = setInterval(cycle, 2000);
    return () => clearInterval(interval);
  }, [fadeAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 2,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 2],
    outputRange: [-80, 200],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [-1, 0, 1, 2],
    outputRange: [0, 0.6, 0.6, 0],
  });

  return (
    <View style={styles.thinkingTextWrap}>
      <Animated.Text style={[styles.thinkingText, { opacity: fadeAnim }]}>
        {THINKING_WORDS[index]}...
      </Animated.Text>
      <Animated.Text
        style={[
          styles.thinkingTextHighlight,
          { opacity: fadeAnim },
        ]}>
        <Animated.Text
          style={{
            opacity: shimmerOpacity,
          }}>
          {THINKING_WORDS[index]}...
        </Animated.Text>
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.md,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  rowStart: { justifyContent: 'flex-start' },
  rowEnd: { justifyContent: 'flex-end' },

  bubbleCol: {
    maxWidth: '85%',
  },
  bubbleColAssistant: {
    width: '85%',
  },
  bubble: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  bubbleHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  bubbleUser: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    borderBottomRightRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignSelf: 'flex-end',
  },
  bubbleAssistant: {
    backgroundColor: glass.surface,
    borderRadius: radii.lg,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: glass.edge,
  },
  pressed: { opacity: 0.85 },

  userText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
  },
  thinkingTextWrap: {
    position: 'relative',
  },
  thinkingText: {
    color: colors.accent,
    fontSize: 13,
    fontStyle: 'italic',
  },
  thinkingTextHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    fontSize: 13,
    fontStyle: 'italic',
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 5,
    gap: 12,
  },
  actionRowEnd: {
    justifyContent: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: 4,
    paddingVertical: 3,
  },

  editCol: {
    maxWidth: '85%',
    width: '85%',
    alignItems: 'flex-end',
  },
  editBubble: {
    width: '100%',
    backgroundColor: colors.bgElev,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  editInput: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    minHeight: 36,
    maxHeight: 160,
    padding: 0,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  editCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editCancelText: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  editSendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  editSendDisabled: {
    opacity: 0.4,
  },
  editSendText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
