'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { LoadingModal } from '@/components/ui/loading-modal';

const SchemaViewer = dynamic(() => import('@/components/SchemaViewer'), { ssr: false });
const CodeEditor = dynamic(() => import('@/components/CodeEditor'), { ssr: false });

function SchemaContent() {
  const [schema, setSchema] = useState<{ sql: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const prompt = searchParams.get('prompt');

  useEffect(() => {
    let mounted = true;

    const generateSchema = async () => {
      if (!prompt || hasGenerated) {
        if (!prompt) {
          setSchema(null);
          router.push('/');
        }
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to generate schema');
        }

        if (mounted) {
          if (data.sql) {
            setSchema({ sql: data.sql });
            setHasGenerated(true);
          } else {
            setError('No SQL schema generated');
            setSchema(null);
          }
        }
      } catch (error) {
        console.error('Error generating schema:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to generate schema');
          setSchema(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    generateSchema();

    return () => {
      mounted = false;
    };
  }, [prompt, hasGenerated, router]);

  if (isLoading) {
    return <LoadingModal isOpen={true} />;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 min-h-0"
      >
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full w-full p-2">
            {schema && schema.sql && (
              <div className="h-full w-full">
                <CodeEditor
                  value={schema.sql}
                  language="sql"
                  onChange={sql => setSchema(prevSchema => prevSchema ? { sql: sql || prevSchema.sql } : null)}
                />
              </div>
            )}
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full w-full p-2">
            {schema && schema.sql && (
              <div className="h-full w-full">
                <SchemaViewer 
                  schema={schema} 
                  onSchemaChange={sql => setSchema(prevSchema => prevSchema ? {
                    ...prevSchema,
                    sql: sql
                  } : null)}
                />
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}

export default function SchemaPage() {
  return (
    <Suspense fallback={<LoadingModal isOpen={true} />}>
      <SchemaContent />
    </Suspense>
  );
}