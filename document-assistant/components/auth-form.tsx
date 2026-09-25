"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AuthForm({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();
      const result = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;

      if (isSignUp && !result.data.session) {
        setMessage(
          "Kontot skapades. Kontrollera din e-post innan du loggar in.",
        );
      } else {
        onAuthenticated();
      }
    } catch {
      setMessage("Kunde inte autentisera användaren. Kontrollera uppgifterna.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mission-shell flex min-h-screen w-full items-center p-6 sm:p-10 lg:p-16">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
        <section className="reveal max-w-2xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="glass-surface flex size-12 items-center justify-center text-primary">
              <span className="text-base font-semibold">DA</span>
            </div>
            <div>
              <p className="eyebrow">Your document companion</p>
              <p className="text-sm font-medium">Document Assistant</p>
            </div>
          </div>

          <p className="eyebrow mb-5">A calmer way to explore your files</p>
          <h1 className="text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-7xl lg:text-8xl">
            Make your documents feel easy.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            Bring your PDFs into one thoughtful workspace and ask questions in
            plain language. Your ideas are waiting inside the pages.
          </p>
          <div className="friendly-accent mt-8 inline-flex rounded-full px-4 py-2 text-sm text-secondary-foreground">
            Private. Grounded. Ready when you are.
          </div>
        </section>

        <div className="reveal reveal-delay-1 w-full max-w-md lg:justify-self-end">
          <div className="mb-5">
            <p className="eyebrow">Welcome in</p>
            <p className="mono-meta mt-1">Your private document space</p>
          </div>
          <Card className="glass-panel w-full rounded-3xl ring-0">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-2xl">
                {isSignUp ? "Skapa konto" : "Logga in"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="E-post"
                  required
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Lösenord"
                  minLength={6}
                  required
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting
                    ? "Arbetar..."
                    : isSignUp
                      ? "Skapa konto"
                      : "Logga in"}
                </Button>
                {message && (
                  <p className="text-sm text-muted-foreground">{message}</p>
                )}
                <button
                  type="button"
                  className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
                  onClick={() => setIsSignUp((value) => !value)}
                >
                  {isSignUp
                    ? "Jag har redan ett konto"
                    : "Skapa ett nytt konto"}
                </button>
              </form>
            </CardContent>
          </Card>
          <p className="mono-meta mt-4 text-center">
            Private document retrieval environment
          </p>
        </div>
      </div>
    </main>
  );
}
