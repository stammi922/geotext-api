import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const testTexts = [
  "Visit the Eiffel Tower in Paris and Big Ben in London",
  "Trip to Tokyo, Berlin, and Sydney next summer",
  "Meeting at 1600 Pennsylvania Avenue NW, Washington, DC",
  "Ich reise nach München, dann nach Hamburg",
  "See the Grand Canyon, then fly to Las Vegas"
];

async function extractWithModel(text: string, model: string) {
  const startTime = Date.now();
  
  const response = await anthropic.messages.create({
    model,
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Extract all location names from this text and return as JSON array:

Text: "${text}"

Return format: [{"name": "Location Name"}]
Only return the JSON array, nothing else.`
    }]
  });

  const duration = Date.now() - startTime;
  const content = response.content[0].type === 'text' ? response.content[0].text : '';
  
  try {
    const locations = JSON.parse(content);
    return { locations, duration, model };
  } catch {
    return { locations: [], duration, model, error: 'Parse failed' };
  }
}

async function runTests() {
  console.log('🧪 Testing Location Extraction Accuracy\n');
  
  for (const text of testTexts) {
    console.log(`📝 Text: "${text}"\n`);
    
    const [haikuResult, sonnetResult] = await Promise.all([
      extractWithModel(text, 'claude-haiku-4-20250514'),
      extractWithModel(text, 'claude-sonnet-4-20250514')
    ]);
    
    console.log(`⚡ Haiku (${haikuResult.duration}ms):`, haikuResult.locations);
    console.log(`🎯 Sonnet (${sonnetResult.duration}ms):`, sonnetResult.locations);
    
    const haikuCount = haikuResult.locations?.length || 0;
    const sonnetCount = sonnetResult.locations?.length || 0;
    const match = haikuCount === sonnetCount ? '✅' : '⚠️';
    
    console.log(`${match} Match: ${haikuCount} vs ${sonnetCount} locations\n`);
  }
}

runTests().catch(console.error);
