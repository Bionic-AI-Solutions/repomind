"use client";

import { useState } from "react";
import { File, Folder, FolderOpen, GitBranch, ChevronRight, ChevronDown, X, AlertCircle } from "lucide-react";
import { FileNode } from "@/lib/github";
import { cn } from "@/lib/utils";

interface RepoSidebarProps {
    fileTree: FileNode[];
    repoName: string;
    isOpen: boolean;
    onClose: () => void;
    onFileDoubleClick?: (filePath: string) => void;
    hiddenFiles?: { path: string; reason: string }[];
}

type TreeNode = {
    name: string;
    path: string;
    type: "blob" | "tree";
    children?: TreeNode[];
};

function buildTree(files: FileNode[]): TreeNode[] {
    const root: TreeNode[] = [];
    const map: Record<string, TreeNode> = {};

    files.forEach((file) => {
        const parts = file.path.split("/");
        let currentLevel = root;
        let currentPath = "";

        parts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            // Check if we already have this node at this level
            let existingNode = currentLevel.find((node) => node.name === part);

            if (!existingNode) {
                const isFile = index === parts.length - 1 && file.type === "blob";
                const newNode: TreeNode = {
                    name: part,
                    path: currentPath,
                    type: isFile ? "blob" : "tree",
                    children: isFile ? undefined : [],
                };

                currentLevel.push(newNode);
                existingNode = newNode;
            }

            if (existingNode.children) {
                currentLevel = existingNode.children;
            }
        });
    });

    // Sort: Folders first, then files
    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === "tree" ? -1 : 1;
        });
        nodes.forEach((node) => {
            if (node.children) sortNodes(node.children);
        });
    };

    sortNodes(root);
    return root;
}

function FileTreeNode({
    node,
    depth,
    onFileDoubleClick
}: {
    node: TreeNode;
    depth: number;
    onFileDoubleClick?: (filePath: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const isFolder = node.type === "tree";

    const handleDoubleClick = () => {
        if (!isFolder && onFileDoubleClick) {
            onFileDoubleClick(node.path);
        }
    };

    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-1.5 py-1 px-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded cursor-pointer select-none transition-colors",
                    depth > 0 && "ml-3"
                )}
                onClick={() => isFolder && setIsOpen(!isOpen)}
                onDoubleClick={handleDoubleClick}
            >
                {isFolder && (
                    <span className="text-zinc-600">
                        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </span>
                )}

                {isFolder ? (
                    isOpen ? (
                        <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : (
                        <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                    )
                ) : (
                    <File className="w-4 h-4 text-zinc-500 shrink-0" />
                )}

                <span className="truncate">{node.name}</span>
            </div>

            {isOpen && node.children && (
                <div className="border-l border-white/5 ml-2.5">
                    {node.children.map((child) => (
                        <FileTreeNode
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            onFileDoubleClick={onFileDoubleClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function RepoSidebar({ fileTree, repoName, isOpen, onClose, onFileDoubleClick, hiddenFiles = [] }: RepoSidebarProps) {
    const tree = buildTree(fileTree);
    const [showHiddenFiles, setShowHiddenFiles] = useState(false);

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "w-64 border-r border-white/10 bg-zinc-900/50 flex flex-col h-full overflow-hidden transition-transform duration-300 ease-in-out",
                // Mobile: fixed and slide in/out
                "md:relative md:translate-x-0",
                "fixed z-50",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-4 border-b border-white/10 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-between">
                    <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
                        <GitBranch className="w-4 h-4 text-purple-400" />
                        <span className="truncate" title={repoName}>{repoName}</span>
                    </h2>
                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="md:hidden p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {tree.map((node) => (
                        <FileTreeNode
                            key={node.path}
                            node={node}
                            depth={0}
                            onFileDoubleClick={onFileDoubleClick}
                        />
                    ))}
                </div>

                {hiddenFiles.length > 0 && (
                    <div className="p-3 border-t border-white/10 bg-zinc-900/80 backdrop-blur-sm">
                        <button
                            onClick={() => setShowHiddenFiles(true)}
                            className="w-full flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors p-2 hover:bg-white/5 rounded"
                        >
                            <AlertCircle className="w-4 h-4 text-yellow-500/50" />
                            <span>{hiddenFiles.length} system files hidden</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Hidden Files Modal */}
            {showHiddenFiles && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-yellow-500" />
                                Hidden Files
                            </h3>
                            <button
                                onClick={() => setShowHiddenFiles(false)}
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                            >
                                <X className="w-4 h-4 text-zinc-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            <p className="text-sm text-zinc-400 mb-4">
                                The following files and directories are hidden from the file tree to reduce noise and improve performance.
                            </p>
                            {hiddenFiles.map((file, i) => (
                                <div key={i} className="flex items-start justify-between gap-4 p-2 rounded bg-zinc-950/50 border border-white/5 text-sm">
                                    <span className="font-mono text-zinc-300 break-all">{file.path}</span>
                                    <span className="text-xs text-zinc-500 whitespace-nowrap">{file.reason}</span>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-white/10 bg-zinc-900/50">
                            <button
                                onClick={() => setShowHiddenFiles(false)}
                                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
