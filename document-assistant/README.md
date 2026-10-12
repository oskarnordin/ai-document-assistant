# Document & Knowledge Assistant

A full-stack RAG app for authenticated PDF Q&A. Users sign in, upload PDFs, choose a document, and ask grounded questions about that document's indexed content.

## What this app does

- Signs users in with Supabase Auth
- Uploads and validates PDF files
- Extracts text with `pdf-parse`
- Splits content into overlapping chunks
- Embeds chunks with OpenAI and stores them in Supabase `pgvector`
- Restricts retrieval to the selected document and signed-in user
- Streams a grounded answer from the retrieved context only

## Architecture at a glance

```mermaid
flowchart LR
    U[User] -->|Sign in| AUTH[Supabase Auth]
    U -->|Upload PDF| UP[/api/upload]
    U -->|Ask question| CH[/api/chat]

    UP --> PDF[pdf-parse]
    UP --> OAI[OpenAI embeddings]
    UP --> DB[(Supabase Postgres + pgvector)]

    CH --> Q[Embed latest question]
    CH --> DB
    CH --> LLM[OpenAI GPT-4o]
    LLM --> U
```

## Tech stack

- Next.js 15 + React 19
- Tailwind CSS + shadcn/ui
- Supabase Auth + Postgres + `pgvector`
- OpenAI `gpt-4o` and `text-embedding-3-small`
- Vercel AI SDK for streaming chat
- TypeScript + Vitest

## Prerequisites

Before running the app, you need:

- Node.js 20+
- A Supabase project with Auth enabled and `pgvector` available
- An OpenAI API key

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the project root:

```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

3. Apply the Supabase migrations in `supabase/migrations/` to your project.

4. Start the app:

```bash
npm run dev
```

5. Open http://localhost:3000

## Important runtime behavior

This project is intentionally document-scoped, not global:

- A user must be authenticated before uploading or chatting
- Each document belongs to a `user_id`
- Retrieval is filtered by `document_id`
- The document must be in `ready` state before chat can use it
- Failed uploads are marked as `failed` and the bad chunk rows are cleaned up

## Key application flow

### Upload flow

`app/api/upload/route.ts`:

1. Validates the uploaded file is a real PDF under the size limit
2. Creates a document row with `status: "processing"`
3. Extracts text from the PDF
4. Splits the text into overlapping chunks
5. Embeds each chunk with OpenAI
6. Saves chunks to `document_chunks` with the matching `document_id`
7. Marks the document as `ready` or `failed`

### Chat flow

`app/api/chat/route.ts`:

1. Verifies the user session and the selected document ownership
2. Embeds the latest user message
3. Runs a `match_chunks` query filtered to the chosen document
4. Builds a grounded prompt from the matched chunk content
5. Streams the final answer back to the client

## Project structure

```text
document-assistant/
├─ app/
│  ├─ api/
│  │  ├─ chat/route.ts
│  │  ├─ documents/route.ts
│  │  ├─ documents/[id]/route.ts
│  │  └─ upload/route.ts
│  ├─ page.tsx
│  └─ layout.tsx
├─ components/
├─ evaluation/
├─ lib/
│  ├─ chunking.ts
│  ├─ rag-config.ts
│  ├─ rag-prompt.ts
│  ├─ supabase.ts
│  └─ supabase-browser.ts
├─ supabase/migrations/
├─ package.json
├─ next.config.ts
├─ vitest.config.ts
├─ .env.local
└─ README.md
```

## Configuration and evaluation

The baseline retrieval settings live in `lib/rag-config.ts`:

- chunk size: 500
- overlap: 50
- embedding model: `text-embedding-3-small`
- retrieval threshold: 0.3
- retrieved chunks: 4
- chat model: `gpt-4o`

Evaluation scripts are under `evaluation/` and can be run with:

```bash
npm run evaluate
```

## Available scripts

```bash
npm run dev      # local development server
npm run build    # production build
npm run start    # run production build
npm run lint     # lint the project
npm test        # run Vitest tests
npm run evaluate # run RAG evaluation checks
```

## Notes

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used on both server and browser sides.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-only.
- `OPENAI_API_KEY` is required for embeddings and chat generation.
- Do not commit `.env.local`.

This app is best understood as a document-specific RAG system: it answers questions only from the selected PDF, not from a shared global index.
