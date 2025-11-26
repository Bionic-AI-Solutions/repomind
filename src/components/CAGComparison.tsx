"use client";

import { motion } from "framer-motion";
import { Check, X, Brain, Database, Zap, HardDrive } from "lucide-react";

export default function CAGComparison() {
    return (
        <section id="cag-comparison" className="py-24 px-4 relative overflow-hidden">
            <div className="max-w-6xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        CAG vs. Traditional RAG
                    </h2>
                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                        RepoMind uses <strong>Context Augmented Generation (CAG)</strong>. We don't just retrieve fragments; we understand the whole picture.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Traditional RAG Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        whileHover={{ y: -5, scale: 1.02 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4 }}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm hover:bg-zinc-900/80 hover:border-zinc-700 transition-colors cursor-default"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-zinc-800 rounded-lg">
                                <Database className="w-6 h-6 text-zinc-400" />
                            </div>
                            <h3 className="text-2xl font-semibold text-zinc-300">Traditional RAG</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="mt-1 p-1 bg-red-500/10 rounded-full">
                                    <X className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-zinc-200">Fragmented Context</h4>
                                    <p className="text-sm text-zinc-500 mt-1">Chops code into small, disconnected vector chunks.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="mt-1 p-1 bg-red-500/10 rounded-full">
                                    <X className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-zinc-200">Similarity Search</h4>
                                    <p className="text-sm text-zinc-500 mt-1">Relies on fuzzy matching which often misses logic.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="mt-1 p-1 bg-red-500/10 rounded-full">
                                    <X className="w-4 h-4 text-red-500" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-zinc-200">Stateless</h4>
                                    <p className="text-sm text-zinc-500 mt-1">Forgets everything after each query.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* RepoMind CAG Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        whileHover={{ y: -5, scale: 1.02 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4 }}
                        className="bg-gradient-to-b from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden hover:border-blue-500/50 transition-colors cursor-default"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full" />

                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-blue-500/20 rounded-lg">
                                <Brain className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="text-2xl font-semibold text-white">RepoMind (CAG)</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="mt-1 p-1 bg-green-500/10 rounded-full">
                                    <Check className="w-4 h-4 text-green-400" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-white">Full File Context</h4>
                                    <p className="text-sm text-zinc-400 mt-1">Loads entire relevant files into the 1M+ token window.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="mt-1 p-1 bg-green-500/10 rounded-full">
                                    <Check className="w-4 h-4 text-green-400" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-white">Smart Agent Selection</h4>
                                    <p className="text-sm text-zinc-400 mt-1">AI intelligently picks files based on dependency graphs.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="mt-1 p-1 bg-green-500/10 rounded-full">
                                    <Check className="w-4 h-4 text-green-400" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-white">KV Caching</h4>
                                    <p className="text-sm text-zinc-400 mt-1">Remembers context for instant follow-up answers.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
