"use client";

import { X, Sparkles, User, Search, Code2, Menu, FileCode, Wrench, Shield, Github, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WhatsNewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
    if (!isOpen) return null;

    const features = [
        {
            icon: <Wrench className="w-6 h-6" />,
            title: "Dev Tools Suite",
            description: "Advanced Search (Regex/AST), Code Quality Analysis, and Automated Generators (Docs/Tests).",
            isNew: true,
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: "Zero-Cost Security",
            description: "Vulnerability scanning using pattern matching and Gemini AI without external paid APIs.",
            isNew: true,
        },
        {
            icon: <Github className="w-6 h-6" />,
            title: "Enhanced Data",
            description: "Precise language statistics via GraphQL and commit history for deeper insights.",
            isNew: true,
        },
        {
            icon: <Save className="w-6 h-6" />,
            title: "Auto-Persistence",
            description: "Conversations are now automatically saved locally and restored instantly.",
            isNew: true,
        },
        {
            icon: <Sparkles className="w-6 h-6" />,
            title: "Smart Caching",
            description: "Instant load times for previously visited profiles and repositories.",
            isNew: false,
        },
        {
            icon: <Menu className="w-6 h-6" />,
            title: "Mobile Experience",
            description: "Optimized layout for mobile devices with improved navigation and touch controls.",
            isNew: false,
        },
        {
            icon: <Code2 className="w-6 h-6" />,
            title: "Repo Chat",
            description: "Deep dive into repositories with AI-powered chat and file analysis.",
            isNew: false,
        },
        {
            icon: <FileCode className="w-6 h-6" />,
            title: "File Preview",
            description: "Instant syntax-highlighted previews for any file in the repository.",
            isNew: false,
        },
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl max-h-[85vh] bg-zinc-900 border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-purple-600/10 to-blue-600/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600 rounded-lg">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">What's New in v1.2</h2>
                                <p className="text-sm text-zinc-400">Latest features and improvements</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-zinc-400 hover:text-white" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {features.map((feature, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex flex-col gap-3 p-4 bg-zinc-800/50 border border-white/5 rounded-xl hover:border-purple-600/30 transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg text-white shrink-0">
                                            {feature.icon}
                                        </div>
                                        {feature.isNew && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                                                NEW
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-1">{feature.title}</h3>
                                        <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/10 bg-zinc-900/80 backdrop-blur-sm text-center">
                        <p className="text-sm text-zinc-500">
                            More features coming soon! Stay tuned 🚀
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
