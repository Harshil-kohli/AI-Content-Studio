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
    
    // Simple keyword extraction - just clean the description
    const keywords = imageDescription
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(' ')
      .filter(word => word.length > 2) // Filter very short words
      .slice(0, 5) // Take first 5 keywords
      .join(' '); // Use space for better search
    
    console.log('Search keywords:', keywords);
    
    // Use multiple free image APIs with fallbacks
    let imageUrl = null;
    
    // Try Unsplash API first (best keyword matching, free 50 requests/hour)
    if (process.env.UNSPLASH_ACCESS_KEY) {
      try {
        console.log('Trying Unsplash API with key:', process.env.UNSPLASH_ACCESS_KEY.substring(0, 10) + '...');
        const unsplashQuery = encodeURIComponent(keywords);
        const unsplashUrl = `https://api.unsplash.com/search/photos?query=${unsplashQuery}&per_page=15&orientation=landscape`;
        console.log('Unsplash URL:', unsplashUrl);
        
        const unsplashResponse = await fetch(unsplashUrl, {
          headers: {
            'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
          }
        });
        
        console.log('Unsplash response status:', unsplashResponse.status);
        
        if (unsplashResponse.ok) {
          const unsplashData = await unsplashResponse.json();
          console.log('Unsplash results count:', unsplashData.results?.length || 0);
          
          if (unsplashData.results && unsplashData.results.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(unsplashData.results.length, 10));
            imageUrl = unsplashData.results[randomIndex].urls.regular;
            console.log('✅ Using Unsplash image:', imageUrl);
          } else {
            console.log('⚠️ No Unsplash results for:', keywords);
          }
        } else {
          const errorData = await unsplashResponse.json();
          console.error('❌ Unsplash API error:', unsplashResponse.status, errorData);
        }
      } catch (unsplashError) {
        console.error('❌ Unsplash API failed:', unsplashError.message);
      }
    } else {
      console.log('⚠️ Unsplash API key not configured, skipping...');
    }
    
    // Try Pexels API second (best quality)
    if (!imageUrl && process.env.PEXELS_API_KEY && process.env.PEXELS_API_KEY !== 'YOUR_PEXELS_API_KEY_HERE') {
      try {
        const pexelsQuery = encodeURIComponent(keywords);
        const pexelsResponse = await fetch(`https://api.pexels.com/v1/search?query=${pexelsQuery}&per_page=15&orientation=landscape`, {
          headers: {
            'Authorization': process.env.PEXELS_API_KEY
          }
        });
        
        if (pexelsResponse.ok) {
          const pexelsData = await pexelsResponse.json();
          if (pexelsData.photos && pexelsData.photos.length > 0) {
            // Pick a random photo from results for variety
            const randomIndex = Math.floor(Math.random() * Math.min(pexelsData.photos.length, 10));
            imageUrl = pexelsData.photos[randomIndex].src.large;
            console.log('Using Pexels image:', imageUrl);
          } else {
            console.log('No Pexels results for:', keywords);
          }
        } else {
          console.warn('Pexels API error:', pexelsResponse.status);
        }
      } catch (pexelsError) {
        console.warn('Pexels API failed:', pexelsError.message);
      }
    } else {
      console.log('Pexels API key not configured, skipping...');
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
      const flickrKeywords = keywords.replace(/\s+/g, ',');
      imageUrl = `https://loremflickr.com/1200/800/${flickrKeywords}?lock=${Date.now()}`;
      console.log('Using Lorem Flickr with keywords:', flickrKeywords);
      console.log('Lorem Flickr URL:', imageUrl);
    }
    
    console.log('Final image URL:', imageUrl);
    
    return NextResponse.json({ 
      imageUrl: imageUrl,
      keywords: keywords,
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
