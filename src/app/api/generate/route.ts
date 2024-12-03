import { NextResponse } from 'next/server';
import { generateSchema } from '@/lib/huggingface';

export async function POST(request: Request) {
  if (!process.env.HUGGING_FACE_TOKEN) {
    return NextResponse.json(
      { error: 'Hugging Face API token not configured' },
      { status: 500 }
    );
  }

  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const sql = await generateSchema(prompt);
    
    if (!sql) {
      return NextResponse.json(
        { error: 'Failed to generate SQL schema' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sql });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate schema' },
      { status: 500 }
    );
  }
}