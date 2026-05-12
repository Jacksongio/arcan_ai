import React from 'react';
import Markdown from 'react-native-markdown-display';
import { StyleSheet } from 'react-native';
import { colors } from '../shared/theme';

interface Props {
  content: string;
}

export function MarkdownText({ content }: Props) {
  return <Markdown style={mdStyles}>{content}</Markdown>;
}

const mdStyles = StyleSheet.create({
  body: { color: colors.text, fontSize: 16, lineHeight: 23 },
  paragraph: { marginTop: 0, marginBottom: 6 },
  strong: { color: '#FFFFFF', fontWeight: '700' },
  em: { color: colors.text, fontStyle: 'italic' },
  link: { color: colors.accent, textDecorationLine: 'underline' },
  bullet_list: { marginTop: 0, marginBottom: 6 },
  ordered_list: { marginTop: 0, marginBottom: 6 },
  list_item: { color: colors.text, marginBottom: 3 },
  code_inline: {
    backgroundColor: 'rgba(138, 107, 255, 0.12)',
    color: '#C9B8FF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'Menlo',
    fontSize: 14,
  },
  code_block: {
    backgroundColor: '#0A0C14',
    color: colors.text,
    padding: 14,
    borderRadius: 10,
    fontFamily: 'Menlo',
    fontSize: 13,
    lineHeight: 19,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fence: {
    backgroundColor: '#0A0C14',
    color: colors.text,
    padding: 14,
    borderRadius: 10,
    fontFamily: 'Menlo',
    fontSize: 13,
    lineHeight: 19,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockquote: {
    backgroundColor: 'rgba(138, 107, 255, 0.06)',
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 6,
    marginVertical: 6,
    borderRadius: 4,
  },
  heading1: { color: '#FFFFFF', fontSize: 21, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  heading2: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 5 },
  heading3: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 6, marginBottom: 4 },
});
