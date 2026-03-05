import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

export async function POST() {
  let client;
  
  try {
    if (!uri) {
      return NextResponse.json(
        { error: 'MongoDB URI not configured' },
        { status: 500 }
      );
    }

    client = await MongoClient.connect(uri);
    const db = client.db('AI-posts');
    const collection = db.collection('designs');

    // Find all designs with Unsplash URLs
    const oldDesigns = await collection
      .find({ imageUrl: { $regex: 'source.unsplash.com' } })
      .toArray();

    console.log(`Found ${oldDesigns.length} designs with old Unsplash URLs`);

    let updatedCount = 0;

    // Update each design with a new Picsum URL
    for (const design of oldDesigns) {
      const timestamp = Date.now() + updatedCount; // Ensure unique seeds
      const seed = Math.floor(Math.random() * 10000);
      const newImageUrl = `https://picsum.photos/seed/${seed}-${timestamp}/1200/800`;

      await collection.updateOne(
        { _id: design._id },
        { $set: { imageUrl: newImageUrl } }
      );

      updatedCount++;
    }

    console.log(`Updated ${updatedCount} designs`);

    return NextResponse.json({ 
      success: true,
      message: `Successfully updated ${updatedCount} designs`,
      updatedCount
    });
  } catch (error) {
    console.error('Error cleaning up designs:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup designs: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
