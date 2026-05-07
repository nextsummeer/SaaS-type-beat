# BeatValet

> SaaS desktop de automacao end-to-end para produtores de type beat. Concorrente direto mais relevante identificado ate hoje.
> Site: https://www.beatvalet.com — analisado em 2026-05-06.

## O que e

App desktop (Windows/Mac) que automatiza o fluxo: arquivo `.flp` do FL Studio → exporta stems → gera capa/video → preenche metadados → faz upload em BeatStars + YouTube.

## Stack tecnico (deduzido — pagina nao revela)

| Camada | Implementacao provavel |
|---|---|
| App | Desktop nativo Windows + Mac (instalavel) |
| FL Studio | Parser de `.flp` (PyFLP-like) + dispara FL Studio via CLI (`FL.exe /R`) ou automacao UI (AutoHotkey/PyAutoGUI) |
| BeatStars | Browser embutido (Chromium + Playwright/Puppeteer), loga com cookie do user, automacao de UI |
| YouTube | Google OAuth + YouTube Data API v3 oficial |
| Audio | Modelo de music information retrieval pra BPM/key + LLM nao especificado pra copy/SEO |
| Video | ffmpeg + visualizer customizavel |

## Planos e precos

| Plano | Founding (vitalicio) | Normal | Limite |
|---|---|---|---|
| Pro | $9.99/mes | $24.99/mes | 12 beats/mes |
| Pro Unlimited | $19.99/mes | $49.99/mes | Ilimitado |

- 25 vagas founding total (20-21 ainda disponiveis em 2026-05-06)
- 7 dias garantia devolucao
- Empresa sem rastro digital (sem Instagram, sem Google reviews) — risco percebido pelo Gustavo na decisao de assinar

## Roadmap deles

- Em desenvolvimento: Airbit, Logic, Ableton
- Planejado: "ferramentas de IA e receita" (vago)

## Diferenciais deles vs nosso

**Onde ganham:**
1. Cobrem o ciclo desde o `.flp` (economiza renderizacao manual) — diferencial mais forte
2. Cobrem BeatStars (canal de venda real, nao so topo de funil como YouTube)
3. Templates reutilizaveis por genero/mood
4. Auto-insert de URL do marketplace na descricao do YouTube
5. Ja vendendo agora — capturando producers globais

**Onde perdem:**
1. So funciona no PC do user (sem mobile)
2. Nao agenda publicacao se o PC estiver desligado
3. Inglish-only, foco USA
4. Empresa sem rastro digital gera resistencia
5. Cada update do FL Studio pode quebrar a automacao deles
6. So 1 titulo/desc/tag — nao tem 3 pacotes A/B/C

## Riscos pra BEATPOST

1. **Janela de tempo**: estao ja captando founders. Cada produtor que assinar vitalicio com eles e cliente que nao vai pagar 2 ferramentas.
2. **Vocabulario do problema**: se eles dominarem o discurso "automacao de upload de beats" globalmente, ficamos sempre comparando.
3. **Briga pelo mesmo budget**: produtor tem ~$20-30/mes pra ferramenta. Vai escolher uma. Proposta diferente nao significa nao-concorrente.

## Oportunidades pra BEATPOST

1. **Mercado PT-BR**: barreira de idioma + pagamento internacional + cultura local
2. **Mobile**: produtor agenda do celular, BeatValet nao consegue
3. **3 pacotes A/B/C**: feature unica nossa
4. **Repost agendado em 3 datas**: estrategia conhecida de SEO de type beat
5. **Hub multi-fase** (analytics + comunidade + marketplace): viramos sticky com o tempo

## Acoes recomendadas

- [ ] Assinar BeatValet pra benchmark (Gustavo resistente por questao de seguranca — sugestao: rodar em VM/maquina secundaria)
- [ ] Monitorar lancamento de novas integracoes deles
- [ ] Estudar pricing deles antes de definir o nosso
- [ ] Decidir se vamos cobrir BeatStars na V1.5 — ver [integracao-beatstars-futura.md](../../arquitetura/integracao-beatstars-futura.md)
