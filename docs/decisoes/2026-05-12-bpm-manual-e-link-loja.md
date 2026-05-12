# BPM manual + link da loja como inputs do upload

**Data:** 2026-05-12
**Status:** aceita
**Tags:** decisao, upload, ux, audio-analysis, t2.13

## Contexto

No primeiro teste real do pipeline end-to-end (2026-05-12), o `librosa.beat.beat_track` detectou BPM 92 para um beat que era 140 BPM (Travis Scott type beat com hi-hats em tripletas). Erro classico de half-time/triplet-time: 140 × 2/3 = 93.33.

Librosa e deterministico — mesmo arquivo sempre da o mesmo BPM. Testes com beats de Travis Scott, Drake, e outros artistas trap revelaram que ~30% dos type beats com padroes ritmicos complexos (tripletas, syncopation, hi-hats fora do tempo) sao detectados errado pelo librosa.

Heuristicas (multiplicar por 1.5, 2, etc) corrigem alguns casos mas introduzem falsos positivos em beats genuinamente lentos (R&B 70-90 BPM).

Paralelamente, o template da descricao tinha placeholder `[insira seu link de venda]` que o produtor editava manualmente na review page apos a IA gerar. Frico desnecessario.

## Opcoes Consideradas

### 1. Manter librosa + heuristica esperta

- **Pros:** Continua automatico. Sem mudanca na UX.
- **Contras:** Heuristica falha em beats lentos legitimos. Custo computacional. Tempo de pipeline ~15s analyzing.

### 2. Trocar librosa por outra lib (madmom, essentia)

- **Pros:** Algoritmos mais robustos.
- **Contras:** Dependencias pesadas. Custo maior no Railway. Ainda nao 100% confiavel.

### 3. Producer informa BPM manualmente no upload

- **Pros:** 100% confiavel (produtor sabe o BPM do beat dele). Pipeline mais rapido (~5s no analyze). Mais barato (menos CPU). Elimina classe inteira de bugs.
- **Contras:** Mais um campo no form de upload.

### 4. Modelo de ML proprio

- **Pros:** Pode aprender padroes especificos.
- **Contras:** Custo absurdo para o problema. Treinamento, manutencao.

## Decisao

**Veredito: Opcao 3 (input manual).**

Produtor sabe o BPM do beat — ele que produziu. DSP adivinhando quando o humano ja sabe e desperdicio. Mesma logica aplicada ao link da loja: se o produtor ja tem o beat publicado, ele cola o link no upload e o sistema substitui o placeholder na descricao gerada.

Sobre **detecao de tom (key)**: mantida via `librosa.feature.chroma_cqt` + perfis Krumhansl-Kessler. Esse algoritmo e robusto e raramente erra. Produtor pode editar manualmente na review page se quiser.

## Consequencias

**Codigo:**
- `audio_service.py`: funcao renomeada `detect_bpm_and_key` → `detect_key`. Remove `librosa.beat.beat_track`. Retorna apenas `{music_key}`.
- `analyze.py`: nao atualiza mais coluna `bpm`. Atualiza apenas `music_key`.
- `routes/beats.py`: aceita `bpm: int` (obrigatorio, validacao 40-300) e `store_link: str?` (opcional).
- `UploadForm.tsx`: adiciona campo BPM obrigatorio + checkbox "ja publicado em loja" + campo link condicional.
- `anthropic_service.py`: recebe `store_link`. Substitui placeholder na descricao se preenchido.
- `generate.py`: passa `beat.store_link` para `generate_metadata()`.

**Banco:**
- Migration `005_store_link.sql`: ADD COLUMN `beats.store_link text`.
- Coluna `beats.bpm` continua existindo — agora preenchida no momento do upload.

**Pipeline:**
- Etapa "Analise com IA" fica mais rapida (~5s vs ~15s anteriormente).
- Tag "[bpm] bpm type beat" gerada pelo Claude usa o BPM correto.
- Descricao tem o link da loja embutido (quando informado).

**UX:**
- Upload tem mais 1-2 campos. Trade-off aceitavel — economiza edicao manual na review.
- Onboarding pode incluir tooltip explicando que o BPM e do beat (nao do BPM detectado).

**Reversibilidade:**
- Se input manual de BPM provar ser fricao real (>30% dos usuarios reclamarem), podemos voltar a detectar com librosa + heuristica e usar o input como override.
