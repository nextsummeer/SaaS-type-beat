# Prompt DNA da capa IA v2 — princípio mestre, anti-aesthetics, variação por 7 eixos

**Data:** 2026-05-21 (sessão 3)
**Status:** aceita (complementa `2026-05-21-geracao-de-capa-prompt-base-claude.md`)
**Tags:** decisao, produto, mvp, ia, capa, claude, prompt-engineering, dna, anti-aesthetics, variacao, ux

## Contexto

A ADR de 2026-05-21 (sessão 2) deixou o `PROMPT_BASE_TEMPLATE` em `cover_prompt_builder.py` como **placeholder declarado** — literalmente a capa "Lil Baby + hood/Atlanta" que Gustavo validou em 3 testes. Funcionava como exemplo concreto, mas tinha 3 problemas estruturais:

1. **Era uma capa, não um molde.** Quando o brief pedia algo radicalmente diferente (ex: `interior_luxo + sexy + mulher + vermelho`), o Claude tinha que desaprender muita coisa específica do template (Atlanta, trap, jovem homem, golden hour) — saída instável.
2. **Checagem de likeness só por string match.** Claude podia driblar facilmente com perífrases ("the OVO sound", "the artist from Toronto", "the 6 god vibe"). Sem blocklist de apelidos.
3. **Mesmo brief → sempre o mesmo prompt → imagens muito parecidas.** Sem mecanismo de variação real entre cliques do produtor.

Entre as sessões 2 e 3, Gustavo conduziu uma sessão paralela com Claude normal (sem acesso ao repo) entregando o documento `beatpost_cover_dna_v2.md` — uma especificação completa de engenharia de prompt com princípio mestre, DNA universal, anti-aesthetics block, gramática visual estruturada, brief redesenhado e sistema de variação determinístico em código.

Esta ADR registra a adoção dessa especificação no MVP.

## Decisão

### 1. Princípio mestre — Captured, Not Composed

Toda capa BeatPost passa a simular uma fotografia **flagrada**, não **montada**. Sujeitos em ação interrompida, atenção desviada da câmera, composição descentralizada, imperfeições técnicas como assinatura. Esse princípio fica acima de qualquer outro — em caso de conflito entre opções, vence a mais "acidental, real e flagrada".

Pergunta de validação visual: *se essa imagem aparecesse numa pasta `2003_fotos_misc/` no HD de alguém, o espectador acreditaria que ela foi tirada de verdade?*

### 2. Brief estruturado v2 (6 campos obrigatórios + 2 opcionais + nota livre)

| Campo | Tipo | Notas |
|---|---|---|
| `genero_primario` | enum 11 opções | ancora a estética visual |
| `genero_secundario` | enum, opcional via "+" | camada tonal/atmosférica |
| `artista_primario` | texto livre | referência estética apenas |
| `artista_secundario` | texto livre, opcional via "+" | combinação de DNAs visuais |
| `quem_aparece` | enum 6 opções | inclui `aleatorio` |
| `mood` | enum 6 opções | vocabulário nativo da cena (flexin/dark/sad/sexy/party/chill) |
| `cenario` | enum 9 opções | inclui `aleatorio` |
| `atmosfera_luz` | enum 7 opções | inclui `aleatorio` |
| `nota_livre` | texto opcional | max 280 chars, passa por sanitizer |

**Reversão consciente:** a ADR de 2026-05-21 (sessão 2) planejava reduzir de 5 pra 3 campos "depois que o sistema amadurecesse". A v2 vai na direção oposta porque a sessão paralela mostrou que **gênero é o sinal mais informativo** — produtores de type beat pensam primeiro no gênero, depois no resto. Adicionar gênero como âncora simplifica o trabalho do Claude (em vez de inferir estética a partir de mood + ambiente, recebe estética já ancorada).

### 3. Arquitetura do builder — pacote, não arquivo monolítico

`cover_prompt_builder.py` (monolítico) → pacote `cover_prompt_builder/` com módulos especializados:

```
cover_prompt_builder/
├── __init__.py
├── types.py            # dataclasses CoverBrief, VariationAxes, BuildResult
├── system_prompt.py    # texto integral do SYSTEM_PROMPT v2 (~250 linhas EN)
├── user_prompt.py      # template + preenchimento
├── variation.py        # sample_variation_axes() + listas dos 7 eixos
├── vocabulary.py       # slugs PT → frases EN (versão MÍNIMA nesta fase)
├── sanitizer.py        # higieniza nota livre
├── validators.py       # 7 validações (likeness, estrutura, AVOID, etc.)
└── builder.py          # orquestrador build_cover_prompt()
```

Responsabilidades separadas facilitam iteração futura sem mexer no orquestrador.

### 4. SYSTEM_PROMPT estruturado em 5 seções

Substitui o `PROMPT_BASE_TEMPLATE` antigo. Texto integral em `system_prompt.py`, ~250 linhas em inglês. Estrutura:

1. **Master Principle** — Captured, Not Composed.
2. **Universal DNA** — 9 elementos sempre presentes (analog film, face obscurecido, etnia explícita quando aplicável, pele real não porcelana, lived-in clothing, luz natural/prática, cor como fonte não filtro, composição descentralizada, "leak feeling").
3. **Anti-aesthetics** — 6 categorias detalhadas do que NUNCA pode aparecer (pose/direção, pele/rosto, iluminação, bordas/acabamento, finishing técnico, pessoas reais).
4. **Genre as Primary Aesthetic Anchor** — descrição estética implícita por gênero (11 gêneros × ~30 palavras cada) + regra de mistura 70/30 quando há gênero secundário.
5. **Output Rules** — 7 blocos na ordem, comprimento, terminar com bloco `AVOID:` de 8-12 itens relevantes ao brief.

### 5. Sistema de variação por 7 eixos

Sorteio determinístico (em Python, antes da chamada ao Claude) injeta diversidade legítima:

| Eixo | Valores |
|---|---|
| `subject_framing` | close_face / medium_torso / full_body / hands_detail / over_shoulder / wide_environment |
| `camera_angle` | eye_level / low_angle / high_angle / dutch_tilt / from_behind / awkward_crop |
| `time_of_day` | harsh_noon / golden_hour / blue_hour / night_practical / predawn / overcast |
| `sub_location` | lista própria por cenário (5-8 valores cada) |
| `secondary_prop` | none / cash / drink / phone / cigarette / jewelry_detail / food_wrapper / car_keys |
| `motion_state` | still / mid_stride / turning_away / gesturing / interrupted_action / slight_blur |
| `film_quirk` | none / light_leak_corner / chromatic_edge / dust_spot / scan_line / slight_color_bleed |

Compatibilidade básica é resolvida no `variation.py` (ex: `secondary_prop` ignora `sem_pessoa`; `time_of_day=night_practical` casa com `atmosfera_luz=luz_colorida`). Compatibilidade rica (matriz cenário × gênero × mood) fica pra próxima sessão junto do `vocabulary.py` v2.

Eixos sorteados são persistidos em `cover_library.variation_seeds` (JSONB) por capa pra debug e analytics futuras.

### 6. Prompt caching da Anthropic habilitado

`SYSTEM_PROMPT` é idêntico em toda chamada. Passando `cache_control: {"type": "ephemeral"}` no `system` da request reduz custo de tokens de input em ~90% após o primeiro hit. Em escala isso é decisivo.

### 7. Validators expandidos

7 validações antes de aceitar o output do Claude:

1. Comprimento (1500-4000 chars).
2. Likeness — nome direto (mantém check atual case-insensitive, agora aplicado a primário E secundário).
3. Likeness — apelidos por blocklist (começa com 5-6 artistas populares: Drake, Kendrick, Future, Carti, Lil Baby).
4. Likeness — frases-âncora genéricas ("the artist from", "the famous", "the iconic").
5. Estrutura — presença mínima dos 7 blocos por keywords.
6. Bloco `AVOID:` no fim, com pelo menos 8 itens.
7. Anti-aesthetics inline (corpo do prompt não pode conter termos como "porcelain skin", "studio lighting", "cinematic bokeh", "glowing border").

**Validação 6 em warning-mode na fase inicial.** Se Claude esquecer de fechar com `AVOID:`, sistema loga warning mas aceita o output. Depois de 1 semana de logs, vira hard-fail. Justificativa: evita perda de capas boas por capricho de formato enquanto Claude se calibra ao prompt novo.

### 8. Sanitização da nota livre

Nota livre passa por:
1. Truncamento em 280 chars.
2. Rejeição se contém padrões de prompt injection (`"ignore previous"`, `"system:"`, `"</system>"`, etc.).
3. Rejeição se contém termos incompatíveis com estética (`"anime"`, `"cartoon"`, `"3d render"`, `"illustration"`, etc.).

Sem essa sanitização, hoje a nota entra crua no user prompt, abrindo vetor de ataque e degradação estética.

### 9. Opção `aleatorio` em cenário e luz — escondida do wizard nesta fase

`aleatorio` está nos enums do brief (backend aceita), mas o wizard frontend **não mostra** essa opção até o `vocabulary.py` v2 entregar a matriz de compatibilidade scene × light × mood. Implementar sorteio random puro agora produziria combinações estranhas (ex: `festa_underground + sol_duro_dia`) e frustraria o produtor.

### 10. Migrations destrutivas autorizadas

Como Gustavo é o único usuário com dados reais nesta fase, migrations renomeiam colunas livremente (não precisa manter back-compat de schema). Cobertura precisa incluir os **3 lugares onde brief vive**:

- `cover_library` (uma row por capa gerada)
- `user_profiles.default_brief` (JSONB com o brief padrão)
- `brief_presets` (tabela inteira de presets nomeados)

Mapeamentos de migração (PT slug velho → PT slug novo):

```
sujeito.jovem        → quem_aparece.homem_solo
sujeito.mulher       → quem_aparece.mulher_solo
sujeito.grupo        → quem_aparece.grupo
sujeito.sem_pessoa   → quem_aparece.sem_pessoa
sujeito.so_objeto    → quem_aparece.sem_pessoa

ambiente.rua_hood       → cenario.rua_americana
ambiente.interior_luxo  → cenario.interior_luxo
ambiente.noturno        → cenario.paisagem_urbana
ambiente.natureza       → cenario.paisagem_aberta
ambiente.neon           → cenario.festa_underground
ambiente.minimalista    → cenario.closeup_objeto

iluminacao.sol_duro     → atmosfera_luz.sol_duro_dia
iluminacao.golden_hour  → atmosfera_luz.golden_hour
iluminacao.vermelho     → atmosfera_luz.luz_colorida
iluminacao.azul_neon    → atmosfera_luz.luz_colorida
iluminacao.noturno      → atmosfera_luz.noite_natural
iluminacao.vintage      → atmosfera_luz.meia_luz

energia.agressivo    → mood.dark
energia.melancolico  → mood.sad
energia.sexy         → mood.sexy
energia.hood_famous  → mood.flexin
energia.atmosferico  → mood.chill
energia.festa        → mood.party

artista_nome → artista_primario
```

Script Python aplica isso nos 3 lugares numa transação.

## Consequências

### Entradas no recorte (Tasks T4.19-T4.26)

- Refatoração `cover_prompt_builder.py` → pacote modular
- SYSTEM_PROMPT v2 estruturado em 5 seções
- Sistema de variação determinístico por 7 eixos
- Brief de 6+2 campos no schema, backend, frontend
- Prompt caching da Anthropic
- Validators expandidos (3 camadas de likeness, anti-aesthetics inline, AVOID block warning-mode)
- Sanitizer da nota livre
- Migration aditiva + script de migração cobrindo 3 lugares
- Wizard frontend reescrito (skill frontend-design, mantém Editorial Mono)
- Botão "Gerar variação" ao lado de "Gerar 1"/"Gerar 3" (UX signaling)

### Saídas do recorte (próximas sessões)

- `vocabulary.py` rico com matriz de compatibilidade scene/light/mood
- Sub-locations curadas por cenário (5-8 por slug)
- Modo simbólico/conceitual aprofundado para `quem_aparece=sem_pessoa`
- Opção `aleatorio` no wizard (depende de vocabulary v2)
- Eval suite de 15-20 briefs canônicos pra regression visual
- Expansão grande da blocklist de apelidos (começa com 5-6 artistas)
- Analytics dos `variation_seeds` (quando houver volume)

### CLAUDE.md regra 6

Atualizar de:
> Capa pode ser gerada por IA (aba dedicada `/capas`) ou enviada manualmente. Geracao usa prompt base mestre (hardcoded, secreto) + brief estruturado de 5 campos (artista + sujeito + ambiente + luz + energia + nota livre opcional). Claude Sonnet 4.6 monta prompt final → fal.ai gpt-image-2 quality=low gera imagem ($0.013/capa total, ~30s). NUNCA mencionar nome de artista real no prompt final (likeness). Capas ficam em biblioteca reusavel (`cover_library`) por produtor — usadas em N beats. UX assincrona. Limite de creditos por tier (Free 5 / Intermediario 15 / Premium 40). Upload manual sempre disponivel em todos os tiers (nao consome creditos). Toda geracao registra em `api_usage`. Detalhes em `docs/decisoes/2026-05-21-geracao-de-capa-prompt-base-claude.md`.

Pra:
> Capa pode ser gerada por IA (aba dedicada `/capas`) ou enviada manualmente. Geracao usa SYSTEM_PROMPT v2 estruturado (Captured Not Composed + DNA universal + anti-aesthetics + 7 blocos) + brief de 6+2 campos (genero primario+secundario, artista primario+secundario, quem aparece, mood, cenario, atmosfera de luz, nota livre opcional) + sorteio de 7 eixos de variacao em Python. Claude Sonnet 4.6 (com prompt caching) monta prompt final → fal.ai gpt-image-2 quality=low ($0.013/capa, ~30s). NUNCA mencionar nome de artista real no prompt final (likeness via 3 camadas: nome direto + apelidos blocklist + frases-ancora genericas). Capas ficam em `cover_library` (campo `variation_seeds` JSONB persiste os 7 eixos sorteados). Creditos por tier (Free 5 / Intermediario 15 / Premium 40). Upload manual nao consome creditos. Detalhes em `docs/decisoes/2026-05-21-prompt-dna-capa-v2.md`.

### Riscos

- **Wizard ganha 1-2 campos a mais (atrito).** Mitigação: campos secundários (artista_secundario, genero_secundario) escondidos atrás de botão "+" — UI default fica equivalente em complexidade ao wizard antigo.
- **DNA v2 não foi validado visualmente no volume.** Sessão paralela com Claude normal foi conceitual. Mitigação: rodar 10-15 briefs manuais cobrindo combinações diversas na T4.21 antes de habilitar pra produção.
- **Prompt caching exige reorganizar parâmetros do SDK Anthropic.** SDK aceita `cache_control` mas o formato é específico. Mitigação: verificar em [docs.anthropic.com/en/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) antes de implementar T4.21.
- **Migration destrutiva sem rollback.** Mitigação: Gustavo é único usuário (autorização explícita). Backup Supabase manual antes de rodar migration em produção.
- **Validador AVOID em warning-mode pode mascarar problemas.** Mitigação: revisar logs após 1 semana e endurecer.

## Referências

- ADR complementada: `docs/decisoes/2026-05-21-geracao-de-capa-prompt-base-claude.md`
- ADR irmã (capa manual): `docs/decisoes/2026-04-25-capa-manual.md`
- Documento-fonte da sessão paralela: `beatpost_cover_dna_v2.md` (anexo, não versionado no repo)
- Sessão de briefing: `docs/sessoes/2026-05-21-engenharia-prompt-capa-ia-estado-atual.md`
- Tasks de implementação: `_tasks-mvp.md` T4.19-T4.26
- Prompt caching Anthropic: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- Modelo Claude usado: `claude-sonnet-4-6` (mesmo de `generate.py`)
