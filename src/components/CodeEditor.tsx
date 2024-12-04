import { Editor } from '@monaco-editor/react';
import { useTheme } from '@/components/ui/theme-provider';
import { useEffect, useState } from 'react';

interface CodeEditorProps {
  value: string;
  language?: string;
  onChange?: ((value: string | undefined) => void);
}

function CodeEditor({ value, language = 'sql', onChange }: CodeEditorProps) {
  const { theme } = useTheme();
  const [isCopied, setIsCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-0 right-0 z-10 m-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 bg-gray-800 rounded hover:text-gray-50 hover:bg-gray-700"
        >
          {isCopied ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3"
              >
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <Editor
        height="100%"
        defaultLanguage={language}
        value={value}
        onChange={onChange}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: !onChange,
          automaticLayout: true,
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            useShadows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          overviewRulerLanes: 0,
          lineDecorationsWidth: 0,
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true
          },
          fontFamily: "'JetBrains Mono', 'Fira Code', Monaco, 'Courier New', monospace",
          fontLigatures: true,
          padding: { top: 16, bottom: 16 },
        }}
        className={theme === 'dark' ? 'dark-editor' : 'light-editor'}
      />
    </div>
  );
}

export default CodeEditor;