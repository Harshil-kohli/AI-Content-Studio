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

    // Use N1N API
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
            content: 'You are a professional social media content creator and prompt engineer. Your job is to take brief user ideas and transform them into detailed, descriptive prompts for creating social media content. Include specific details about visual style, tone, colors, composition, target audience, and key messaging. Keep responses concise but comprehensive (2-3 sentences max).'
          },
          {
            role: 'user',
            content: `Transform this brief idea into a detailed, descriptive prompt for creating social media content: "${userPrompt}"`
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
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
