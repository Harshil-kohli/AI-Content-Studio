import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;

export async function GET(request) {
  let client;
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Design ID is required' },
        { status: 400 }
      );
    }

    if (!uri) {
      return NextResponse.json(
        { error: 'MongoDB URI not configured' },
        { status: 500 }
      );
    }

    client = await MongoClient.connect(uri);
    const db = client.db('AI-posts');
    const collection = db.collection('designs');

    const design = await collection.findOne({ _id: new ObjectId(id) });

    if (!design) {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      );
    }

    // Convert old problematic URLs (Lorem Flickr, old Unsplash) to fresh ones
    if (design.imageUrl && !design.imageUrl.startsWith('data:')) {
      let needsUpdate = false;
      
      // Check if it's a Lorem Flickr URL (causes cat images)
      if (design.imageUrl.includes('loremflickr.com')) {
        console.log('⚠️ Found Lorem Flickr URL (cat image), removing...');
        design.imageUrl = null; // Remove it so user can regenerate
        needsUpdate = true;
      }
      // Check if it's old source.unsplash.com (CORS issues)
      else if (design.imageUrl.includes('source.unsplash.com')) {
        console.log('⚠️ Found old Unsplash URL, removing...');
        design.imageUrl = null; // Remove it so user can regenerate
        needsUpdate = true;
      }
      
      // Update in database if needed
      if (needsUpdate) {
        await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { imageUrl: design.imageUrl } }
        );
        console.log('✅ Removed problematic image URL from design');
      }
    }

    return NextResponse.json({ design });
  } catch (error) {
    console.error('Error fetching design:', error);
    return NextResponse.json(
      { error: 'Failed to fetch design' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
