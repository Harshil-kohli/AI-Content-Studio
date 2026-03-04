import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!uri) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

if (!clientPromise) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

async function getDatabase() {
  const client = await clientPromise;
  return client.db('AI-posts');
}

// GET - Fetch all saved prompts
export async function GET() {
  try {
    const db = await getDatabase();
    const prompts = await db
      .collection('prompts')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

// POST - Save a new prompt
export async function POST(request) {
  try {
    const { title, content } = await request.json();
    
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const prompt = {
      title,
      content,
      createdAt: new Date(),
    };
    
    const result = await db.collection('prompts').insertOne(prompt);
    
    return NextResponse.json({ 
      prompt: { ...prompt, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error saving prompt:', error);
    return NextResponse.json(
      { error: 'Failed to save prompt' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a prompt
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    await db.collection('prompts').deleteOne({ _id: new ObjectId(id) });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}
