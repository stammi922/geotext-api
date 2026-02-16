import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

export interface LLMExtractedLocation {
  name: string;
  description: string;
  raw_mention: string;
  llm_lat?: number;
  llm_lon?: number;
}

const EXTRACTION_PROMPT = `Extract all geographic locations, points of interest, and destinations from the following text. For each location, provide:
1. The canonical name of the location
2. A brief description (1 sentence max)
3. The exact text mention from the input
4. If you're confident, provide approximate latitude and longitude

Return ONLY valid JSON in this format (no markdown, no explanation):
{
  "locations": [
    {
      "name": "Great Barrier Reef",
      "description": "World's largest coral reef system off the coast of Queensland, Australia",
      "raw_mention": "the Great Barrier Reef",
      "llm_lat": -18.2871,
      "llm_lon": 147.6992
    }
  ]
}

If no locations are found, return: {"locations": []}

TEXT TO ANALYZE:
`;

function parseExtractionResponse(text: string): LLMExtractedLocation[] {
  let jsonStr = text.trim();
  // Strip markdown code fences if present
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
  }
  const parsed = JSON.parse(jsonStr);
  return parsed.locations || [];
}

/**
 * Extract locations using Gemini 2.0 Flash (primary, 11x cheaper than Haiku).
 * Returns null on failure so caller can fall back to Haiku.
 */
async function extractWithGemini(
  text: string
): Promise<LLMExtractedLocation[] | null> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(EXTRACTION_PROMPT + text);
    const response = result.response;
    const responseText = response.text();

    return parseExtractionResponse(responseText);
  } catch (error) {
    console.error('Gemini extraction failed, will fall back to Haiku:', error);
    return null;
  }
}

/**
 * Extract locations using Claude Haiku 4.5 (fallback).
 */
async function extractWithHaiku(
  text: string
): Promise<LLMExtractedLocation[]> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: EXTRACTION_PROMPT + text,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    return [];
  }

  return parseExtractionResponse(content.text);
}

/**
 * Staged LLM extraction: Gemini Flash (primary) → Claude Haiku (fallback).
 *
 * Returns which model was used alongside the extracted locations.
 */
export async function extractLocationsWithLLM(text: string): Promise<{
  locations: LLMExtractedLocation[];
  model_used: string;
}> {
  // Stage 1: Try Gemini Flash (11x cheaper)
  const geminiResult = await extractWithGemini(text);
  if (geminiResult !== null && geminiResult.length >= 0) {
    return { locations: geminiResult, model_used: 'gemini-2.0-flash' };
  }

  // Stage 2: Fall back to Claude Haiku
  try {
    const haikuResult = await extractWithHaiku(text);
    return { locations: haikuResult, model_used: 'claude-haiku-4.5' };
  } catch (error) {
    console.error('Both LLM extractions failed:', error);
    return { locations: [], model_used: 'none' };
  }
}
