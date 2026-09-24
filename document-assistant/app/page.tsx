"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

  const loadDocuments = async () => {
    const res = await fetch("/api/documents");
    if (!res.ok) return;
    const data = await res.json();
    setDocuments(data.documents ?? []);
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

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
    <main className="max-w-3xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">Document & Knowledge Assistant</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Ladda upp ett dokument (PDF)</CardTitle>
          <CardDescription>
            Ladda upp en PDF för att kunna ställa frågor om innehållet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input p-6 text-center cursor-pointer hover:bg-muted/50 has-disabled:cursor-not-allowed has-disabled:opacity-50">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="sr-only"
            />
            {isUploading ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="size-6 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              Klicka för att välja en PDF-fil
            </span>
          </label>

          {uploadStatus && (
            <div
              className={`flex items-center gap-2 text-sm ${
                uploadOk
                  ? "text-green-600 dark:text-green-500"
                  : isUploading
                    ? "text-muted-foreground"
                    : "text-destructive"
              }`}
            >
              {uploadOk ? (
                <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-500" />
              ) : isUploading ? (
                <FileText className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-destructive" />
              )}
              <span>{uploadStatus}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dokument</CardTitle>
          <CardDescription>
            Välj vilket färdigt dokument chatten ska använda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Inga dokument uppladdade.
            </p>
          ) : (
            documents.map((document) => (
              <div
                key={document.id}
                className={`flex items-center gap-2 rounded-lg border p-3 ${
                  selectedDocumentId === document.id
                    ? "border-primary"
                    : "border-border"
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
                  <span className="text-xs text-muted-foreground">
                    {document.status} · {document.chunk_count} textsegment
                  </span>
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void renameDocument(document.id, document.filename)
                  }
                >
                  Byt namn
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => void deleteDocument(document.id)}
                >
                  Ta bort
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Ställ frågor om dokumentet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 h-100 overflow-y-auto rounded-lg border border-border p-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Inga meddelanden än. Ställ en fråga nedan när ditt dokument är
                uppladdat.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  {m.role === "user" ? (
                    <User className="size-4" />
                  ) : (
                    <Bot className="size-4" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {/* Rendera textinnehåll */}
                  {m.content && (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}

                  {/* Rendera tool-anrop för v4 (m.toolInvocations) */}
                  {m.toolInvocations?.map((toolInvocation) => {
                    const { toolName, toolCallId, state } = toolInvocation;

                    if (toolName === "getSummaryCard" && state === "result") {
                      const { title, bulletPoints } = toolInvocation.result as {
                        title: string;
                        bulletPoints: string[];
                      };

                      return (
                        <Card
                          key={toolCallId}
                          className="mt-3 text-left text-foreground bg-card"
                        >
                          <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-sm">{title}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-1">
                            <ul className="list-disc ml-5 text-sm space-y-1">
                              {bulletPoints.map((pt: string, idx: number) => (
                                <li key={idx}>{pt}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
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
              handleSubmit(event, { body: { documentId: selectedDocumentId } })
            }
            className="mt-4 flex gap-2"
          >
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Fråga något om ditt dokument..."
              disabled={isBusy || !canChat}
            />
            <Button
              type="submit"
              disabled={isBusy || !canChat || !input.trim()}
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Skicka
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
