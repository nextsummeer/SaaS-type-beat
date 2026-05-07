# Sessao 2026-05-07 — Analise de concorrentes (BeatValet) e estrategia BeatStars

## Contexto

Gustavo encontrou dois projetos no espaco de automacao de beats e pediu analise:
1. Repo GitHub `MyNameIsCarsten/beatstars-upload` — script Python local
2. SaaS BeatValet (beatvalet.com) — concorrente direto

## Decisoes / conclusoes da sessao

### 1. beatstars-upload nao e concorrente
- Script local de uso pessoal, sem IA, sem produto comercial.
- Util como prova de conceito de browser automation pra BeatStars.
- Doc detalhado: [contexto/concorrentes/beatstars-upload-github.md](../contexto/concorrentes/beatstars-upload-github.md)

### 2. BeatValet e concorrente direto e relevante
- Empresa nova, founding rate de 25 vagas ainda aberto.
- App desktop Win/Mac. Cobre FL Studio → BeatStars + YouTube.
- Diferencial deles: integracao FL Studio (auto-export stems) + BeatStars.
- Doc detalhado: [contexto/concorrentes/beatvalet.md](../contexto/concorrentes/beatvalet.md)

### 3. Stack web do BEATPOST mantida
Discussao validou que SaaS web e a escolha certa:
- Sem instalar = menos atrito de cadastro
- Mobile funciona
- Agendamento roda 24/7 sem PC ligado
- Mercado PT-BR aberto (BeatValet so ingles)

**Pontos cegos identificados pelo Claude (validados pelo Gustavo):**
- "Logar e funciona" tem mais atrito do que parece (8 passos)
- BeatStars cobre a venda; YouTube cobre so o topo de funil
- Risco de virar "feature secundaria" se outro concorrente cobrir os dois canais
- "Hub multi-fase" pode virar armadilha de escopo se quiser tudo no MVP

### 4. BeatStars na nuvem e tecnicamente viavel
3 caminhos identificados:
- Caminho 1: browser headless servidor (caro mas robusto)
- **Caminho 2: engenharia reversa da API interna (recomendado)**
- Caminho 3: extensao de browser (hibrido)

Doc de planejamento: [arquitetura/integracao-beatstars-futura.md](../arquitetura/integracao-beatstars-futura.md)

## Decisoes de roadmap

- **MVP (Fase 1)**: continua so YouTube. Nao adicionar BeatStars agora.
- **V1.5**: cobrir BeatStars via Caminho 2 (engenharia reversa). Reduz risco de virar feature secundaria.
- **Nao virar desktop**: arquitetura web sera mantida em todas as fases.

## Acoes pendentes

- [ ] Gustavo: assinar BeatValet pra benchmark (sugerido rodar em VM por seguranca)
- [ ] Adicionar tarefa V1.5 BeatStars no `_tasks-mvp.md` quando MVP fechar
- [ ] Reler Terms of Service do BeatStars antes de implementar Caminho 2
- [ ] Avaliar contato comercial com BeatStars (afiliados/parceria) antes de codar

## Pontos sobre o usuario / projeto registrados em memoria

- Gustavo valoriza analise sincera com contraponto, nao concordancia automatica
- Decisao consciente de manter SaaS web (nao virar desktop) mesmo cobrindo BeatStars no futuro
