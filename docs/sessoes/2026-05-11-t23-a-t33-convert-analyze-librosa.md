# Sessao 2026-05-11 — T2.3 a T3.3: Worker Convert, Pagina de Status e Analise com Librosa

## Contexto
Gustavo executando Fase 2 e inicio da Fase 3 do MVP. Sessao focada em completar o pipeline de processamento de audio: upload → convert → analyze.

---

## Decisoes de Produto Tomadas

### 1. MVP aceita somente MP3 (T2.3)
**Decisao:** Remover suporte a WAV/FLAC/M4A. Produtor envia somente MP3 com a tag de produtor ja gravada no audio.

**Motivo:** Simplifica o pipeline (sem ffmpeg de conversao no MVP) e protege o beat no YouTube — o produtor grava "prod. SeuNome" nos primeiros e ultimos segundos, impedindo que artistas removam o credito.

**Impacto:** Worker convert.py nao usa ffmpeg. Loudnorm descartado para preservar a master do produtor. Se precisar aceitar outros formatos no futuro (ex: integracao BeatStars), adicionar ffmpeg_service.py no worker.

### 2. Librosa substitui Gemini para analise de audio (T3.1)
**Decisao:** Usar librosa (Python) em vez de Gemini API para detectar BPM e tom musical.

**Motivo:** librosa e gratuito, deterministico e especificamente projetado para medicao de audio. Gemini e uma IA generalista — funciona, mas nao e a ferramenta certa para medicao precisa.

**Validado em producao:** Beat "Type Mink Pixels.mp3" retornou BPM=141 (real: 140 — 0.7% de erro, dentro do toleravel) e Tom=C major. ffmpeg 8.1 ja estava instalado na maquina do Gustavo.

### 3. Gemini removido da analise de audio, permanece para tags (T3.2)
**Decisao:** Gemini nao detecta genero, artistas similares nem mood.
- **Genero:** IA falha muito na deteccao
- **Artistas similares:** Produtor informa o artista — IA nao deve adivinhar
- **Mood:** Ja decidido anteriormente — vem do produtor via cards visuais

**Gemini permanece no stack** apenas para T3.2 (busca de tags trending via Google Search grounding), que so sera acionado apos o produtor informar o artista (depende de T2.9).

---

## Tasks Concluidas

### T2.3 — Worker convert.py (pass-through)
- **Arquivo:** `api/app/workers/convert.py`
- Endpoint `POST /internal/beats/{id}/convert` chamado pelo QStash
- Verifica existencia do arquivo no Supabase Storage
- Avanca status: `uploaded → converted`
- Dispara proximo job: analyze
- Idempotente: se status >= converted, retorna skipped sem fazer nada
- `qstash_service.py` refatorado com funcao `_dispatch` generica
- `dispatch_analyze_job` adicionado

### T2.4 — Pagina /beats/[id] com status em tempo real
- **Arquivo:** `web/app/(app)/beats/[id]/page.tsx`
- Step list visual: Upload → Conversao → Analise → Geracao → Pronto para revisar
- ✓ verde nos passos concluidos, spinner nos ativos, cinza nos pendentes
- Atualiza automaticamente via Supabase Realtime (sem recarregar pagina)
- Quando status=ready_for_review, exibe botao para ver titulos e descricoes
- `UploadForm` atualizado: redireciona para `/beats/{id}` apos upload (em vez de tela de conclusao)
- Pagina de upload: aviso em amber explicando MP3 com tag de produtor

### T2.5 — Testes do worker convert
- **Arquivo:** `api/tests/workers/test_convert.py`
- 3 testes com mocks (sem chamadas reais ao Supabase ou QStash):
  1. Beat uploaded → vira converted, dispatch_analyze_job chamado
  2. Beat ja converted → retorna skipped, nenhuma operacao feita
  3. Arquivo ausente no Storage → marca failed, retorna 422
- Python 3.11 instalado via winget. 3 passed em ~2s.

### T3.1 — Service: audio_service.detect_bpm_and_key
- **Arquivo:** `api/app/services/audio_service.py`
- BPM via `librosa.beat.beat_track`
- Tom via perfis de Krumhansl-Kessler sobre chromagrama CQT
  - Correlaciona chroma do audio com perfis major e minor para todas as 12 tonalidades
  - Retorna ex: "A minor", "C major", "F# minor"
- Dependencias: `librosa==0.10.2`, `soundfile==0.12.1`, ffmpeg (ja no nixpacks Railway)

### T3.3 — Worker analyze.py
- **Arquivo:** `api/app/workers/analyze.py`
- Endpoint `POST /internal/beats/{id}/analyze` chamado pelo QStash
- Baixa MP3 do Storage para arquivo temporario
- Chama `detect_bpm_and_key`, salva `bpm` e `music_key` no banco
- Avanca status: `converted → analyzed`
- Dispara proximo job: generate
- Idempotente. Limpa arquivo temporario sempre (finally)
- `dispatch_generate_job` adicionado ao qstash_service.py

---

## Estado do Pipeline Apos Esta Sessao

```
upload (MP3 com tag) → /beats POST → status=uploaded
   ↓ QStash
/internal/beats/{id}/convert → status=converted
   ↓ QStash
/internal/beats/{id}/analyze → bpm + music_key salvos → status=analyzed
   ↓ QStash
/internal/beats/{id}/generate → (Fase 4, ainda nao implementado)
```

---

## Arquivos Modificados/Criados

| Arquivo | Acao |
|---|---|
| `api/app/workers/convert.py` | Criado |
| `api/app/workers/analyze.py` | Criado |
| `api/app/services/audio_service.py` | Criado |
| `api/app/services/qstash_service.py` | Refatorado (_dispatch generica) + 2 novas funcoes |
| `api/app/main.py` | Registra routers convert e analyze |
| `api/requirements.txt` | +pytest, +httpx, +librosa, +soundfile |
| `api/tests/workers/test_convert.py` | Criado (3 testes) |
| `web/components/UploadForm.tsx` | So MP3, redirect para /beats/{id} |
| `web/app/(app)/upload/page.tsx` | Aviso amber MP3 + tag |
| `web/app/(app)/beats/[id]/page.tsx` | Criado (step list + Realtime) |

---

## Proximos Passos

- **T3.2** — Tags trending com Gemini (aguarda T2.9 — artista disponivel no form)
- **T3.4** — usage_tracker para chamadas pagas (librosa nao tem custo, mas Gemini/Claude terao)
- **T3.5** — Teste @slow com beat real para validar BPM/tom (ffmpeg disponivel localmente)
- **T2.6+** — Migration de campos de input (mood, artistas, estilo visual) — postergado
- **Fase 4** — Geracao de titulos A/B/C com Claude (generate.py)
