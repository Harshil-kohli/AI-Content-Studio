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

    // Find all designs with problematic URLs (Lorem Flickr or old Unsplash)
    const oldDesigns = await collection
      .find({ 
        $or: [
          { imageUrl: { $regex: 'loremflickr.com' } },
          { imageUrl: { $regex: 'source.unsplash.com' } }
        ]
      })
      .toArray();

    console.log(`Found ${oldDesigns.length} designs with problematic URLs`);

    let updatedCount = 0;

    // Remove problematic URLs from each design
    for (const design of oldDesigns) {
      await collection.updateOne(
        { _id: design._id },
        { $set: { imageUrl: null } } // Remove the URL so user can regenerate
      );

      updatedCount++;
    }

    console.log(`Removed problematic URLs from ${updatedCount} designs`);

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
