import { buildPrompt, stripSpecialTokens } from '../src/chat/chatTemplates';
import { Message } from '../src/shared/types';

const userMsg = (content: string): Message => ({
  id: 'u1',
  role: 'user',
  content,
  createdAt: 0,
});
const asstMsg = (content: string): Message => ({
  id: 'a1',
  role: 'assistant',
  content,
  createdAt: 0,
});

describe('chatTemplates', () => {
  test('gemma folds system into first user turn and ends with model open', () => {
    const { prompt, stopTokens } = buildPrompt('gemma', 'Be concise.', [userMsg('hi')]);
    expect(prompt).toContain('<start_of_turn>user\nBe concise.\n\nhi<end_of_turn>');
    expect(prompt.endsWith('<start_of_turn>model\n')).toBe(true);
    expect(stopTokens).toContain('<end_of_turn>');
  });

  test('llama3 emits header tokens for system, user, assistant', () => {
    const { prompt } = buildPrompt('llama', 'sys', [userMsg('hello'), asstMsg('hi')]);
    expect(prompt).toContain('<|start_header_id|>system<|end_header_id|>');
    expect(prompt).toContain('<|start_header_id|>user<|end_header_id|>');
    expect(prompt).toContain('<|start_header_id|>assistant<|end_header_id|>');
  });

  test('mistral wraps with [INST]/[/INST]', () => {
    const { prompt } = buildPrompt('mistral', 'sys', [userMsg('q1'), asstMsg('a1'), userMsg('q2')]);
    expect(prompt).toContain('[INST]');
    expect(prompt).toContain('[/INST]');
    expect(prompt).toContain('a1</s>');
  });

  test('stripSpecialTokens removes leaked markers', () => {
    expect(stripSpecialTokens('hello<end_of_turn>world')).toBe('helloworld');
    expect(stripSpecialTokens('a<|eot_id|>b')).toBe('ab');
  });

  test('unknown family falls back to ChatML', () => {
    const { prompt } = buildPrompt('unknown', '', [userMsg('hey')]);
    expect(prompt).toContain('<|im_start|>user');
    expect(prompt.endsWith('<|im_start|>assistant\n')).toBe(true);
  });
});
