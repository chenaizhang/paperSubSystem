import { z } from 'zod';

export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const keywordsSchema = z.array(z.string().min(1)).max(8, '关键词不超过8个');

const basePaperSchema = z.object({
  title_zh: z.string().min(1, '请输入中文标题'),
  title_en: z.string().optional(),
  abstract_zh: z.string().min(1, '请输入中文摘要'),
  abstract_en: z.string().optional(),
  keywords_zh: keywordsSchema.min(1, '请输入至少一个中文关键词'),
  keywords_en: keywordsSchema.optional(),
  fund_name: z.string().optional(),
  fund_code: z.string().optional(),
  authors: z
    .array(
      z.object({
        author_id: z.union([z.string(), z.number()]).refine((val) => val !== '', '请选择作者'),
        institution_id: z.union([z.string(), z.number()]).refine((val) => val !== '', '请选择单位')
      })
    )
    .min(1, '至少关联一位作者')
});

const fileSchema = z
  .custom((value) => value instanceof File)
  .superRefine((file, ctx) => {
    if (!(file instanceof File)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '请上传稿件附件' });
      return;
    }
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '仅支持 PDF 或 Word 文件' });
    }
    if (file.size > MAX_FILE_SIZE) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '文件大小不能超过 20MB' });
    }
  });

export const createPaperSchema = basePaperSchema.extend({
  attachment: fileSchema
});

export const editPaperSchema = basePaperSchema.extend({
  attachment: fileSchema.optional()
});

export const sanitizeKeywords = (arr) =>
  Array.from(new Set((arr || []).map((item) => item.trim()).filter(Boolean)));
