/**
 * Спільні хелпери для скілів.
 *
 * Кожен скіл працює у двох режимах:
 *  - preview  → показує план дій у красивому Markdown (працює скрізь)
 *  - execute  → повертає покрокові інструкції для LLM
 *
 * Graceful degradation:
 *  - Claude Code / Claude Desktop → рендерить Markdown з таблицями
 *  - LM Studio / інші → показує plain text
 */

import { z } from 'zod';

/* ────────────────────────── Types ────────────────────────── */

export interface SkillStep {
  /** Назва кроку, наприклад "Збір даних акаунту" */
  title: string;
  /** Які tools будуть використані */
  tools: string[];
  /** Стислий опис */
  description: string;
}

export interface SkillPreview {
  /** Emoji + назва скіла */
  title: string;
  /** Короткий опис що робить скіл */
  summary: string;
  /** Покрокові кроки */
  steps: SkillStep[];
  /** Орієнтовний час виконання */
  estimatedTime: string;
  /** Які параметри прийшли */
  params: Record<string, string | undefined>;
  /** Ім'я скіла (tool name) для виклику з mode=execute */
  skillName: string;
}

/* ────────────────────── Shared Zod Schema ────────────────── */

/** Загальний параметр mode для всіх скілів */
export const modeSchema = z
  .enum(['preview', 'execute'])
  .default('preview')
  .describe(
    'Режим: "preview" — показати план дій (за замовчуванням), "execute" — виконати скіл. ЗАВЖДИ спочатку виклич з preview, покажи результат користувачу, і лише після підтвердження виклич з execute.'
  );

/* ────────────────────── Formatters ──────────────────────── */

/**
 * Формує красивий Markdown-превью з плану дій.
 * Працює у БУДЬ-ЯКОМУ MCP-клієнті (plain Markdown).
 */
export function formatPreview(preview: SkillPreview): string {
  const paramsBlock = Object.entries(preview.params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `- **${k}:** ${v}`)
    .join('\n');

  const stepsBlock = preview.steps
    .map(
      (s, i) =>
        `| ${i + 1} | ${s.title} | ${s.tools.map((t) => '`' + t + '`').join(', ')} | ${s.description} |`
    )
    .join('\n');

  return `# ${preview.title}

${preview.summary}

## 📋 Параметри
${paramsBlock || '_немає_'}

## 🗺️ План виконання
| # | Крок | Інструменти | Деталі |
|---|------|-------------|--------|
${stepsBlock}

⏱️ **Орієнтовний час:** ${preview.estimatedTime}

---

> **Підтвердити виконання?**
> Якщо так — виклич \`${preview.skillName}\` з **mode = "execute"** (та тими ж параметрами).
> Якщо ні — скажи що хочеш змінити.`;
}

/**
 * Повертає MCP tool result з превью.
 */
export function previewResult(preview: SkillPreview) {
  return {
    content: [{ type: 'text' as const, text: formatPreview(preview) }],
  };
}

/**
 * Повертає MCP tool result з інструкціями для виконання.
 */
export function executeResult(instructions: string) {
  return {
    content: [{ type: 'text' as const, text: instructions }],
  };
}
