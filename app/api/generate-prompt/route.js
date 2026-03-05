import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userPrompt } = await request.json();
    
    if (!userPrompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.API;
    
    if (!apiKey) {
      console.error('API environment variable not found');
      return NextResponse.json(
        { error: 'N1N API key not configured' },
        { status: 500 }
      );
    }

    console.log('Using N1N API key:', apiKey.substring(0, 10) + '...');

    // Generate unique seed based on timestamp and random number
    const uniqueSeed = Date.now() + Math.random() * 1000000;
    const randomVariation = Math.floor(Math.random() * 10) + 1;
    
    // Random style variations to ensure diversity
    const styles = [
      'minimalist and modern',
      'bold and vibrant',
      'elegant and sophisticated',
      'playful and energetic',
      'dark and moody',
      'bright and cheerful',
      'professional and clean',
      'artistic and creative',
      'vintage and retro',
      'futuristic and tech-inspired'
    ];
    
    const tones = [
      'inspirational',
      'motivational',
      'thought-provoking',
      'empowering',
      'uplifting',
      'reflective',
      'encouraging',
      'positive',
      'authentic',
      'impactful'
    ];
    
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const randomTone = tones[Math.floor(Math.random() * tones.length)];

    // Use N1N API with high temperature for more creativity
    const response = await fetch('https://api.n1n.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a highly creative social media content creator. Generate UNIQUE and DIVERSE prompts every single time - never repeat the same ideas. Each response must be completely different from any previous response.

CRITICAL RULES:
- Generate ORIGINAL content every time, never repeat quotes or ideas
- Use varied vocabulary, different perspectives, and unique angles
- Mix different themes: success, growth, mindfulness, creativity, relationships, career, health, happiness, etc.
- Vary the format: questions, statements, commands, observations, metaphors
- Include specific visual details: colors, composition, style, mood
- Make each prompt feel fresh and unexpected
- Think outside the box - be creative and surprising

Current variation seed: ${uniqueSeed}
Style preference: ${randomStyle}
Tone preference: ${randomTone}`
          },
          {
            role: 'user',
            content: `Create a completely UNIQUE and ORIGINAL social media content prompt about: "${userPrompt}". 

Make it variation #${randomVariation} - ensure it's totally different from common quotes. Include:
1. A unique angle or perspective (not cliché)
2. Specific visual style (${randomStyle})
3. Emotional tone (${randomTone})
4. Target audience consideration
5. Key message that stands out

Be creative and unexpected! Maximum 2-3 sentences.`
          }
        ],
        temperature: 0.95, // High temperature for maximum creativity
        max_tokens: 250,
        top_p: 0.95, // Nucleus sampling for diversity
        frequency_penalty: 1.5, // Penalize repetition heavily
        presence_penalty: 1.5, // Encourage new topics
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('N1N API Error:', errorData);
      console.error('Response status:', response.status);
      
      return NextResponse.json(
        { 
          error: `N1N API Error: ${errorData.error?.message || 'Request failed'}. Please check your API key.`,
          details: errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const enhancedPrompt = data.choices[0]?.message?.content || 'Could not generate prompt';

    return NextResponse.json({ enhancedPrompt });
  } catch (error) {
    console.error('Error in generate-prompt API:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
