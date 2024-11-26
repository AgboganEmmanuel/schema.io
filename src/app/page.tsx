'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SchemaViewer = dynamic(() => import('@/components/SchemaViewer'), { ssr: false });
const CodeEditor = dynamic(() => import('@/components/CodeEditor'), { ssr: false });

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [schema, setSchema] = useState<{ sql: string; prisma: string }>({ sql: '', prisma: '' });
  const [loading, setLoading] = useState(false);

  const generateSchema = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      setSchema(data);
    } catch (error) {
      console.error('Error generating schema:', error);
    }
    setLoading(false);
  };

  return (
    <main className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Schema.io - Database Schema Generator</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Textarea
            placeholder="Describe your application's database structure..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="h-40"
          />
          <Button 
            onClick={generateSchema}
            disabled={loading || !prompt}
          >
            {loading ? 'Generating...' : 'Generate Schema'}
          </Button>
        </div>

        <div className="border rounded-lg p-4">
          <Tabs defaultValue="visual">
            <TabsList>
              <TabsTrigger value="visual">Visual Schema</TabsTrigger>
              <TabsTrigger value="sql">SQL</TabsTrigger>
              <TabsTrigger value="prisma">Prisma</TabsTrigger>
            </TabsList>
            <TabsContent value="visual" className="h-[600px]">
              <SchemaViewer schema={schema} />
            </TabsContent>
            <TabsContent value="sql">
              <CodeEditor
                value={schema.sql}
                language="sql"
                onChange={(value) => setSchema(prev => ({ ...prev, sql: value }))}
              />
            </TabsContent>
            <TabsContent value="prisma">
              <CodeEditor
                value={schema.prisma}
                language="prisma"
                onChange={(value) => setSchema(prev => ({ ...prev, prisma: value }))}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
