# Sessao 2026-05-12 — Fase 4: generate.py + review UI + perfil do produtor

## O que foi feito

Implementacao completa da Fase 4 simplificada (A/B/C removido, 1 post por beat).

### Decisoes tomadas

| Decisao | Motivo |
|---------|--------|
| A/B/C removido do MVP | Maioria dos produtores tem 1 canal. V2 expande. |
| Mood removido desta fase | Gustavo aguarda reuniao com socio para definir UX dos cards visuais |
| Capa obrigatoriamente manual | Aguarda decisao de mood (mood alimenta geracao de capa por IA) |
| Gemini substitui artistas_similares | T3.2 implementado: Gemini busca tags trending pelo artista informado pelo produtor |
| librosa ja fazia BPM+key | T3.1+T3.3 ja estavam prontos da sessao anterior |

### Arquivos criados

**Backend:**
- `api/app/services/spotify_service.py` — Client Credentials + get_top_tracks(artista)
- `api/app/services/gemini_service.py` — search_trending_tags via Google Search grounding
- `api/app/services/anthropic_service.py` — generate_metadata: beat_name + titulo + descricao (template padrao) + 80-100 tags
- `api/app/workers/generate.py` — orquestra Spotify+Gemini+Claude, cria 1 post (variacao='A')
- `api/app/routes/posts.py` — GET /posts/{beat_id} + PATCH /posts/{post_id}
- `supabase/migrations/004_artista_profile.sql` — ADD artista_nome em beats, ADD purchase_link em posts, CREATE user_profiles

**Frontend:**
- `web/app/(app)/beats/[id]/review/page.tsx` — card editavel (titulo+descricao+tags chips+link de venda) + agendamento
- `web/app/(app)/configuracoes/page.tsx` — perfil do produtor (nome artistico + instagram)
- `web/components/UploadForm.tsx` — atualizado: campo artista obrigatorio + capa obrigatoria
- `web/lib/api.ts` — atualizado: fetchPost + patchPost

**Config:**
- `api/requirements.txt` — adicionado anthropic>=0.40.0 + google-genai>=1.0.0
- `api/app/main.py` — registrado posts.router + generate.router
- `web/components/Sidebar.tsx` — adicionado item "Configuracoes"

### Template de descricao padrao (definido pelo Gustavo)

```
💵 Purchase this beat: [link]
Free Download | Purchase (For Profit): [link]

free ONLY for NON PROFIT use. credit is always required
MUST purchase a lease for uploading your track on streaming platforms (apple music, spotify etc.)

BPM - {bpm}
Key - {music_key}

{beat_name}
(prod. {producer_nome})

Contact me here:
Instagram - @{instagram}
E-mail - {email}

#{artista}typebeat #trapbeat #{bpm}bpm

IDEOTAGS:
{80-100 variacoes de tags separadas por virgula}
```

### Formato de titulo (definido pelo Gustavo)

- 1 artista: `[FREE] artista type beat "NOME DO BEAT"`
- 2 artistas: `[FREE] artista1 x artista2 type beat "NOME DO BEAT"`
- 3 artistas: `[FREE] artista1 x artista2 x artista3 type beat "NOME DO BEAT"`

Beat name gerado por Claude inspirado nas top tracks do artista via Spotify API.

### Variaveis de ambiente adicionadas no Railway

- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

### Migration aplicada no Supabase

004_artista_profile.sql aplicada com sucesso (Success. No rows returned).

## Pendencias

### Erro no primeiro teste real
- Erro encontrado ao testar o fluxo completo (upload → review)
- Mensagem de erro nao capturada (contexto do chat esgotou)
- **Proxima sessao:** reproduzir o erro, identificar causa (provavelmente Railway ainda sem redeploy com novas deps, ou erro no worker generate.py)

### Como investigar na proxima sessao
1. Fazer upload de beat com artista preenchido
2. Acompanhar status na pagina /beats/{id}
3. Se falhar em "generating": checar logs do Railway (aba Deployments → view logs)
4. Causas mais provaveis:
   - `anthropic` ou `google-genai` nao instalados ainda (Railway precisa rebuildar com novo requirements.txt)
   - Erro de import no generate.py
   - `auth.admin.get_user_by_id` nao disponivel no SDK supabase Python (verificar alternativa)

### Tasks pendentes da Fase 2 (ainda nao feitas)
- T2.6 full (tabelas artistas_referencia + beat_artistas + mood enum) — postergado
- T2.7 (seed artistas) — postergado
- T2.9 (autocomplete artista com Spotify) — postergado
- T2.10 (cards visuais mood) — aguarda reuniao com socio
- T2.11 (toggle capa manual/IA) — aguarda decisao mood
- T2.12 (endpoint /beats com artistas + mood completo) — postergado

### Tasks pendentes da Fase 4 (nao simplificadas)
- T4.5 (testes anthropic @slow)
- T4.6-T4.11 (curadoria estilos visuais + capa IA) — aguarda mood
