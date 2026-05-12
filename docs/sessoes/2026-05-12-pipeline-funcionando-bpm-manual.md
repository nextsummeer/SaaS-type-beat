# Sessao 2026-05-12 — Pipeline funcionando ponta-a-ponta + BPM manual

## Contexto

Terceira sessao do dia. Objetivo: corrigir bugs remanescentes do pipeline e validar o fluxo end-to-end. Sessao anterior (`2026-05-12-debug-pipeline-upload.md`) fechou com varias correcoes mas o teste final estava pendente.

## O que foi feito

### 1. Fix do prompt do Claude (commit `8aaa9a4`)

Pipeline travava em "Geracao de titulos" por 3+ minutos. Causa: prompt pedia "a mesma lista" duplicada de 80-100 tags em dois lugares (descricao + array JSON), estourando `max_tokens=4096` e potencialmente `timeout=60s`.

**Mudancas em `anthropic_service.py`:**
- IDEOTAGS na descricao: 80-100 → **40-60** keywords (campo Descricao YouTube, 5000 chars)
- Array `tags` JSON: "a mesma lista" → **12-15 tags fortes selecionadas** (campo Tags YouTube, 500 chars)
- `max_tokens` 4096 → **6000** (folga)
- `timeout` 60s → **120s** (folga)
- Prompt explicita que sao **dois conjuntos com propositos diferentes** (YouTube tem 2 campos: Descricao e Tags)

### 2. Fix do `.maybe_single()` (commit `b5db33f`)

Apos o fix do prompt, novo travamento em "Geracao de titulos". Logs do Railway revelaram:

```
postgrest.exceptions.APIError: 'Missing response', code 204
File "generate.py", line 58, in generate_beat
```

**Causa:** bug conhecido do `postgrest-py`. Quando query com `.maybe_single().execute()` retorna 0 rows, PostgREST devolve HTTP 204 No Content, mas o cliente Python interpreta como `APIError` em vez de `data=None`.

**Mudancas em `generate.py`:**
- Removido `.maybe_single()` → query normal + `data[0] if data else {}`
- Envolvido todo o worker em `try/except` amplo que chama `_mark_failed`
- `logger.exception` captura traceback completo

**Por que era critico:** status era setado pra "generating" ANTES da query falhar. Sem try/except amplo, o status ficava preso em "generating" pra sempre (porque nada mais escrevia em `beats`).

### 3. Fix do `_mark_failed` (commit `2283db3`)

Workers `analyze.py` e `convert.py` chamavam `_mark_failed(reason)` mas NAO salvavam o `reason` no banco — so `status="failed"`. Diagnostico ficava impossivel sem ler logs do Railway.

**Mudancas:** os 3 workers (`convert`, `analyze`, `generate`) agora salvam `error_message=reason` ao falhar.

### 4. GRANT pro service_role (SQL no Supabase, sem commit)

Apos os fixes acima, novo erro:
```
permission denied for table user_profiles
Grant the required privileges to the current role with: GRANT SELECT ON public.user_profiles TO service_role;
```

**Causa:** sessao anterior aplicou GRANT pro role `authenticated` (usado pelo frontend), mas esqueceu do role `service_role` (usado pelos workers do backend via `admin_client`).

**SQL aplicado no Supabase SQL Editor:**
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.beats TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.posts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.api_usage TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.youtube_accounts TO service_role;
```

**Regra:** toda nova tabela precisa GRANT pra AMBOS os roles (`authenticated` + `service_role`).

### 5. Pipeline funcionando — primeiro sucesso end-to-end (apos GRANT)

Apos o GRANT, primeiro upload completo end-to-end:
- Upload → Conversao → Analise → Geracao → Pronto para revisar
- **Tempo: 59 segundos**

Review page mostrou titulo, descricao com template completo (BPM/Key/contatos/IDEOTAGS) e 13 tags fortes no campo Tags. Tudo coerente.

**Unica issue:** BPM detectado errado. Beat era 140 BPM, librosa detectou 92 (140 × 2/3 = 93.33 — interpretacao tripleta).

### 6. T2.13 — BPM manual + link da loja (commit `4b3a722`)

**Decisao:** remover deteccao automatica de BPM. Producer informa BPM manualmente no upload.

**Por que:**
- Librosa erra ~30% dos type beats com hi-hats em tripletas
- Heuristicas (×1.5, ×2, /2) introduzem falsos positivos em beats lentos legitimos
- Produtor sabe o BPM real do beat dele (ele que produziu!)
- Bonus: pipeline ~10s mais rapido (sem `librosa.beat.beat_track`)

**Tom (key) mantido automatico:** `librosa.feature.chroma_cqt` + Krumhansl-Kessler raramente erra.

**Bonus: link da loja como input.** Hoje a descricao tinha placeholder `[insira seu link de venda]` que o produtor editava manualmente. Agora: checkbox "ja publiquei em loja" + input URL opcional.

**Mudancas:**
- `migrations/005_store_link.sql`: ADD COLUMN `beats.store_link`
- `UploadForm.tsx`: campo BPM obrigatorio + checkbox + campo link condicional
- `routes/beats.py`: aceita `bpm` (validacao 40-300) e `store_link`
- `audio_service.py`: `detect_bpm_and_key` → `detect_key` (so chroma_cqt)
- `analyze.py`: nao atualiza mais `bpm` (vem do upload)
- `anthropic_service.py`: substitui placeholder do link na descricao
- `generate.py`: passa `beat.store_link` pro Claude

**ADR:** `docs/decisoes/2026-05-12-bpm-manual-e-link-loja.md`

### 7. Teste final apos T2.13

Upload com BPM=140 manual + link da loja preenchido:
- Pipeline em **50 segundos** (10s mais rapido)
- BPM=140 correto na descricao e nas tags
- Link da loja substituiu o placeholder

**T2.13 fechada (commit `257bd04`).**

## Commits da sessao

1. `8aaa9a4` — fix: reduz IDEOTAGS para 40-60 e separa tags YouTube (500 chars)
2. `b5db33f` — fix: generate.py nao trava em "generating" quando user_profiles vazio
3. `2283db3` — fix: _mark_failed em analyze e convert salvam error_message
4. `4b3a722` — feat: BPM manual + link da loja no upload (T2.13)
5. `257bd04` — docs: fecha T2.13 + atualiza proximo passo (T5.1 YouTube OAuth)

## Aprendizados (incorporados em `project_pipeline_fixes.md`)

1. **GRANT pra service_role obrigatorio** (alem de `authenticated`)
2. **Nunca usar `.maybe_single()` no postgrest-py** — bug conhecido com 0 rows
3. **Workers precisam de try/except amplo** que chama `_mark_failed` — senao trava em estado intermediario
4. **`_mark_failed` SEMPRE salva `error_message`** — diagnostico fica impossivel sem isso
5. **librosa erra BPM em type beats com tripletas** — input manual vence DSP quando o humano ja sabe

## Proximo passo

**T2.14 — Lista de beats no /beats (cards com status, edicao, link pra review).**

Hoje a area `/beats` esta vazia/quebrada quando o usuario sai de `/beats/[id]`. Nao da pra ver historico de beats gerados. Solucao: lista de cards com todos os beats do produtor (draft, scheduled, published, failed) com link pra review/editar.

Depois disso: **T5.1 — YouTube OAuth** (publicacao automatica).
