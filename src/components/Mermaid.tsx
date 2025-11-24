import { useState, useEffect, useMemo, useRef } from "react";
import mermaid from "mermaid";
import { validateMermaidSyntax, sanitizeMermaidCode, getFallbackTemplate } from "@/lib/diagram-utils";
import { Download, X, Maximize2, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas-pro";
import { motion, AnimatePresence } from "framer-motion";

// Initialize mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
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
        if (chart) {
            // Validate and sanitize
            const sanitized = sanitizeMermaidCode(chart);
            const validation = validateMermaidSyntax(sanitized);

            if (!validation.valid) {
                console.warn('Invalid Mermaid syntax, using fallback:', validation.error);
                const fallback = getFallbackTemplate(chart);
                mermaid.render(id, fallback).then(({ svg }) => setSvg(svg));
                return;
            }

            mermaid.render(id, sanitized).then(({ svg }) => {
                setSvg(svg);
                setError(null);
            }).catch((error) => {
                console.error("Mermaid render error:", error);
                setError("Failed to render diagram");
                // Try fallback on render error too
                const fallback = getFallbackTemplate(chart);
                mermaid.render(id, fallback).then(({ svg }) => setSvg(svg)).catch(() => { });
            });
        }
    }, [chart, id]);

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

                {error && <div className="text-red-500 text-xs p-2">{error}</div>}
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
                            <div className="flex-1 overflow-auto p-8 bg-zinc-950/50 flex items-center justify-center">
                                <div
                                    ref={modalRef}
                                    className="min-w-min"
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
