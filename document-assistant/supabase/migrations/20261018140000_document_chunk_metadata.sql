alter table document_chunks
  add column if not exists metadata jsonb not null default '{}'::jsonb;
