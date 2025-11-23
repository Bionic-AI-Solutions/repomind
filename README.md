# RepoMind

![RepoMind Banner](/public/repomind.png)

**[RepoMind](https://repomind-ai.vercel.app)** is an intelligent coding assistant that allows you to "chat" with any public GitHub repository. It uses Agentic RAG (Retrieval-Augmented Generation) to perform deep code analysis without needing to clone the entire codebase.

## Features

*   **Agentic Context Loading**: Smartly selects and reads only the relevant files to answer your questions.
*   **Deep Analysis**: Understands code structure, dependencies, and logic.
*   **Premium UI**: Minimalist dark mode design with smooth animations.
*   **Repo Visualization**: Interactive file tree sidebar.

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/403errors/repomind.git
    cd repomind
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up environment variables**:
    Copy `.env.example` to `.env.local` and add your API keys:
    ```bash
    cp .env.example .env.local
    ```
    *   `GITHUB_TOKEN`: Your GitHub Personal Access Token.
    *   `NEXT_PUBLIC_GEMINI_API_KEY`: Your Google Gemini API Key.

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

5.  **Open the app**:
    Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

*   **Framework**: Next.js 16 (App Router)
*   **AI**: Google Gemini 2.5 Flash
*   **Styling**: Tailwind CSS 4
*   **Animations**: Framer Motion
*   **Icons**: Lucide React
