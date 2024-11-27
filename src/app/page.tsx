'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

const SchemaViewer = dynamic(() => import('@/components/SchemaViewer'), { ssr: false });
const CodeEditor = dynamic(() => import('@/components/CodeEditor'), { ssr: false });

const defaultSchema = {
  sql: `CREATE TABLE User (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Post (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  content TEXT,
  published BOOLEAN DEFAULT false,
  author_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES User(id)
);`
};

export default function Home() {
  const [schema, setSchema] = useState<{ sql: string }>(defaultSchema);

  const resetSchema = () => {
    setSchema(defaultSchema);
  };

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
            <SchemaViewer schema={schema} onSchemaChange={sql => setSchema({ sql })} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}