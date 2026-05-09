import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Message } from '../shared/types';
import { colors, radii, spacing } from '../shared/theme';
import { MarkdownText } from './MarkdownText';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  const onLongPress = () => {
    Clipboard.setString(message.content);
  };

  return (
    <View style={[styles.row, isUser ? styles.rowEnd : styles.rowStart]}>
      <Pressable
        onLongPress={onLongPress}
        style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {isUser ? (
          <Text style={styles.userText} selectable>
            {message.content}
          </Text>
        ) : (
          <MarkdownText content={message.content || (message.isStreaming ? '…' : '')} />
        )}
        {message.isStreaming ? <Text style={styles.streamingDot}>▌</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, marginVertical: spacing.xs, flexDirection: 'row' },
  rowStart: { justifyContent: 'flex-start' },
  rowEnd: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '88%',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleUser: { backgroundColor: colors.user },
  bubbleAssistant: { backgroundColor: colors.assistant },
  userText: { color: colors.text, fontSize: 16, lineHeight: 22 },
  streamingDot: { color: colors.textDim, fontSize: 14, marginTop: 2 },
});
