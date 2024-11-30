'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { LoadingModal } from '@/components/ui/loading-modal';

const SchemaViewer = dynamic(() => import('@/components/SchemaViewer'), { ssr: false });
const CodeEditor = dynamic(() => import('@/components/CodeEditor'), { ssr: false });

export default function SchemaPage() {
  const [schema, setSchema] = useState<{ sql: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const prompt = searchParams.get('prompt');

  useEffect(() => {
    const generateSchema = async () => {
      if (!prompt || hasGenerated) {
        if (!prompt) router.push('/');
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to generate schema');
        }

        const data = await response.json();
        if (data.sql) {
          setSchema({ sql: data.sql });
          setHasGenerated(true);
        }
      } catch (error) {
        console.error('Error generating schema:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    generateSchema();
  }, [prompt, router, hasGenerated]);

  if (isLoading || !schema) {
    return <LoadingModal isOpen={true} />;
  }

  return (
    <main className="h-screen flex flex-col">
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1"
      >
        <ResizablePanel defaultSize={50}>
          <div className="h-full w-full">
            <CodeEditor
              value={schema.sql}
              language="sql"
              onChange={sql => setSchema({ sql })}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>
          <div className="h-full w-full">
            <SchemaViewer 
              schema={schema} 
              onSchemaChange={sql => setSchema({ sql })}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}