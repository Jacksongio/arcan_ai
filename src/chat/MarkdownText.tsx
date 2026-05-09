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
  body: { color: colors.text, fontSize: 16, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { color: colors.text, fontWeight: '700' },
  em: { color: colors.text, fontStyle: 'italic' },
  link: { color: colors.accent },
  bullet_list: { marginTop: 0, marginBottom: 8 },
  ordered_list: { marginTop: 0, marginBottom: 8 },
  list_item: { color: colors.text, marginBottom: 4 },
  code_inline: {
    backgroundColor: colors.bgElev,
    color: colors.text,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'Menlo',
    fontSize: 14,
  },
  code_block: {
    backgroundColor: colors.bgElev,
    color: colors.text,
    padding: 12,
    borderRadius: 8,
    fontFamily: 'Menlo',
    fontSize: 13,
  },
  fence: {
    backgroundColor: colors.bgElev,
    color: colors.text,
    padding: 12,
    borderRadius: 8,
    fontFamily: 'Menlo',
    fontSize: 13,
  },
  blockquote: {
    backgroundColor: colors.bgElev,
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 6,
    marginVertical: 6,
  },
  heading1: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 8, marginBottom: 6 },
  heading2: { color: colors.text, fontSize: 19, fontWeight: '700', marginTop: 8, marginBottom: 6 },
  heading3: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 6, marginBottom: 4 },
});
