import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    const message = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Generate a standard SQL database schema based on this description: ${prompt}. 
                  Only provide standard SQL CREATE TABLE statements with standard SQL data types.
                  Do not include any Prisma, ORM-specific syntax, or database-specific features.
                  Each CREATE TABLE statement should be separated by a blank line.
                  Include appropriate PRIMARY KEY and FOREIGN KEY constraints using standard SQL syntax.`
      }],
    });

    const response = message.content.find(block => 
      block.type === 'text' && 'text' in block 
    )?.text || '';

    return NextResponse.json({ sql: response });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate schema' },
      { status: 500 }
    );
  }
}