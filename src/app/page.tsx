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
              Décrivez votre schéma
            </label>
            <textarea
              id="prompt"
              className="w-full p-3 border rounded-md min-h-[100px] bg-background"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Exemple: Créer un schéma de base de données pour une application de blog avec des utilisateurs et des articles"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Générer le schéma
          </button>
        </form>
      </div>
    </main>
  );
}