import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { analysis } = await request.json();
    
    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis is required' },
        { status: 400 }
      );
    }

    // Get image description from analysis
    const imageDescription = analysis.imageDescription || analysis.content || '';
    
    if (!imageDescription) {
      return NextResponse.json(
        { error: 'No image description provided' },
        { status: 400 }
      );
    }

    console.log('Image description from AI:', imageDescription);
    
    const apiKey = process.env.API;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'N1N API key not configured' },
        { status: 500 }
      );
    }

    // Use AI to enhance the image description for better results
    const enhanceResponse = await fetch('https://api.n1n.ai/v1/chat/completions', {
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
            content: `You are an expert at creating detailed image search queries. Convert user descriptions into highly specific, detailed search terms that will find the perfect image.

Rules:
- Extract the MAIN subject/object
- Include specific visual details (colors, lighting, mood, composition)
- Add style keywords (professional, artistic, minimalist, vibrant, etc.)
- Keep it concise but descriptive (5-10 words max)
- Focus on what's VISIBLE in the image
- Use photography/visual terms

Examples:
Input: "sunset mountains"
Output: "golden sunset mountain peaks dramatic sky landscape"

Input: "office workspace"
Output: "modern minimalist office desk laptop natural light"

Input: "abstract gradient"
Output: "smooth colorful gradient abstract background purple pink"

Respond with ONLY the enhanced search query, nothing else.`
          },
          {
            role: 'user',
            content: `Enhance this image description: "${imageDescription}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!enhanceResponse.ok) {
      console.error('Failed to enhance image description');
      // Continue with original description
    }

    let enhancedDescription = imageDescription;
    
    if (enhanceResponse.ok) {
      const enhanceData = await enhanceResponse.json();
      enhancedDescription = enhanceData.choices[0]?.message?.content?.trim() || imageDescription;
      console.log('Enhanced description:', enhancedDescription);
    }
    
    // Generate a unique seed from the description for consistent but varied images
    const seed = enhancedDescription.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const timestamp = Date.now();
    const uniqueSeed = `${seed}-${timestamp}`;
    
    // Use Picsum Photos - reliable, CORS-friendly, and works with server-side fetching
    // This service provides high-quality stock photos without CORS issues
    const imageUrl = `https://picsum.photos/seed/${uniqueSeed}/1200/800`;
    
    console.log('Generated image URL:', {
      url: imageUrl,
      seed: uniqueSeed,
      description: enhancedDescription
    });
    
    return NextResponse.json({ 
      imageUrl: imageUrl,
      keywords: enhancedDescription,
      originalKeywords: imageDescription,
      success: true 
    });
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
