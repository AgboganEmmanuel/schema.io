import { HfInference } from '@huggingface/inference';

if (!process.env.HUGGING_FACE_TOKEN) {
  throw new Error('Missing HUGGING_FACE_TOKEN environment variable');
}

const hf = new HfInference(process.env.HUGGING_FACE_TOKEN);

export class SchemaGenerationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SchemaGenerationError';
  }
}

const SYSTEM_PROMPT = `You are a helpful assistant that generates SQL schema based on user requirements.
Your task is to create clear and efficient SQL schema. Only output the SQL code, no additional text.
Use standard SQL syntax and include appropriate data types and constraints.`;

export async function generateSchema(prompt: string): Promise<string> {
  try {
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser Request: ${prompt}\n\nSQL Schema:`;
    
    const response = await hf.textGeneration({
      model: 'codellama/CodeLlama-34b-Instruct-hf',
      inputs: fullPrompt,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.7,
        top_p: 0.95,
        return_full_text: false,
      }
    });

    if (!response.generated_text) {
      throw new SchemaGenerationError('No content received from model', 'NO_CONTENT');
    }

    // Clean up the response to only include SQL
    const sqlContent = response.generated_text
      .trim()
      .replace(/```sql|```/g, '')
      .trim();

    if (!sqlContent) {
      throw new SchemaGenerationError('Generated content is empty', 'EMPTY_CONTENT');
    }

    return sqlContent;
  } catch (error: Error | unknown) {
    console.error('Error generating schema:', error);
    
    if (error instanceof SchemaGenerationError) {
      throw error;
    }
    
    throw new SchemaGenerationError(
      error instanceof Error ? error.message : 'Failed to generate schema',
      'UNKNOWN'
    );
  }
}
