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

    // Convert old Unsplash URLs to Picsum URLs for compatibility
    if (design.imageUrl && design.imageUrl.includes('source.unsplash.com')) {
      console.log('Converting old Unsplash URL to Picsum...');
      const timestamp = Date.now();
      const seed = Math.floor(Math.random() * 10000);
      design.imageUrl = `https://picsum.photos/seed/${seed}-${timestamp}/1200/800`;
      
      // Update in database
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { imageUrl: design.imageUrl } }
      );
      console.log('Updated design with new image URL');
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
