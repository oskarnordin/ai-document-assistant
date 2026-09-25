create extension if not exists vector;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  mime_type text not null default 'application/pdf',
  file_size bigint not null check (file_size > 0),
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table document_chunks
  add column if not exists content text,
  add column if not exists embedding vector(1536),
  add column if not exists document_id uuid,
  add column if not exists chunk_index integer;

-- Existing rows are intentionally removed because they have no reliable document owner.
delete from document_chunks where document_id is null;

alter table document_chunks
  alter column content set not null,
  alter column embedding set not null,
  alter column document_id set not null,
  alter column chunk_index set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'document_chunks_document_id_fkey'
      and conrelid = 'document_chunks'::regclass
  ) then
    alter table document_chunks
      add constraint document_chunks_document_id_fkey
      foreign key (document_id) references documents(id) on delete cascade;
  end if;
end;
$$;

create index if not exists document_chunks_document_id_idx
  on document_chunks(document_id);

create unique index if not exists document_chunks_document_chunk_index_idx
  on document_chunks(document_id, chunk_index);

create or replace function update_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_updated_at on documents;
create trigger documents_updated_at
before update on documents
for each row execute function update_documents_updated_at();

create or replace function match_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_document_id uuid
)
returns table (id bigint, content text, similarity float)
language sql stable
as $$
  select
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where dc.document_id = filter_document_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
