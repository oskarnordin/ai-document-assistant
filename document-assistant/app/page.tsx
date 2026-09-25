"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  LogOut,
  Send,
  Upload,
  User,
} from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/api/chat",
  });

  const [documents, setDocuments] = useState<
    Array<{
      id: string;
      filename: string;
      status: "processing" | "ready" | "failed";
      chunk_count: number;
      created_at: string;
    }>
  >([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadOk, setUploadOk] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const loadDocuments = async () => {
    const res = await fetch("/api/documents");
    if (!res.ok) return;
    const data = await res.json();
    setDocuments(data.documents ?? []);
  };

  useEffect(() => {
    const loadSession = async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserEmail(user?.email ?? null);
      if (user) await loadDocuments();
      setAuthLoading(false);
    };

    void loadSession();
  }, []);

  const signOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    setUserEmail(null);
    setDocuments([]);
    setSelectedDocumentId("");
  };

  if (authLoading) return null;
  if (!userEmail) {
    return <AuthForm onAuthenticated={() => window.location.reload()} />;
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadOk(false);
    setUploadStatus("Läser in och indexerar PDF...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        if (data?.documentId) setSelectedDocumentId(data.documentId);
        await loadDocuments();
        setUploadOk(true);
        setUploadStatus("Dokumentet är redo! Du kan ställa frågor nu.");
      } else {
        setUploadOk(false);
        const detailedMessage = data?.details
          ? `${data.error}: ${data.details}`
          : data?.error || "Kunde inte läsa in filen.";
        setUploadStatus(detailedMessage);
      }
    } catch {
      setUploadOk(false);
      setUploadStatus("Nätverksfel: Kunde inte ansluta till servern.");
    } finally {
      setIsUploading(false);
    }
  };

  const renameDocument = async (documentId: string, currentName: string) => {
    const filename = window.prompt("Nytt filnamn", currentName)?.trim();
    if (!filename || filename === currentName) return;

    const res = await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    if (res.ok) await loadDocuments();
  };

  const deleteDocument = async (documentId: string) => {
    if (!window.confirm("Ta bort dokumentet och dess indexerade text?")) return;

    const res = await fetch(`/api/documents/${documentId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      if (selectedDocumentId === documentId) setSelectedDocumentId("");
      await loadDocuments();
    }
  };

  const selectedDocument = documents.find(
    (document) => document.id === selectedDocumentId,
  );
  const isBusy = status !== "ready";
  const canChat = selectedDocument?.status === "ready";

  return (
    <main className="mission-shell min-h-screen w-full">
      <div className="mx-auto w-full max-w-7xl px-5 py-5 sm:px-8 lg:px-12">
        <header className="reveal flex items-center justify-between /60 pb-5">
          <div className="flex items-center gap-3">
            <div>
              <p className="eyebrow">Your document companion</p>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                Document Assistant
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="mono-meta hidden sm:block">{userEmail}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4" />
              Logga ut
            </Button>
          </div>
        </header>

        <section className="reveal reveal-delay-1 grid gap-8/60 py-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <p className="eyebrow mb-4">A calmer way to explore your files</p>
            <h2 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
              Ask better questions. Find the good stuff faster.
            </h2>
          </div>
          <div className="friendly-accent friendly-hover rounded-3xl p-5 text-sm leading-6 text-secondary-foreground">
            Upload a PDF, pick a document, and chat with the ideas inside it.
            Your assistant keeps the conversation grounded in your own sources.
          </div>
        </section>

        <section className="grid gap-6 py-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="glass-panel friendly-hover reveal reveal-delay-2 rounded-3xl ring-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow mb-2">Ingest</p>
                  <CardTitle className="text-xl">Add source document</CardTitle>
                </div>
                <span className="mono-meta">01 / upload</span>
              </div>
              <CardDescription className="pt-2">
                PDF files are parsed, chunked, and indexed for retrieval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <label className="glass-surface upload-hover group flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center transition-colors hover:bg-primary/10 has-disabled:cursor-not-allowed has-disabled:opacity-50">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="sr-only"
                />
                {isUploading ? (
                  <Loader2 className="size-7 animate-spin text-primary" />
                ) : (
                  <Upload className="size-7 text-primary transition-transform group-hover:-translate-y-1" />
                )}
                <span className="text-sm font-medium">
                  {isUploading
                    ? "Indexing source..."
                    : "Select a PDF to ingest"}
                </span>
                <span className="mono-meta">Maximum file size: 10 MB</span>
              </label>

              {uploadStatus && (
                <div
                  className={`flex items-start gap-2 border-l-2 px-3 py-2 text-sm ${
                    uploadOk
                      ? "border-primary text-primary"
                      : isUploading
                        ? "border-muted-foreground text-muted-foreground"
                        : "border-destructive text-destructive"
                  }`}
                >
                  {uploadOk ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  ) : isUploading ? (
                    <FileText className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  )}
                  <span>{uploadStatus}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel friendly-hover reveal reveal-delay-3 rounded-3xl ring-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow mb-2">Sources</p>
                  <CardTitle className="text-xl">Document registry</CardTitle>
                </div>
                <span className="mono-meta">
                  {documents.length.toString().padStart(2, "0")} indexed
                </span>
              </div>
              <CardDescription className="pt-2">
                Select a ready source to make it available to the assistant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-5">
              {documents.length === 0 ? (
                <div className="glass-surface flex min-h-44 items-center justify-center rounded-2xl text-sm text-muted-foreground">
                  Your library is ready when you are.
                </div>
              ) : (
                documents.map((document) => (
                  <div
                    key={document.id}
                    className={`group flex items-center gap-3 p-3 transition-colors ${
                      selectedDocumentId === document.id
                        ? "rounded-2xl bg-primary/10 shadow-[inset_4px_0_var(--primary)]"
                        : "glass-surface rounded-2xl hover:bg-primary/5"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setSelectedDocumentId(document.id)}
                    >
                      <span className="block truncate text-sm font-medium">
                        {document.filename}
                      </span>
                      <span className="mono-meta mt-1 block">
                        {document.status} / {document.chunk_count} segments
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void renameDocument(document.id, document.filename)
                      }
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void deleteDocument(document.id)}
                    >
                      Delete
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="pb-10">
          <Card className="glass-panel reveal reveal-delay-4 rounded-3xl ring-0">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow mb-2">Analysis console</p>
                  <CardTitle className="text-xl">
                    Ask about the PDF-file
                  </CardTitle>
                </div>
                <span className="mono-meta hidden sm:block">
                  {canChat ? "source connected" : "select a ready source"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="glass-surface h-112 overflow-y-auto rounded-2xl p-4 sm:p-6">
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Bot className="mb-4 size-8 text-primary" />
                    <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                      Pick a ready document above and ask anything about it.
                      I’ll help you find the answer.
                    </p>
                  </div>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`mb-5 flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className="glass-surface flex size-8 shrink-0 items-center justify-center rounded-full">
                      {m.role === "user" ? (
                        <User className="size-3.5" />
                      ) : (
                        <Bot className="size-3.5 text-primary" />
                      )}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-sm leading-6 ${m.role === "user" ? "glass-surface shadow-[inset_4px_0_var(--primary)]" : "glass-surface"}`}
                    >
                      {m.content && (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                      {m.toolInvocations?.map((toolInvocation) => {
                        const { toolName, toolCallId, state } = toolInvocation;
                        if (
                          toolName === "getSummaryCard" &&
                          state === "result"
                        ) {
                          const { title, bulletPoints } =
                            toolInvocation.result as {
                              title: string;
                              bulletPoints: string[];
                            };
                          return (
                            <div
                              key={toolCallId}
                              className="glass-surface mt-3 rounded-xl p-3 text-left"
                            >
                              <p className="font-medium">{title}</p>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                {bulletPoints.map((pt: string, idx: number) => (
                                  <li key={idx}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(event) =>
                  handleSubmit(event, {
                    body: { documentId: selectedDocumentId },
                  })
                }
                className="mt-4 flex gap-2 pt-4"
              >
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask a question about the selected source..."
                  disabled={isBusy || !canChat}
                  className="h-10 bg-background/50"
                />
                <Button
                  type="submit"
                  disabled={isBusy || !canChat || !input.trim()}
                  className="h-10 px-4"
                >
                  {isBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <footer className="flex justify-between py-4">
          <span className="mono-meta">
            Document Assistant / retrieval system
          </span>
          <span className="mono-meta">online</span>
        </footer>
      </div>
    </main>
  );
}
