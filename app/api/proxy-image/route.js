import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageUrl } = await request.json();
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    console.log('Proxying image:', imageUrl);

    // Fetch the image from the external source with redirect following
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
      redirect: 'follow', // Follow redirects
    });

    if (!imageResponse.ok) {
      console.error('Image fetch failed:', imageResponse.status, imageResponse.statusText);
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    // Get the image as a buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    
    if (imageBuffer.byteLength === 0) {
      throw new Error('Received empty image data');
    }
    
    // Convert to base64
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64Image}`;

    console.log('Image proxied successfully, size:', imageBuffer.byteLength, 'bytes');

    return NextResponse.json({ 
      dataUrl,
      success: true 
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image', details: error.message },
      { status: 500 }
    );
  }
}
