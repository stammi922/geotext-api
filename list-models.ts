import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Common model IDs for 2026
const models = [
  'claude-haiku-4.5',
  'claude-sonnet-4.5',
  'claude-opus-4.5',
  'claude-4-haiku-20241120',
  'claude-4-sonnet-20250514',
];

console.log('Testing model IDs...\n');

for (const model of models) {
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }]
    });
    console.log(`✅ ${model} - WORKS`);
  } catch (error: any) {
    console.log(`❌ ${model} - ${error.status}: ${error.error?.error?.message || error.message}`);
  }
}
