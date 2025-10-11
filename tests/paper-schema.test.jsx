import { describe, it, expect } from 'vitest';
import { createPaperSchema, sanitizeKeywords } from '../src/features/papers/paperSchema.js';

const basePayload = {
  title_zh: '测试标题',
  title_en: '',
  abstract_zh: '这是一个不少于二十字的摘要内容，用于测试校验逻辑。',
  abstract_en: '',
  keywords_zh: ['人工智能'],
  keywords_en: [],
  fund_name: '',
  fund_code: '',
  authors: [{ author_id: 1, institution_id: 2 }],
  attachment: new File(['content'], 'paper.pdf', { type: 'application/pdf' })
};

describe('paper schema', () => {
  it('rejects when keywords list is empty', () => {
    const result = createPaperSchema.safeParse({
      ...basePayload,
      keywords_zh: []
    });
    expect(result.success).toBe(false);
  });

  it('cleans duplicated keywords', () => {
    const sanitized = sanitizeKeywords(['AI', 'AI', '  数据 ']);
    expect(sanitized).toEqual(['AI', '数据']);
  });
});
