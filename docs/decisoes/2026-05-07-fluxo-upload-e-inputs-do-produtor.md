# Fluxo de upload e inputs do produtor (artista, mood, custom + Spotify API)

**Data:** 2026-05-07
**Status:** aceita
**Tags:** decisao, produto, mvp, ux, upload, spotify

## Contexto

A versao original do MVP previa que a IA inferisse o "estilo" do beat (qual artista de referencia, qual genero, qual mood) atraves da analise de audio do Gemini. Isso e a tatica que a BeatStars adotou nas novas features de IA deles (geracao automatica de nome / descricao / tags).

Gustavo testou a feature da BeatStars com um beat afrobeat e validou que **a abordagem "IA adivinha tudo pelo audio" entrega resultados genericos e fora da vibe**. O Gemini consegue detectar BPM, tom e genero musical com confianca, mas (a) nao consegue acertar com precisao o artista de referencia (Drake vs Don Toliver vs The Weeknd e indistinguivel sem contexto), e (b) detectar mood emocional pelo audio sozinho gera classificacoes inconsistentes que nao casam com a intencao do produtor (mesmo beat pode ser "sad" pra um ouvido e "atmospheric" pra outro).

A conclusao da sessao 2026-05-07 (brainstorm-jornada-cliente.md) foi clara: **o produtor SABE pra qual artista o beat foi feito**. Pedir pra IA adivinhar e remover agencia do produtor e adicionar um ponto de erro evitavel.

Alem disso, surgiram duas perguntas conectadas:
1. Como capturar o mood/intencao do beat de forma que a IA consiga gerar copy E capa direcionados?
2. Como evitar que dados de artista no banco virem bagunca ("drake", "Drake", "DRAKE", "drake type beat" sao todos o mesmo artista)?

## Opcoes Consideradas

### Captura do artista de referencia

#### A. IA detecta sozinha (audio analysis pura)
- **Pros:** Zero friccao no upload. Produtor so manda o audio.
- **Contras:** Errada com frequencia. Gera nome generico. Tira contexto que o produtor ja tem.

#### B. Texto livre puro
- **Pros:** Producer escreve o que quiser, total flexibilidade.
- **Contras:** Banco vira bagunca ("drake", "Drake", "DRAKE", "drak"). Impossivel agregar/analisar depois. Desanima o produtor a escolher artistas menos populares (typos quebram tudo).

#### C. Lista controlada (autocomplete) + custom + normalizacao Spotify
- **Pros:** Dados consistentes. UX rapida. Cobre artistas trending E nicho. Spotify API valida nome canonico.
- **Contras:** Curadoria inicial da lista (~80-100 artistas). Manutencao recorrente da lista trending.

### Captura do mood

#### A. Sem campo de mood (IA infere do audio)
- **Pros:** Menos um campo no upload.
- **Contras:** Gemini detecta mood razoavelmente bem, mas variantes finas (Drake romantico vs Drake agressivo) escapam. Sem mood explicito, nao da pra escolher template visual da capa nem afinar copy.

#### B. Campo dropdown tradicional
- **Pros:** Implementacao trivial.
- **Contras:** UX chata. Produtor cansa.

#### C. Cards visuais grandes (palavra + cor + emoji)
- **Pros:** UX divertida, visual, 1 clique. Producer engaja. Funciona bem no mobile.
- **Contras:** Limita a 6-8 moods predefinidos (precisa ser conjunto fechado pra UI funcionar).

## Decisao

**Veredito:**
- **Artista de referencia:** Opcao C — lista controlada com autocomplete + suporte a custom + normalizacao via Spotify API.
- **Mood:** Opcao C — cards visuais grandes no upload, conjunto fechado de 6 opcoes iniciais.

Razao: ambas as decisoes assumem que **o produtor sabe melhor que a IA o que ele quer**, e o trabalho da plataforma e capturar isso de forma rapida e estruturada — nao adivinhar.

A normalizacao via Spotify resolve dois problemas de uma vez: (1) mantem o banco limpo, (2) abre caminho pra usar o catalogo do artista pra gerar nomes inspirados em hits reais (ver decisao em `2026-05-07-geracao-de-capa-mvp.md` e nova feature de naming inspirado).

## Implementacao

### Form de upload — campos do MVP

```
┌─────────────────────────────────────────┐
│  Upload de Beat                         │
├─────────────────────────────────────────┤
│  📁 Arquivo de audio  [escolher]        │
│  🖼️  Capa (opcional)   [escolher]        │  ← se vazio, usa IA
├─────────────────────────────────────────┤
│  🎤 Type beat de quem?                  │
│     [____________________________]      │  ← autocomplete
│     Sugestoes: Drake, Travis Scott,     │
│     Kendrick, Nettspend, Lucy Bedroque  │
│     [+ Adicionar colaborador]           │  ← opcional
├─────────────────────────────────────────┤
│  💭 Qual a vibe do beat?                │
│  ┌──────┐ ┌──────┐ ┌──────┐             │
│  │ 💔   │ │ 🔥   │ │ 💕   │             │
│  │ Sad  │ │Aggro │ │Roman │             │
│  └──────┘ └──────┘ └──────┘             │
│  ┌──────┐ ┌──────┐ ┌──────┐             │
│  │ 🌑   │ │ ⚡   │ │ 🌌   │             │
│  │ Dark │ │Energy│ │Atmos │             │
│  └──────┘ └──────┘ └──────┘             │
└─────────────────────────────────────────┘
         [Enviar pra processamento]
```

### Lista controlada de artistas

- **Inicial:** ~80-100 artistas mais usados em type beats (curadoria manual do Gustavo na T1.x).
- **Storage:** tabela `artistas_referencia` (id, nome_canonico, spotify_id, popularidade, ativo).
- **UI:** componente Autocomplete (shadcn `Combobox`) com filtro por nome.
- **Custom:** se produtor digita algo que nao esta na lista, oferece "Usar 'XYZ' como custom". Sistema valida via Spotify API antes de salvar.
- **Manutencao:** Gustavo revisa customs mais usados 1x/mes nas primeiras fases. Automacao via job que puxa trending do YouTube fica pra V2.

### Normalizacao via Spotify API

- **Endpoint:** `GET https://api.spotify.com/v1/search?q=<query>&type=artist&limit=1`
- **Auth:** Client Credentials Flow (free tier suficiente).
- **Fluxo:**
  1. Producer digita "FAKEMINK" no campo
  2. Frontend (debounced) ou backend chama Spotify API
  3. Resposta retorna `{name: "Fakemink", id: "abc123", popularity: 67}`
  4. UI mostra confirmacao: "Voce quis dizer **Fakemink**? ✓"
  5. Salva nome canonico + spotify_artist_id no banco
- **Edge case:** Spotify retorna 0 resultados → mostra warning "Nao achamos esse artista no Spotify. Continuar com 'XYZ' assim mesmo?"
- **Custo:** zero (Spotify free tier cobre folgado).

### Mood — conjunto fechado MVP

| Mood | Cor | Emoji | Modificador no prompt da capa | Modificador no prompt do nome |
|------|-----|-------|-------------------------------|-------------------------------|
| **Sad** | azul escuro | 💔 | melancholic, blue palette, lonely | melancholic, introspective |
| **Aggressive** | vermelho | 🔥 | dark, hostile, smoke, red palette | hard, raw, street |
| **Romantic** | rosa quente | 💕 | warm tones, soft light, intimate | smooth, intimate, R&B vibe |
| **Dark** | preto/roxo | 🌑 | shadows, black, occult, eerie | dark, ominous, haunting |
| **Energetic** | laranja/amarelo | ⚡ | bright, motion, kinetic, electric | hyped, energetic, party |
| **Atmospheric** | azul claro/teal | 🌌 | ethereal, cinematic, vast, dreamlike | ambient, cinematic, dreamy |

### Naming inspirado nos hits do artista (bonus)

Quando o produtor escolhe um artista (lista ou custom validado via Spotify):

1. Sistema chama `GET /v1/artists/{id}/top-tracks?market=US` (Spotify API)
2. Pega titulos das 20 musicas mais populares
3. Esses titulos viram input adicional pro Claude no `generate.py`
4. Prompt forca **"inspirado em, nao copia literal"** pra evitar problemas de copyright
5. Saida: titulos curtos no estilo lexical do artista (ex: Drake → "GOD PLAN", "FEELINGS", "HOTLINE BLOCK")

**Cuidado de copyright:** copiar titulo identico ("God's Plan" tal qual) e zona cinza. Prompt deve gerar variacoes proximas mas nao identicas. Se o produtor quiser usar titulo exato, ele edita manualmente na tela de review (risco fica com ele).

## Consequencias

### Schema (novas/modificadas tabelas)

- **Nova:** `artistas_referencia` — lista controlada inicial + customs validados
- **Nova:** `beat_artistas` — relacao N:N (um beat pode ter colaboradores)
- **Modificado:** `beats` — adicionar coluna `mood` (enum dos 6 valores) obrigatoria
- **Modificado:** `posts` — copy gerado deve referenciar mood + artistas no input do Claude

### Tasks novas no `_tasks-mvp.md` (Fase 1)

1. Curadoria inicial da lista de ~80-100 artistas
2. Componente Combobox de autocomplete
3. Cards visuais de mood
4. Service `spotify_service.py` (search artist + top tracks + auth)
5. Endpoint de validacao de artista custom
6. Atualizar prompt do `generate.py` pra incluir mood + top tracks
7. Migration adicionando `mood` em `beats` e tabelas `artistas_referencia` + `beat_artistas`

### Riscos / pontos a monitorar

- **Lista vai envelhecer rapido.** Type beat tem rotatividade brutal de artistas (Nettspend, Fakemink, Lucy Bedroque nao existiam ha 1 ano). Gustavo precisa revisar customs mais usados 1x/mes.
- **Custom tende a ser maioria de inicio.** Aceitar isso. Lista cresce organicamente conforme aparecem padroes.
- **Spotify API rate limit.** Free tier e generoso (centenas de chamadas por minuto), mas cachear resposta de validacao por nome no Redis/Upstash evita chamadas duplicadas.
- **Producer pode escolher artista que nao existe no Spotify.** Permitir, com warning. Sistema apenas nao tera top tracks pra alimentar gerador de nomes — copy ainda funciona, sem o "inspirado em".

## Referencias

- Sessao do brainstorm: `docs/sessoes/2026-05-07-brainstorm-jornada-cliente.md`
- Decisao irma: `docs/decisoes/2026-05-07-geracao-de-capa-mvp.md`
- Spotify Web API docs: https://developer.spotify.com/documentation/web-api
