import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Basic inline formatting: **bold**, *italic*, `code`
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className={`px-1.5 py-0.5 rounded text-xs font-mono border ${
              isLight
                ? 'bg-blue-50 text-blue-800 border-blue-200 font-semibold'
                : 'bg-blue-500/15 text-blue-300 border-blue-500/20'
            }`}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong
            key={i}
            className={`font-bold ${isLight ? 'text-slate-950 font-extrabold' : 'text-white'}`}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em
            key={i}
            className={`italic ${isLight ? 'text-slate-800 font-medium' : 'text-slate-200'}`}
          >
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';
  let blockIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block check
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim() || 'code';
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        const codeText = codeBuffer.join('\n');
        const currentIndex = blockIndex++;
        elements.push(
          <div
            key={`code-${currentIndex}`}
            className={`my-3 rounded-xl overflow-hidden border shadow-sm ${
              isLight
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-black/50 border-white/15 text-emerald-300'
            }`}
          >
            <div
              className={`flex items-center justify-between px-3.5 py-1.5 border-b text-[11px] ${
                isLight
                  ? 'bg-slate-800 border-slate-700 text-slate-300'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              <span className="font-mono uppercase text-blue-400 font-bold">{codeLang}</span>
              <button
                type="button"
                onClick={() => handleCopy(codeText, currentIndex)}
                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
              >
                {copiedIndex === currentIndex ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              <code>{codeText}</code>
            </pre>
          </div>
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      elements.push(
        <div
          key={`quote-${i}`}
          className={`my-2 pl-3.5 py-2 border-l-4 rounded-r-lg text-sm leading-relaxed ${
            isLight
              ? 'border-blue-600 bg-blue-50/70 text-slate-800 font-medium'
              : 'border-blue-400 bg-blue-500/10 text-slate-200'
          }`}
        >
          {renderFormattedText(line.replace(/^>\s*/, ''))}
        </div>
      );
      continue;
    }

    // Divider
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(
        <hr
          key={`hr-${i}`}
          className={`my-3 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}
        />
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h3-${i}`}
          className={`text-base font-bold mt-4 mb-2 flex items-center gap-2 ${
            isLight ? 'text-blue-700' : 'text-blue-400'
          }`}
        >
          {renderFormattedText(line.replace('### ', ''))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={`h2-${i}`}
          className={`text-lg font-bold mt-5 mb-2.5 pb-1 border-b ${
            isLight
              ? 'text-slate-900 border-slate-200'
              : 'text-white border-white/10'
          }`}
        >
          {renderFormattedText(line.replace('## ', ''))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2
          key={`h1-${i}`}
          className={`text-xl font-extrabold mt-6 mb-3 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}
        >
          {renderFormattedText(line.replace('# ', ''))}
        </h2>
      );
      continue;
    }

    // Bullet lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
      const cleanLine = line.trim().replace(/^[-*•]\s+/, '');
      elements.push(
        <div
          key={`li-${i}`}
          className={`flex items-start gap-2.5 my-1.5 pl-2 text-sm leading-relaxed ${
            isLight ? 'text-slate-800' : 'text-slate-100'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
              isLight ? 'bg-blue-600' : 'bg-blue-400'
            }`}
          />
          <div className="flex-1">{renderFormattedText(cleanLine)}</div>
        </div>
      );
      continue;
    }

    // Numbered lists (1. , 2. )
    const numberedMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      elements.push(
        <div
          key={`nli-${i}`}
          className={`flex items-start gap-2.5 my-1.5 pl-2 text-sm leading-relaxed ${
            isLight ? 'text-slate-800' : 'text-slate-100'
          }`}
        >
          <span
            className={`font-bold text-xs px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${
              isLight
                ? 'text-blue-700 bg-blue-100 border-blue-200'
                : 'text-blue-400 bg-blue-500/15 border-blue-500/30'
            }`}
          >
            {numberedMatch[1]}
          </span>
          <div className="flex-1">{renderFormattedText(numberedMatch[2])}</div>
        </div>
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Standard Paragraph
    elements.push(
      <p
        key={`p-${i}`}
        className={`my-1.5 text-sm leading-relaxed font-normal ${
          isLight ? 'text-slate-800' : 'text-slate-100'
        }`}
      >
        {renderFormattedText(line)}
      </p>
    );
  }

  return <div className={`space-y-0.5 ${className}`}>{elements}</div>;
};
