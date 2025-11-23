"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Github, ArrowRight, Loader2 } from "lucide-react";
import { fetchGitHubData } from "./actions";
import FeatureTiles from "@/components/FeatureTiles";
import { WhatsNewBadge } from "@/components/WhatsNewBadge";

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError("");

    try {
      const result = await fetchGitHubData(input);

      if (result.error) {
        setError(result.error);
      } else {
        // Store data in localStorage or pass via query params/state manager
        // For simplicity, we'll use query params for the ID and fetch again or use a context
        // Let's just navigate to /chat with the query
        router.push(`/chat?q=${encodeURIComponent(input)}`);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col bg-black text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        {/* What's New Badge */}
        <WhatsNewBadge />

        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[128px]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="z-10 flex flex-col items-center text-center max-w-2xl"
        >
          <div className="mb-8 p-4 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
            <Github className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            RepoMind
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-lg">
            Deep dive into any repository or profile.
            Analyze code, ask questions, and understand projects in seconds.
          </p>

          <form onSubmit={handleSubmit} className="w-full max-w-md relative group px-4 md:px-0">
            <div className="conic-border-container flex items-center bg-zinc-900 p-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="username or username/repo"
                className="flex-1 bg-transparent border-none outline-none text-white px-4 py-3 placeholder-zinc-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-white text-black p-3 rounded-md hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </form>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-red-400 text-sm"
            >
              {error}
            </motion.p>
          )}

          <div className="mt-16 flex flex-wrap justify-center gap-4 text-sm text-zinc-500 px-4">
            <span>Try:</span>
            <button onClick={() => setInput("torvalds")} className="hover:text-white transition-colors">torvalds</button>
            <span>•</span>
            <button onClick={() => setInput("facebook/react")} className="hover:text-white transition-colors">facebook/react</button>
            <span>•</span>
            <button onClick={() => setInput("vercel/next.js")} className="hover:text-white transition-colors">vercel/next.js</button>
          </div>
        </motion.div>
      </section>

      {/* Feature Tiles Section */}
      <section className="relative py-20">
        {/* Background gradient for features section */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10">
          <FeatureTiles />
        </div>
      </section>
    </main>
  );
}
