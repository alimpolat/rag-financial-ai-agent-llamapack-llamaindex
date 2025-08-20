"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Send, FileText } from "lucide-react";

type Source = { score?: number; text?: string; metadata?: Record<string, any> };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };

export default function HomePage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topK, setTopK] = useState<number>(6);
  const [enableLLMRerank, setEnableLLMRerank] = useState<boolean>(false);
  const [sentenceWindowSize, setSentenceWindowSize] = useState<number>(3);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onUpload = async () => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      alert(`Ingested ${json.ingested} file(s).`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };

  const onAsk = async () => {
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      // Stream tokens via SSE
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, topK, enableLLMRerank, sentenceWindowSize }),
      });
      if (!res.ok || !res.body) {
        const txt = await res.text();
        throw new Error(txt || "Stream failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let answer = "";
      let sources: Source[] | undefined;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split("\n\n");
        for (const evt of events) {
          if (!evt.trim()) continue;
          if (evt.startsWith("event: ")) {
            const lines = evt.split("\n");
            const eventName = lines[0].slice("event: ".length).trim();
            const dataLine = lines.find((l) => l.startsWith("data: ")) || "";
            const dataJson = dataLine.slice("data: ".length);
            if (eventName === "sources") {
              try {
                const payload = JSON.parse(dataJson);
                sources = payload.sources as Source[];
              } catch {}
            }
          } else if (evt.startsWith("data: ")) {
            const token = evt.slice("data: ".length);
            answer += token;
            setMessages((m) => {
              const head = m.slice(0, -0);
              const last = m[m.length - 1];
              // ensure we append to a live assistant message as we stream
              if (last && last.role === "assistant") {
                const updated = [...m];
                updated[updated.length - 1] = { ...last, content: answer };
                return updated;
              }
              return [...m, { role: "assistant", content: answer }];
            });
          }
        }
      }

      // attach sources at end
      if (sources) {
        setMessages((m) => {
          const updated = [...m];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = { ...last, sources };
          }
          return updated;
        });
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Upload Knowledge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            multiple
            accept=".pdf,.docx,.html,.htm,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/html,application/xhtml+xml,text/plain,text/markdown"
            onChange={(e) => setFiles(e.target.files)}
          />
          <div className="text-xs text-muted-foreground">Supported: PDF, DOCX, HTML, TXT, MD.</div>
          <Button disabled={uploading || !files?.length} onClick={onUpload}>
            {uploading ? "Uploading..." : "Ingest Files"}
          </Button>
        </CardContent>
      </Card>

      <Card className="md:row-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Financial Q&A</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[420px] overflow-y-auto border rounded-md p-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <div className={
                  "inline-block rounded-md px-3 py-2 text-sm " +
                  (m.role === "user" ? "bg-secondary" : "bg-accent")
                }>
                  <div>{m.content}</div>
                  {m.role === "assistant" && m.sources?.length ? (
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <div className="font-medium">Sources:</div>
                      {m.sources.slice(0, 3).map((s, idx) => {
                        const where = s.metadata?.section_heading
                          ? `${s.metadata.section_heading}`
                          : s.metadata?.page_number
                          ? `Page ${s.metadata.page_number}`
                          : undefined;
                        return (
                          <div key={idx} className="truncate">
                            {(s.metadata?.file_name || s.metadata?.source_path || "doc")} {where ? `- ${where}` : ""}
                            {typeof s.score === "number" ? ` (score: ${s.score.toFixed(3)})` : ""}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <div className="flex gap-2 items-center text-xs text-muted-foreground">
              <label className="flex items-center gap-1">
                <span>Top‑K</span>
                <input type="number" min={1} max={50} value={topK} onChange={(e) => setTopK(parseInt(e.target.value || "6", 10))} className="w-16 border rounded px-1 py-0.5 text-xs" />
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={enableLLMRerank} onChange={(e) => setEnableLLMRerank(e.target.checked)} />
                <span>LLM rerank</span>
              </label>
              <label className="flex items-center gap-1">
                <span>Window</span>
                <input type="number" min={1} max={10} value={sentenceWindowSize} onChange={(e) => setSentenceWindowSize(parseInt(e.target.value || "3", 10))} className="w-14 border rounded px-1 py-0.5 text-xs" />
              </label>
            </div>
            <div className="flex gap-2">
            <Textarea
              placeholder="Ask a question about your uploaded docs..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onAsk();
              }}
            />
            <Button onClick={onAsk} disabled={loading}>
              <Send className="h-4 w-4 mr-1" /> Ask
            </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>- Upload source documents first. Then ask questions.</p>
          <p>- This tool preserves context with overlapping chunking and metadata.</p>
          <p>- For local LLaMA, ensure Ollama is running with a llama model.</p>
        </CardContent>
      </Card>
    </div>
  );
}
