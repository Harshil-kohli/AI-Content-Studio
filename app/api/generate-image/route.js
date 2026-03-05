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
            content: `You are an expert at extracting precise image search keywords. Your job is to identify the EXACT main subject and key visual elements from descriptions.

CRITICAL RULES:
1. Identify the PRIMARY subject first (person, object, animal, place, etc.)
2. Add 2-3 most important descriptive words (color, style, setting)
3. Keep it SHORT and PRECISE (3-6 words maximum)
4. Use CONCRETE, SEARCHABLE terms (not abstract concepts)
5. Focus on VISUAL elements only
6. NO metaphors, NO abstract ideas, NO emotions - only what's VISIBLE

Examples:
Input: "A luxury sports car at sunset"
Output: "red sports car sunset"

Input: "Modern office with laptop and coffee"
Output: "modern office desk laptop"

Input: "Beautiful mountain landscape"
Output: "mountain landscape sunset"

Input: "Motivational quote about success"
Output: "business success office"

Input: "Colorful abstract background"
Output: "colorful gradient abstract"

Input: "Person working on computer"
Output: "person laptop working"

REMEMBER: Be SPECIFIC and LITERAL. If they say "car", output "car". If they say "office", output "office". Don't overthink it!

Respond with ONLY 3-6 keywords separated by spaces, nothing else.`
          },
          {
            role: 'user',
            content: `Extract precise image search keywords from: "${imageDescription}"`
          }
        ],
        temperature: 0.1, // Very low for consistency
        max_tokens: 30,
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
      console.log('AI extracted keywords:', enhancedDescription);
    }
    
    // Clean and prepare keywords for search
    const keywords = enhancedDescription
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(' ')
      .filter(word => word.length > 2) // Filter very short words
      .slice(0, 4) // Take first 4 keywords for better accuracy
      .join('+');
    
    console.log('Final search keywords:', keywords);
    
    console.log('Search keywords:', keywords);
    
    // Use multiple free image APIs with fallbacks
    let imageUrl = null;
    
    // Try Pexels API (free, no key needed for basic use via their CDN)
    try {
      const pexelsQuery = encodeURIComponent(enhancedDescription);
      const pexelsResponse = await fetch(`https://api.pexels.com/v1/search?query=${pexelsQuery}&per_page=15&orientation=landscape`, {
        headers: {
          'Authorization': process.env.PEXELS_API_KEY || 'YOUR_PEXELS_KEY_HERE'
        }
      });
      
      if (pexelsResponse.ok) {
        const pexelsData = await pexelsResponse.json();
        if (pexelsData.photos && pexelsData.photos.length > 0) {
          // Pick a random photo from results for variety
          const randomIndex = Math.floor(Math.random() * Math.min(pexelsData.photos.length, 10));
          imageUrl = pexelsData.photos[randomIndex].src.large;
          console.log('Using Pexels image:', imageUrl);
        }
      }
    } catch (pexelsError) {
      console.warn('Pexels API failed:', pexelsError.message);
    }
    
    // Fallback 1: Try Pixabay (free, requires API key)
    if (!imageUrl && process.env.PIXABAY_API_KEY) {
      try {
        const pixabayQuery = encodeURIComponent(keywords);
        const pixabayResponse = await fetch(`https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${pixabayQuery}&image_type=photo&orientation=horizontal&per_page=20`);
        
        if (pixabayResponse.ok) {
          const pixabayData = await pixabayResponse.json();
          if (pixabayData.hits && pixabayData.hits.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(pixabayData.hits.length, 10));
            imageUrl = pixabayData.hits[randomIndex].largeImageURL;
            console.log('Using Pixabay image:', imageUrl);
          }
        }
      } catch (pixabayError) {
        console.warn('Pixabay API failed:', pixabayError.message);
      }
    }
    
    // Fallback 2: Use Lorem Flickr (keyword-based, free, no API key)
    if (!imageUrl) {
      // Lorem Flickr provides real photos based on keywords
      const flickrKeywords = keywords.replace(/\+/g, ',');
      imageUrl = `https://loremflickr.com/1200/800/${flickrKeywords}?random=${Date.now()}`;
      console.log('Using Lorem Flickr image:', imageUrl);
    }
    
    console.log('Final image URL:', {
      url: imageUrl,
      keywords: keywords,
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
