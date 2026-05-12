# Sessao 2026-05-12 — Debug pipeline upload ponta-a-ponta

## Contexto

Segunda sessao do dia 2026-05-12. Objetivo: retomar o erro pendente do generate.py e testar o fluxo completo de upload ate "Pronto para revisar".

## O que foi feito

### 1. Correcao de permissoes no Supabase (RLS + GRANT)

**Problema:** `permission denied for table user_profiles` e depois `permission denied for table beats`.

**Causa:** Tabelas criadas via SQL Editor nao recebem automaticamente GRANT para o role `authenticated`. As policies RLS existiam mas o role nao tinha permissao de acesso a tabela.

**Solucao aplicada no Supabase SQL Editor:**
```sql
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.beats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.posts TO authenticated;
GRANT SELECT ON TABLE public.api_usage TO authenticated;
```

**Regra para proximas migrations:** Toda tabela criada via SQL Editor precisa de GRANT explicito. Adicionar isso ao template de migration.

### 2. Campo email_contato no perfil do produtor

- Adicionado coluna `email_contato text` na tabela `user_profiles` (SQL: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_contato text`)
- Pagina `/configuracoes` atualizada: campo email de contato adicionado
- `generate.py` atualizado: usa `user_profiles.email_contato` em vez de `auth.admin.get_user_by_id` (que pode nao estar disponivel no SDK Python do Supabase)

### 3. QStash nao configurado — fallback implementado

**Problema:** QSTASH_TOKEN nao estava configurado no Railway. Workers nunca eram chamados. Beat ficava preso em "uploaded" para sempre.

**Solucao:** `qstash_service.py` ganhou fallback: quando `QSTASH_TOKEN` ausente, chama o endpoint do worker diretamente via HTTP em thread daemon:

```python
threading.Thread(target=_call_direct, args=(target_url, beat_id, job_name), daemon=True).start()
```

**Importante:** Esta solucao e para MVP/teste. Para producao, configurar QSTASH_TOKEN no Railway (Upstash gratuito).

### 4. Realtime nao funcionava — polling adicionado

Supabase Realtime nao estava atualizando a pagina `/beats/[id]` automaticamente. Solucao: polling a cada 4 segundos como fallback, mantendo Realtime como complemento.

### 5. Librosa otimizado (5x mais rapido)

**Antes:** `librosa.load(file_path, sr=None, mono=True)` — carregava o arquivo inteiro (~3min de processamento para beat longo).

**Depois:** `librosa.load(file_path, sr=22050, mono=True, duration=60)` — analisa so os primeiros 60s a 22050Hz. Suficiente para BPM e tom. Tempo: ~10-15s.

### 6. Bug do ThreadPoolExecutor no Gemini — raiz do travamento

**Bug:** `with concurrent.futures.ThreadPoolExecutor() as executor` chama `shutdown(wait=True)` ao sair do bloco. O Gemini nao tem timeout na chamada HTTP interna. Entao mesmo apos `future.result(timeout=20)` disparar TimeoutError, o executor esperava a thread do Gemini terminar — que nunca terminava. Pipeline travado para sempre.

**Solucao:**
```python
# ERRADO — bloqueia mesmo apos timeout
with concurrent.futures.ThreadPoolExecutor() as executor:
    future.result(timeout=20)

# CORRETO — nao bloqueia em threads penduradas
executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
future = executor.submit(...)
try:
    result = future.result(timeout=20)
except Exception:
    result = []
finally:
    executor.shutdown(wait=False, cancel_futures=True)
```

Aplicado em: `gemini_service.py` e `generate.py`.

### 7. Outras otimizacoes do pipeline

- `analyze.py`: atualiza status para `"analyzing"` imediatamente ao iniciar (melhora UX na step list)
- `analyze.py`: `tmp_path = None` antes do try (evita NameError no finally se NamedTemporaryFile falhar)
- `generate.py`: Spotify + Gemini rodando em paralelo com `ThreadPoolExecutor(max_workers=2)`
- `anthropic_service.py`: timeout de 60s adicionado ao `client.messages.create()`
- `beats/[id]/page.tsx`: mostra erro real do Supabase (nao so "Beat nao encontrado")
- `beats/[id]/page.tsx`: polling 4s + Realtime para atualizacao automatica

## Estado ao final da sessao

Pipeline funciona ate a etapa "Geração de titulos" com as correcoes aplicadas. O bug do Gemini (ThreadPoolExecutor) foi identificado e corrigido no ultimo commit. **O teste final ainda nao foi feito** — ficou para a proxima sessao.

### Commits da sessao

- `fix: generate.py usa email_contato do user_profiles em vez de auth.admin`
- `fix: mostrar erro real do Supabase na pagina beats/[id] para debug`
- `fix: fallback direto nos workers quando QSTASH_TOKEN nao configurado`
- `fix: timeout de 20s no gemini_service para nao travar o pipeline`
- `fix: timeout 60s no Claude + polling 4s na pagina beats/[id]`
- `perf: librosa analisa so primeiros 60s a 22050Hz — 5x mais rapido`
- `perf: Spotify+Gemini em paralelo + status analyzing + fix tmp_path`
- `fix: executor shutdown(wait=False) no Gemini e generate — elimina travamento`

## Proximo passo (instrucao para proxima sessao)

**Tarefa:** Testar o fluxo completo de upload e corrigir bugs remanescentes.

**Como testar:**
1. Acessar `saa-s-type-beat.vercel.app`
2. Ir em **Configuracoes** — confirmar que nome artistico, email e instagram estao salvos
3. Ir em **Upload** — subir um MP3 com artista preenchido (ex: "Drake") + capa JPG
4. Acompanhar a step list em `/beats/{id}` — deve atualizar sozinha a cada 4s
5. Esperado: Upload → Conversao → Analise → Geracao → **Pronto para revisar** em ~1 minuto
6. Se travar em alguma etapa: verificar status no Supabase Table Editor (tabela `beats`) e logs do Railway

**Se travar em "Geração de títulos":**
- Verificar no Supabase se `beats.status = 'failed'` (e ver `error_message`)
- Se `status = 'generating'` ha mais de 2 minutos: bug ainda existe, verificar logs Railway
- Causa mais provavel restante: Claude timeout nao funcionando corretamente

**Se chegar em "Pronto para revisar":**
- Clicar no botao "Ver titulos e descricoes"
- Verificar a review page (`/beats/{id}/review`) — card com titulo, descricao, tags
- Editar se quiser, definir data de agendamento, clicar "Confirmar agendamento"
- Proximo passo do projeto: conectar YouTube OAuth (T5.1)

## Arquivos modificados nesta sessao

**Backend:**
- `api/app/workers/generate.py` — email do perfil, Spotify+Gemini paralelo, executor fix
- `api/app/workers/analyze.py` — status "analyzing", fix tmp_path
- `api/app/services/gemini_service.py` — executor shutdown(wait=False)
- `api/app/services/anthropic_service.py` — timeout=60s no Claude
- `api/app/services/audio_service.py` — librosa 60s@22050Hz
- `api/app/services/qstash_service.py` — fallback direto sem QStash

**Frontend:**
- `web/app/(app)/configuracoes/page.tsx` — campo email_contato
- `web/app/(app)/beats/[id]/page.tsx` — polling 4s + erro real do Supabase

**Banco:**
- GRANT executado no SQL Editor (user_profiles, beats, posts, api_usage)
- `ALTER TABLE user_profiles ADD COLUMN email_contato text`
