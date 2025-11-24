"use client";

import { useState } from "react";
import { RepoSidebar } from "./RepoSidebar";
import { ChatInterface } from "./ChatInterface";
import { FilePreview } from "./FilePreview";

interface RepoLayoutProps {
    fileTree: any[];
    repoName: string;
    owner: string;
    repo: string;
    hiddenFiles?: { path: string; reason: string }[];
}

export function RepoLayout({ fileTree, repoName, owner, repo, hiddenFiles = [] }: RepoLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<string | null>(null);

    const handleFileDoubleClick = (filePath: string) => {
        setPreviewFile(filePath);
        // Close sidebar on mobile after selecting a file
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    };

    return (
        <>
            <div className="flex h-screen bg-black overflow-hidden">
                <RepoSidebar
                    fileTree={fileTree}
                    repoName={repoName}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    onFileDoubleClick={handleFileDoubleClick}
                    hiddenFiles={hiddenFiles}
                />
                <div className="flex-1 h-full flex flex-col">
                    {/* Hamburger button for mobile */}
                    <ChatInterface
                        repoContext={{
                            owner,
                            repo,
                            fileTree
                        }}
                        onToggleSidebar={() => setSidebarOpen(true)}
                    />
                </div>
            </div>

            <FilePreview
                isOpen={previewFile !== null}
                filePath={previewFile}
                repoOwner={owner}
                repoName={repo}
                onClose={() => setPreviewFile(null)}
            />
        </>
    );
}
