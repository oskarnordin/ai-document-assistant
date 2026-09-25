alter table documents
  add column if not exists rag_config_version text,
  add column if not exists chunk_max_size integer,
  add column if not exists chunk_overlap integer,
  add column if not exists embedding_model text;