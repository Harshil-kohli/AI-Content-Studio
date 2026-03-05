import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

export async function POST(request) {
  let client;
  
  try {
    const designData = await request.json();
    
    console.log('Received design data:', {
      hasDesignId: !!designData.designId,
      contentType: designData.contentType,
      canvasSize: designData.canvasSize,
      hasThumbnail: !!designData.thumbnail
    });
    
    if (!uri) {
      return NextResponse.json(
        { error: 'MongoDB URI not configured' },
        { status: 500 }
      );
    }

    client = await MongoClient.connect(uri);
    const db = client.db('AI-posts');
    const collection = db.collection('designs');

    // Create design document
    const design = {
      canvasSize: designData.canvasSize,
      canvasColor: designData.canvasColor,
      contentType: designData.contentType,
      imageUrl: designData.imageUrl || null,
      textContent: designData.textContent || null,
      textPosition: designData.textPosition || 'center',
      textStyle: designData.textStyle || {},
      thumbnail: designData.thumbnail || null,
      updatedAt: new Date(),
    };

    // Convert external image URLs to base64 for better compatibility
    if (design.imageUrl && !design.imageUrl.startsWith('data:')) {
      try {
        console.log('Converting external image to base64...');
        const imageResponse = await fetch(design.imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/*',
          },
          redirect: 'follow', // Follow redirects
        });
        
        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer();
          
          if (imageBuffer.byteLength > 0) {
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
            design.imageUrl = `data:${contentType};base64,${base64Image}`;
            console.log('Image converted to base64 successfully, size:', imageBuffer.byteLength, 'bytes');
          } else {
            console.warn('Received empty image data');
          }
        } else {
          console.warn('Image fetch failed:', imageResponse.status);
        }
      } catch (conversionError) {
        console.warn('Could not convert image to base64:', conversionError);
        // Keep original URL if conversion fails
      }
    }

    // If designId is provided, update existing design
    if (designData.designId) {
      const { ObjectId } = require('mongodb');
      console.log('Updating design:', designData.designId);
      
      try {
        const result = await collection.updateOne(
          { _id: new ObjectId(designData.designId) },
          { $set: design }
        );
        
        console.log('Update result:', result.matchedCount, 'matched,', result.modifiedCount, 'modified');
        
        return NextResponse.json({ 
          success: true, 
          id: designData.designId.toString(),
          updated: true,
          message: 'Design updated successfully'
        });
      } catch (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update design: ' + updateError.message },
          { status: 500 }
        );
      }
    } else {
      // Create new design
      console.log('Creating new design');
      design.createdAt = new Date();
      
      try {
        const result = await collection.insertOne(design);
        console.log('Insert result:', result.insertedId);
        
        return NextResponse.json({ 
          success: true, 
          id: result.insertedId.toString(),
          updated: false,
          message: 'Design saved successfully'
        });
      } catch (insertError) {
        console.error('Insert error:', insertError);
        return NextResponse.json(
          { error: 'Failed to create design: ' + insertError.message },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error saving design:', error);
    return NextResponse.json(
      { error: 'Failed to save design: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}

export async function GET() {
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

    const designs = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    // Convert old Unsplash URLs to Picsum URLs for all designs
    const updatedDesigns = designs.map(design => {
      if (design.imageUrl && design.imageUrl.includes('source.unsplash.com')) {
        const timestamp = Date.now();
        const seed = Math.floor(Math.random() * 10000);
        design.imageUrl = `https://picsum.photos/seed/${seed}-${timestamp}/1200/800`;
      }
      return design;
    });

    return NextResponse.json({ designs: updatedDesigns });
  } catch (error) {
    console.error('Error fetching designs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch designs' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}

export async function DELETE(request) {
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

    const { ObjectId } = require('mongodb');
    await collection.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ 
      success: true,
      message: 'Design deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting design:', error);
    return NextResponse.json(
      { error: 'Failed to delete design' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
