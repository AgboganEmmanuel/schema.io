'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/schema?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <main className="h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-6">
        <h1 className="text-4xl font-bold mb-8 text-center">Schema Generator</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium mb-2">
              Tell us about your application
            </label>
            <textarea
              id="prompt"
              className="w-full p-3 border rounded-md min-h-[100px] bg-black text-white placeholder-white"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Create a database schema for a blog application with users and posts"
            />
          </div>
          <div className="flex justify-center">
            <button
              type="submit"
              className="py-2 px-4 bg-blue-600 text-white rounded-md"
            >
              Generate
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}