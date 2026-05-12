-- T5.4: visibilidade do video no YouTube quando publishAt chegar
-- public: aparece em busca/recomendacoes (default — type beat padrao)
-- unlisted: so quem tem o link ve (preview/share controlado)

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS privacy_status text NOT NULL DEFAULT 'public'
    CHECK (privacy_status IN ('public', 'unlisted'));
