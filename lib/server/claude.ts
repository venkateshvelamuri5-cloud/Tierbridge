import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { z } from 'zod'

let client: Anthropic | null = null

export function claudeReady(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

// One structured call to Claude. The answer is validated against `schema`.
// Server-side fallbacks let Anthropic retry on another model if the primary is busy.
export async function askClaude<S extends z.ZodType>(opts: {
  system: string
  prompt: string
  schema: S
  maxTokens?: number
}): Promise<z.infer<S>> {
  client ??= new Anthropic()
  const msg = await client.beta.messages.parse({
    model: process.env.CLAUDE_MODEL || 'claude-opus-5-5',
    max_tokens: opts.maxTokens ?? 8000,
    system: opts.system,
    messages: [{ role: 'user', content: opts.prompt }],
    output_config: { effort: 'low', format: betaZodOutputFormat(opts.schema) },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  })
  if (msg.stop_reason === 'refusal') throw new Error('Claude declined this request')
  if (msg.parsed_output == null) throw new Error(`Claude returned no structured output (stop reason: ${msg.stop_reason})`)
  return msg.parsed_output as z.infer<S>
}
