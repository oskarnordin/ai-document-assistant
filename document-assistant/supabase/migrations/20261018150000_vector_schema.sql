create extension if not exists vector;

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  content text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp not null default now()
);

alter table document_chunks
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists document_chunks_embedding_hnsw_idx
  on document_chunks
  using hnsw (embedding vector_cosine_ops);

drop function if exists match_chunks(vector, double precision, integer, uuid);

create function match_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_document_id uuid
)
returns table (
  id text,
  document_id uuid,
  content text,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamp,
  similarity float
)
language sql
stable
as $$
  select
    dc.id::text,
    dc.document_id,
    dc.content,
    dc.embedding,
    dc.metadata,
    dc.created_at::timestamp,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks as dc
  where dc.document_id = filter_document_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
