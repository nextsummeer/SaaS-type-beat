# Resumo — Analise de Concorrentes BeatPost (2026-05-07)

> Conversa com Claude no projeto BEATPOST sobre concorrentes encontrados (beatstars-upload no GitHub e BeatValet) e estrategia tecnica pra cobrir BeatStars no futuro.

## TL;DR

1. **beatstars-upload (GitHub)** = script local de uso pessoal, NAO e concorrente.
2. **BeatValet (beatvalet.com)** = concorrente direto e relevante, SaaS desktop, founding rate ainda aberto.
3. **Stack web do BEATPOST esta certa.** Nao virar desktop.
4. **BeatStars na nuvem e tecnicamente viavel.** Plano: cobrir na V1.5 via engenharia reversa da API interna.

---

## 1. Sobre o BeatValet

### O que e
SaaS desktop (Win/Mac) que automatiza desde o `.flp` do FL Studio ate o upload em BeatStars + YouTube.

### Como ele faz BeatStars (sem API publica)
- BeatStars NAO tem API publica e nao tem planos de criar
- BeatValet usa **browser embutido** (Chromium) que loga com cookie do user e clica nos botoes
- "We never store your credentials" = guardam o cookie de sessao, nao a senha

### Como ele faz FL Studio
- Le o `.flp` com parser open source (PyFLP-like)
- **Abre o FL Studio na maquina do user** e dispara render via CLI (`FL.exe /R`) ou cliques simulados
- "FL Studio does the rendering, BeatValet does the clicking"

### Precos
- Pro: $9.99/mes founding (vitalicio) | $24.99 normal | 12 beats/mes
- Pro Unlimited: $19.99/mes founding | $49.99 normal | ilimitado
- 25 vagas founding (20-21 ainda disponiveis)
- Empresa SEM rastro digital (sem Instagram, sem Google reviews)

---

## 2. Comparacao direta BeatPost vs BeatValet

| | BeatValet | BEATPOST |
|---|---|---|
| Ponto de entrada | `.flp` do FL Studio | MP3 ja mixado |
| Plataformas | BeatStars + YouTube | So YouTube (MVP) |
| Tipo | App desktop | SaaS web |
| Mobile | Nao | Sim |
| Agendamento sem PC ligado | Nao | Sim |
| IA | Generica ("AI") | Gemini + Claude (explicito) |
| Saidas | 1 titulo/desc/tag | 3 pacotes A/B/C |
| Mercado | Ingles / EUA | PT-BR |
| Status | MVP em founding rate | MVP em construcao |

---

## 3. Pontos cegos da analise inicial (validados)

Reflexao critica que veio na conversa:

1. **Anedota n=1 e perigosa.** O fato do Gustavo nao querer instalar nao significa que o produtor medio nao quer (ele ja usa FL Studio, plugins VST, Splice etc).
2. **"Logar e funciona" tem 8 passos com atrito real** — nao e tao simples quanto parece.
3. **YouTube = topo de funil. BeatStars = onde a venda acontece.** Cobrir so YouTube te deixa como metade da solucao.
4. **"Hub multi-fase" pode virar armadilha de escopo** se quiser construir tudo no MVP. Notion virou hub depois de dominar notas.
5. **"Proposta diferente" nao significa "nao concorrente".** Brigam pelo mesmo budget mensal do mesmo produtor.

---

## 4. Onde esta o moat real do BEATPOST

Nao e "ser web". E:
1. **Mercado PT-BR** — barreira de idioma + cultural + pagamento
2. **3 pacotes A/B/C** — feature unica
3. **Repost agendado em 3 datas** — estrategia conhecida de SEO de type beat
4. **Fase 2 (analytics)** — vira sticky factor real

---

## 5. BeatStars na nuvem — 3 caminhos tecnicos

### Caminho 1: Browser headless no servidor
- Playwright/Puppeteer rodando em worker
- Funciona, mas ~500MB-1GB RAM por sessao = caro pra escalar

### Caminho 2: Engenharia reversa da API interna (RECOMENDADO)
- Site moderno tem API privada que o front consome
- Devtools mostra os endpoints, replicar via HTTP no servidor
- Rapido, barato, escala bem
- Risco: BeatStars pode mudar API privada sem aviso

### Caminho 3: Extensao de browser
- Roda no PC do user, controlada pelo nosso site
- Sem custo de servidor, sem risco de ban
- Atrito: user precisa instalar extensao (menor que app desktop)

**Recomendacao**: comecar com Caminho 2 na V1.5, manter Caminho 1 como fallback.

---

## 6. Sobre tentar API oficial com BeatStars

- Eles ja disseram publicamente que NAO tem planos
- Pedidos da comunidade ha anos sem resposta
- Razao estrategica: API = perder controle do funil
- **Alternativa real**: programa de afiliados / parceria comercial

---

## 7. Decisoes tomadas

- MVP continua so YouTube (nao adicionar BeatStars agora)
- V1.5 cobre BeatStars via Caminho 2 (engenharia reversa)
- Arquitetura web mantida em TODAS as fases (nao virar desktop)
- Gustavo vai considerar assinar BeatValet pra benchmark (sugestao: rodar em VM por seguranca)

---

## 8. Acoes pendentes

- [ ] Assinar BeatValet em VM/maquina secundaria pra benchmark
- [ ] Adicionar tarefa V1.5 BeatStars no `_tasks-mvp.md` quando MVP fechar
- [ ] Reler Terms of Service do BeatStars antes de implementar
- [ ] Avaliar contato comercial com BeatStars (afiliados) antes de codar

---

## 9. Onde isso virou doc no projeto

- `docs/contexto/concorrentes/_index.md` — panorama
- `docs/contexto/concorrentes/beatvalet.md` — analise detalhada
- `docs/contexto/concorrentes/beatstars-upload-github.md` — script open source
- `docs/arquitetura/integracao-beatstars-futura.md` — caminhos tecnicos V1.5
- `docs/sessoes/2026-05-07-concorrentes-e-stack.md` — registro da sessao
