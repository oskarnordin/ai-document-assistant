alter table documents
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists documents_user_id_idx on documents(user_id);

alter table documents enable row level security;
alter table document_chunks enable row level security;

drop policy if exists "Users can view their own documents" on documents;
create policy "Users can view their own documents"
  on documents for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own documents" on documents;
create policy "Users can insert their own documents"
  on documents for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own documents" on documents;
create policy "Users can update their own documents"
  on documents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own documents" on documents;
create policy "Users can delete their own documents"
  on documents for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own chunks" on document_chunks;
create policy "Users can view their own chunks"
  on document_chunks for select
  using (
    exists (
      select 1 from documents
      where documents.id = document_chunks.document_id
        and documents.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert their own chunks" on document_chunks;
create policy "Users can insert their own chunks"
  on document_chunks for insert
  with check (
    exists (
      select 1 from documents
      where documents.id = document_chunks.document_id
        and documents.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own chunks" on document_chunks;
create policy "Users can delete their own chunks"
  on document_chunks for delete
  using (
    exists (
      select 1 from documents
      where documents.id = document_chunks.document_id
        and documents.user_id = auth.uid()
    )
  );