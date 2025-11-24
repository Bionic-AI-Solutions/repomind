import { useState } from "react";
import { Wrench, Search, Shield, FileText, TestTube, Zap, X, Loader2, ChevronRight, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { searchRepositoryCode, analyzeFileQuality, generateArtifact } from "@/app/actions";

interface DevToolsProps {
    repoContext: { owner: string; repo: string; fileTree: any[] };
    onSendMessage: (role: "user" | "model", content: string) => void;
}

export function DevTools({ repoContext, onSendMessage }: DevToolsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'search' | 'quality' | 'generate' | 'help'>('search');
    const [loading, setLoading] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchType, setSearchType] = useState<'text' | 'regex' | 'ast'>('text');

    // Quality/Gen State
    const [selectedFile, setSelectedFile] = useState("");

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            const filePaths = repoContext.fileTree.map((f: any) => f.path);
            const results = await searchRepositoryCode(
                repoContext.owner,
                repoContext.repo,
                filePaths,
                searchQuery,
                searchType
            );

            let content = `### 🔍 Search Results for "${searchQuery}" (${searchType})\n\n`;
            if (results.length === 0) {
                content += "No matches found.";
            } else {
                content += `Found **${results.length}** matches:\n\n`;
                results.slice(0, 10).forEach(r => {
                    content += `- **${r.file}** (Line ${r.line}): \`${r.content.slice(0, 100).trim()}\`\n`;
                });
                if (results.length > 10) content += `\n*...and ${results.length - 10} more.*`;
            }

            onSendMessage("model", content);
            setIsOpen(false);
        } catch (error) {
            toast.error("Search failed");
        } finally {
            setLoading(false);
        }
    };

    const handleQualityAnalysis = async () => {
        if (!selectedFile) {
            toast.error("Please select a file");
            return;
        }

        setLoading(true);
        try {
            const report = await analyzeFileQuality(repoContext.owner, repoContext.repo, selectedFile);

            if (!report) {
                throw new Error("Analysis failed");
            }

            let content = `### 🛡️ Quality Report: ${selectedFile}\n\n`;
            content += `**Score**: ${report.score}/100\n`;
            content += `**Complexity**: ${report.metrics.complexity}\n`;
            content += `**Summary**: ${report.summary}\n\n`;

            if (report.issues.length > 0) {
                content += `**Issues**:\n`;
                report.issues.forEach(issue => {
                    content += `- [${issue.severity.toUpperCase()}] Line ${issue.line}: ${issue.message}\n`;
                });
            } else {
                content += "✅ No significant issues found.";
            }

            onSendMessage("model", content);
            setIsOpen(false);
        } catch (error) {
            toast.error("Analysis failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (type: 'doc' | 'test' | 'refactor') => {
        if (!selectedFile) {
            toast.error("Please select a file");
            return;
        }

        setLoading(true);
        try {
            const artifact = await generateArtifact(repoContext.owner, repoContext.repo, selectedFile, type);

            let title = "";
            switch (type) {
                case 'doc': title = "📝 Generated Documentation"; break;
                case 'test': title = "🧪 Generated Tests"; break;
                case 'refactor': title = "✨ Refactoring Suggestions"; break;
            }

            const content = `### ${title} for \`${selectedFile}\`\n\n\`\`\`typescript\n${artifact}\n\`\`\``;
            onSendMessage("model", content);
            setIsOpen(false);
        } catch (error) {
            toast.error("Generation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                title="Dev Tools"
            >
                <Wrench className="w-5 h-5" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-950/50">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Wrench className="w-5 h-5 text-purple-400" />
                                    Dev Tools
                                </h2>
                                <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex border-b border-white/10">
                                <button
                                    onClick={() => setActiveTab('search')}
                                    className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'search' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5' : 'text-zinc-400 hover:text-zinc-200'}`}
                                >
                                    <Search className="w-4 h-4" /> Search
                                </button>
                                <button
                                    onClick={() => setActiveTab('quality')}
                                    className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'quality' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5' : 'text-zinc-400 hover:text-zinc-200'}`}
                                >
                                    <Shield className="w-4 h-4" /> Quality
                                </button>
                                <button
                                    onClick={() => setActiveTab('generate')}
                                    className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'generate' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5' : 'text-zinc-400 hover:text-zinc-200'}`}
                                >
                                    <Zap className="w-4 h-4" /> Generate
                                </button>
                                <button
                                    onClick={() => setActiveTab('help')}
                                    className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'help' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5' : 'text-zinc-400 hover:text-zinc-200'}`}
                                >
                                    <HelpCircle className="w-4 h-4" /> Help
                                </button>
                            </div>

                            <div className="p-6 min-h-[300px]">
                                {activeTab === 'search' && (
                                    <form onSubmit={handleSearch} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-400 mb-1">Search Query</label>
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                                                placeholder="Function name, regex pattern..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-400 mb-1">Search Type</label>
                                            <div className="flex gap-2">
                                                {(['text', 'regex', 'ast'] as const).map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => setSearchType(type)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${searchType === type ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-zinc-800 border-white/10 text-zinc-400 hover:bg-zinc-700'}`}
                                                    >
                                                        {type.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading || !searchQuery}
                                            className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                            Run Search
                                        </button>
                                    </form>
                                )}

                                {(activeTab === 'quality' || activeTab === 'generate') && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-400 mb-1">Select File</label>
                                            <select
                                                value={selectedFile}
                                                onChange={(e) => setSelectedFile(e.target.value)}
                                                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500/50 outline-none appearance-none"
                                            >
                                                <option value="">-- Choose a file --</option>
                                                {repoContext.fileTree
                                                    .filter((f: any) => /\.(js|jsx|ts|tsx|py|go|rs|java)$/.test(f.path))
                                                    .map((f: any) => (
                                                        <option key={f.path} value={f.path}>{f.path}</option>
                                                    ))}
                                            </select>
                                        </div>

                                        {activeTab === 'quality' && (
                                            <button
                                                onClick={handleQualityAnalysis}
                                                disabled={loading || !selectedFile}
                                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                                Analyze Quality
                                            </button>
                                        )}

                                        {activeTab === 'generate' && (
                                            <div className="grid grid-cols-1 gap-2">
                                                <button
                                                    onClick={() => handleGenerate('doc')}
                                                    disabled={loading || !selectedFile}
                                                    className="p-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-left flex items-center gap-3 transition-colors disabled:opacity-50"
                                                >
                                                    <FileText className="w-5 h-5 text-green-400" />
                                                    <div>
                                                        <div className="text-sm font-medium text-white">Generate Documentation</div>
                                                        <div className="text-xs text-zinc-500">JSDoc/TSDoc comments</div>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => handleGenerate('test')}
                                                    disabled={loading || !selectedFile}
                                                    className="p-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-left flex items-center gap-3 transition-colors disabled:opacity-50"
                                                >
                                                    <TestTube className="w-5 h-5 text-blue-400" />
                                                    <div>
                                                        <div className="text-sm font-medium text-white">Generate Unit Tests</div>
                                                        <div className="text-xs text-zinc-500">Jest/Vitest templates</div>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => handleGenerate('refactor')}
                                                    disabled={loading || !selectedFile}
                                                    className="p-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-left flex items-center gap-3 transition-colors disabled:opacity-50"
                                                >
                                                    <Zap className="w-5 h-5 text-yellow-400" />
                                                    <div>
                                                        <div className="text-sm font-medium text-white">Suggest Refactoring</div>
                                                        <div className="text-xs text-zinc-500">Improve code quality</div>
                                                    </div>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'help' && (
                                    <div className="space-y-6 text-sm text-zinc-300">
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-white flex items-center gap-2">
                                                <Search className="w-4 h-4 text-purple-400" />
                                                How to Use Advanced Search
                                            </h3>
                                            <ol className="list-decimal list-inside space-y-1 text-zinc-400 ml-1">
                                                <li>Open a repo and click the <Wrench className="w-3 h-3 inline mx-1" /> Wrench icon.</li>
                                                <li>Select the <strong>Search</strong> tab.</li>
                                                <li>Type <code className="bg-zinc-800 px-1 rounded text-xs">ChatInterface</code> and select <strong>AST</strong>.</li>
                                                <li>See it find the component definition instantly.</li>
                                            </ol>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-white flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-blue-400" />
                                                How to Analyze Quality
                                            </h3>
                                            <ol className="list-decimal list-inside space-y-1 text-zinc-400 ml-1">
                                                <li>Click <Wrench className="w-3 h-3 inline mx-1" /> <strong>Quality</strong>.</li>
                                                <li>Select a file (e.g., <code className="bg-zinc-800 px-1 rounded text-xs">src/lib/github.ts</code>).</li>
                                                <li>Click <strong>Analyze Quality</strong>.</li>
                                                <li>Review the complexity score and AI feedback in the chat.</li>
                                            </ol>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-white flex items-center gap-2">
                                                <TestTube className="w-4 h-4 text-green-400" />
                                                How to Generate Tests
                                            </h3>
                                            <ol className="list-decimal list-inside space-y-1 text-zinc-400 ml-1">
                                                <li>Click <Wrench className="w-3 h-3 inline mx-1" /> <strong>Generate</strong>.</li>
                                                <li>Select a file.</li>
                                                <li>Click <strong>Generate Unit Tests</strong>.</li>
                                                <li>Copy the generated Jest code block.</li>
                                            </ol>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
