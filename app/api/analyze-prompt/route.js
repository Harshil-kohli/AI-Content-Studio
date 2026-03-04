import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.API;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'N1N API key not configured' },
        { status: 500 }
      );
    }

    console.log('Using N1N API with key:', apiKey.substring(0, 10) + '...');

    // Use AI to analyze the prompt
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
            content: `You are an AI that analyzes user prompts for social media content creation. Respond ONLY with a JSON object in this exact format:
{
  "action": "image" | "text" | "image_with_text" | "canvas",
  "imageDescription": "precise visual keywords",
  "textContent": "the exact text to display",
  "textPosition": "center" | "top" | "bottom",
  "canvasColor": "#hexcolor",
  "reasoning": "brief explanation"
}

CRITICAL RULES FOR IMAGE GENERATION:
1. action: "image" - ONLY if user explicitly says: "generate image", "create image", "make image", "show image", "add image", "image of"
   Example: "generate an image of sunset", "create a photo of mountains"

2. action: "text" - User wants ONLY text with NO image
   Example: "add text: Hello World", "write: Welcome"

3. action: "image_with_text" - User EXPLICITLY wants BOTH image AND text
   Example: "generate sunset image with quote", "create mountain photo and add text"
   Keywords: "image with text", "photo with quote", "picture and add", "generate image and write"

4. action: "canvas" - User wants to customize canvas/background color or NO image mentioned
   Example: "make background blue", "change canvas to red", "I want a purple background"

5. imageDescription: Create DETAILED, SPECIFIC visual descriptions for accurate image matching
   - Start with MAIN subject/object
   - Add visual details: colors, lighting, mood, composition, style
   - Use descriptive adjectives and photography terms
   - Think: "What would I search to find this exact image?"
   
   Excellent examples:
   - "golden sunset over mountain peaks with dramatic orange sky"
   - "modern minimalist office workspace with laptop and natural window light"
   - "vibrant abstract gradient background purple pink flowing waves"
   - "professional businessman in suit standing in urban city skyline"
   - "cozy coffee shop interior warm ambient lighting wooden tables"
   
   Poor examples:
   - "nice scenery" (too vague)
   - "beautiful image" (not descriptive)
   - "professional workspace" (too generic)
   - "motivational background" (not visual)

6. textContent: Extract or generate high-quality text
   - If user provides text in quotes: use EXACTLY that
   - If user says "motivational quote": generate a SHORT, powerful quote (5-15 words)
   - If user says "long quote": generate 20-40 words
   - Make text inspiring, professional, and impactful

7. textPosition: 
   - "center" (default)
   - "top" if prompt mentions "top", "header", "above"
   - "bottom" if prompt mentions "bottom", "footer", "below"

8. canvasColor: Detect background color from prompt
   - Default: "#ffffff" (white)
   - Extract from: "blue background", "red canvas", "purple bg"
   - Use hex colors: blue=#3b82f6, red=#ef4444, purple=#a855f7, green=#22c55e, yellow=#eab308, pink=#ec4899

EXAMPLES:
Prompt: "generate an image of a man standing on cliff with sunset"
Response: {"action": "image", "imageDescription": "silhouette man standing cliff edge golden sunset dramatic orange sky", "textContent": "", "textPosition": "center", "canvasColor": "#ffffff", "reasoning": "Only image requested"}

Prompt: "create mountain landscape image and add motivational quote in center"
Response: {"action": "image_with_text", "imageDescription": "majestic snow mountain peaks blue sky landscape nature", "textContent": "Dream big, start small, act now", "textPosition": "center", "canvasColor": "#ffffff", "reasoning": "Image with text overlay"}

Prompt: "generate professional office workspace with laptop"
Response: {"action": "image", "imageDescription": "modern minimalist office desk laptop computer natural window light clean workspace", "textContent": "", "textPosition": "center", "canvasColor": "#ffffff", "reasoning": "Only image requested"}

Prompt: "add text: Welcome Home in the center"
Response: {"action": "text", "imageDescription": "", "textContent": "Welcome Home", "textPosition": "center", "canvasColor": "#ffffff", "reasoning": "Only text requested"}

Prompt: "make the background blue"
Response: {"action": "canvas", "imageDescription": "", "textContent": "", "textPosition": "center", "canvasColor": "#3b82f6", "reasoning": "Canvas color change"}

Prompt: "I want a motivational post"
Response: {"action": "text", "imageDescription": "", "textContent": "Success is not final, failure is not fatal", "textPosition": "center", "canvasColor": "#ffffff", "reasoning": "No image requested, generating motivational text"}`
          },
          {
            role: 'user',
            content: `Analyze this prompt: "${prompt}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('N1N API Error:', errorData);
      console.error('Response status:', response.status);
      return NextResponse.json(
        { error: 'Failed to analyze prompt with N1N API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const analysisText = data.choices[0]?.message?.content || '{}';
    
    // Parse the JSON response
    let analysis;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisText);
    } catch (e) {
      console.error('Failed to parse AI response:', analysisText);
      analysis = { action: 'none', imageDescription: '', textContent: '', textPosition: 'center', reasoning: 'Could not parse response' };
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error in analyze-prompt API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
