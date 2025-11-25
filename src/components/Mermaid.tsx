import { useState, useEffect, useMemo, useRef } from "react";
import mermaid from "mermaid";
import { validateMermaidSyntax, sanitizeMermaidCode, getFallbackTemplate, generateMermaidFromJSON } from "@/lib/diagram-utils";
import { Download, X, Maximize2, ZoomIn, Sparkles } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas-pro";
import { motion, AnimatePresence } from "framer-motion";

// Initialize mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'strict', // Prevent XSS attacks by enabling HTML sanitization
    themeVariables: {
        primaryColor: '#18181b', // zinc-900
        primaryTextColor: '#e4e4e7', // zinc-200
        primaryBorderColor: '#3f3f46', // zinc-700
        lineColor: '#a1a1aa', // zinc-400
        secondaryColor: '#27272a', // zinc-800
        tertiaryColor: '#27272a', // zinc-800
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    }
});

export const Mermaid = ({ chart }: { chart: string }) => {
    const [svg, setSvg] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const diagramRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Use a stable ID based on chart content to prevent re-renders
    const id = useMemo(() => {
        // Simple hash function for stable ID
        let hash = 0;
        for (let i = 0; i < chart.length; i++) {
            const char = chart.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `mermaid-${Math.abs(hash).toString(36)}`;
    }, [chart]);

    useEffect(() => {
        if (!chart) return;

        let mounted = true;

        const renderDiagram = async () => {
            try {
                let codeToRender = chart;

                // Check if the content is JSON (starts with {)
                // This handles cases where the LLM uses ```mermaid for JSON content
                if (chart.trim().startsWith('{')) {
                    try {
                        console.log('🔍 Detected JSON content in Mermaid block, converting...');
                        const data = JSON.parse(chart);
                        codeToRender = generateMermaidFromJSON(data);
                        console.log('✅ Converted JSON to Mermaid:', codeToRender);
                    } catch (e) {
                        console.warn('⚠️ Failed to parse JSON in Mermaid block:', e);
                        // Continue with original content if parsing fails
                    }
                }

                // Layer 1: Basic sanitization (fast, catches obvious issues)
                console.log('🔄 Attempting Layer 1: Basic sanitization...');
                const sanitized = sanitizeMermaidCode(codeToRender);
                const validation = validateMermaidSyntax(sanitized);

                if (!validation.valid) {
                    console.warn('⚠️ Validation warning:', validation.error);
                }

                // Try rendering with sanitized code
                try {
                    const { svg } = await mermaid.render(id, sanitized);
                    if (mounted) {
                        setSvg(svg);
                        setError(null);
                        console.log('✅ Layer 1 successful: Basic sanitization worked');
                    }
                    return; // Success!
                } catch (renderError: any) {
                    console.warn('❌ Layer 1 failed:', renderError.message || 'Render error');
                    if (mounted) {
                        // Sanitize error message to remove internal IDs (e.g., #dmermaid-...) and parse errors
                        const errorMessage = renderError.message || 'Syntax error in diagram';
                        const isInternalError = errorMessage.includes('dmermaid') ||
                            errorMessage.includes('#') ||
                            errorMessage.startsWith('Parse error') ||
                            errorMessage.includes('mermaid version');

                        const sanitizedError = isInternalError ? 'Syntax error in diagram' : errorMessage;
                        setError(sanitizedError);
                    }
                }
            } catch (error: any) {
                console.error('Complete render failure:', error);
                if (mounted) {
                    setError('Failed to render diagram');
                }
            }
        };

        renderDiagram();

        return () => {
            mounted = false;
        };
    }, [chart, id]);

    const handleRetry = async () => {
        if (!chart) return;
        setError(null);

        try {
            // Layer 2: AI-powered syntax fix (intelligent correction)
            console.log('🔄 Attempting Layer 2: AI-powered fix...');
            const sanitized = sanitizeMermaidCode(chart);

            const response = await fetch('/api/fix-mermaid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: sanitized })
            });

            if (response.ok) {
                const { fixed } = await response.json();
                if (fixed) {
                    const { svg } = await mermaid.render(id + '-fixed', fixed);
                    setSvg(svg);
                    setError(null);
                    console.log('✅ Layer 2 successful: AI fix worked');
                    return;
                }
            }
            setError("Could not automatically fix the diagram. Please try asking again.");
        } catch (e: any) {
            setError(e.message || "Failed to fix diagram");
        }
    };

    const exportToPNG = async (e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent modal opening if clicking export button
        // Use the ref that is currently visible (modal or inline)
        const element = isModalOpen ? modalRef.current : diagramRef.current;
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#18181b', // zinc-900
                scale: 2, // Higher resolution
            });

            const link = document.createElement('a');
            link.download = `architecture-diagram-${Date.now()}.png`;
            link.href = canvas.toDataURL();
            link.click();
            toast.success('Diagram exported successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export diagram');
        }
    };

    return (
        <>
            <div
                className="my-4 group relative cursor-zoom-in"
                onClick={() => setIsModalOpen(true)}
            >
                <div
                    ref={diagramRef}
                    className="overflow-x-auto bg-zinc-950/50 p-4 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                    dangerouslySetInnerHTML={{ __html: svg }}
                    style={{ minHeight: svg ? 'auto' : '200px' }}
                />

                {/* Overlay controls */}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                        onClick={exportToPNG}
                        className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg backdrop-blur-sm"
                        title="Export as PNG"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg backdrop-blur-sm"
                        title="View Fullscreen"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 backdrop-blur-sm rounded-lg p-4 text-center">
                        <p className="text-red-400 text-sm mb-3 max-w-[90%] break-words">{error}</p>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRetry();
                            }}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            Fix Diagram
                        </button>
                    </div>
                )}
            </div>

            {/* Fullscreen Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-8"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900/50">
                                <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                    <ZoomIn className="w-4 h-4" />
                                    Diagram Preview
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={exportToPNG}
                                        className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                        title="Export as PNG"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                        title="Close"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-auto p-4 bg-zinc-950/50 relative custom-scrollbar">
                                <div
                                    ref={modalRef}
                                    className="min-w-min min-h-min [&>svg]:w-auto [&>svg]:h-auto"
                                    dangerouslySetInnerHTML={{ __html: svg }}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
