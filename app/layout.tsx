import "./globals.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b sticky top-0 z-10 bg-white/70 backdrop-blur">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <h1 className="text-xl font-semibold">RAG Financial AI Agent</h1>
              <a
                href="https://ollama.ai"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted-foreground hover:underline"
              >
                Powered by LLaMA via Ollama
              </a>
            </div>
          </header>
          <main className="container mx-auto px-4 py-6 flex-1">{children}</main>
          <footer className="border-t text-center text-xs text-muted-foreground py-4">
            For research/educational purposes. Not financial advice.
          </footer>
        </div>
      </body>
    </html>
  );
}
