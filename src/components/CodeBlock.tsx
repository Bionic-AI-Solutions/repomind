"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
    language: string;
    value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative my-4 rounded-lg border border-white/10 bg-[#1e1e1e] min-w-0 max-w-full">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-white/5">
                <span className="text-xs text-zinc-400 font-mono uppercase">{language || 'text'}</span>
                <button
                    onClick={handleCopy}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors flex-shrink-0"
                    title="Copy code"
                >
                    {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                    ) : (
                        <Copy className="w-4 h-4" />
                    )}
                </button>
            </div>
            <div className="overflow-hidden max-w-full">
                <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        padding: '1rem',
                        background: 'transparent',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        maxWidth: '100%',
                        overflowX: 'auto',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                    }}
                    wrapLines={false}
                    wrapLongLines={false}
                >
                    {value}
                </SyntaxHighlighter>
            </div>
        </div>
    );
}
