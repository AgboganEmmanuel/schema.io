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
        content: `Generate a database schema based on this description: ${prompt}. 
                  Provide the schema in both SQL and Prisma format. 
                  Format your response as JSON with two fields: 'sql' and 'prisma'.`
      }],
    });

    const response = message.content[0].text;
    let parsedResponse;
    
    try {
      parsedResponse = JSON.parse(response);
    } catch (e) {
      // Si la réponse n'est pas un JSON valide, on crée un objet avec les formats par défaut
      parsedResponse = {
        sql: response,
        prisma: '// Conversion en Prisma à implémenter'
      };
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate schema' },
      { status: 500 }
    );
  }
}