# Integracao BeatStars — Caminhos Tecnicos (V1.5+)

> BeatStars NAO esta no escopo do MVP. Este doc registra os caminhos tecnicos viaveis pra quando entrar (provavelmente Fase 1.5 ou 2).
> Investigado em 2026-05-07. Status: planejamento futuro, nao implementar agora.

## Contexto

- BeatStars **nao tem API publica** e nao tem planos de criar (confirmado em feature requests da comunidade ha anos).
- Concorrente BeatValet cobre BeatStars via app desktop com browser embutido.
- BEATPOST e SaaS web — precisa cobrir BeatStars **na nuvem** sem virar desktop.

## Caminho 1 — Browser headless no servidor

```
User clica "publicar BeatStars" → Worker dispara Playwright
→ Chromium headless loga com cookie salvo do user
→ Preenche campos, anexa arquivos, publica
→ Fecha browser, libera memoria
```

**Pros:**
- Funciona com qualquer mudanca minima visual do BeatStars
- Mesmo metodo do BeatValet, mas na nuvem

**Contras:**
- ~500MB-1GB RAM por sessao
- Custo escala mal financeiramente (50 uploads simultaneos = servidor robusto)
- Requer container/VM com Chromium instalado (nao roda em Vercel serverless)

**Onde rodaria:** Railway/Fly.io/AWS ECS — nao serverless.

## Caminho 2 — Engenharia reversa da API interna (RECOMENDADO)

Todo site moderno tem API privada que o front consome. Devtools no upload do BeatStars revela endpoints tipo:

```
POST https://api.beatstars.com/internal/v2/tracks
POST https://api.beatstars.com/internal/v2/tracks/{id}/audio
POST https://api.beatstars.com/internal/v2/tracks/{id}/publish
```

Replicar essas chamadas direto via HTTP, sem browser.

**Pros:**
- 10x mais rapido que browser headless
- Custo de servidor minimo (so HTTP)
- Roda em qualquer worker (QStash + FastAPI)

**Contras:**
- BeatStars pode mudar API privada sem aviso → quebra
- Pode violar Terms of Service (revisar antes)
- Conta pode ser flagada se trafego parecer "robo demais" (sem User-Agent realista, sem timing humano)

**Mitigacoes:**
- Adicionar headers de browser realistas
- Throttle: max N uploads/min por user
- Monitor de erro 4xx/5xx pra detectar quebra cedo

## Caminho 3 — Extensao de browser

Extensao do Chrome rodando no PC do user, controlada pelo nosso site.

```
User instala extensao uma vez
→ No nosso site, clica "publicar BeatStars"
→ Site dispara mensagem pra extensao
→ Extensao executa upload no browser do user
```

**Pros:**
- Sem custo de servidor
- Sem risco de ban (e o user fazendo no PC dele)
- Bypass de qualquer rate limiting deles

**Contras:**
- User precisa instalar extensao (atrito menor que app desktop, mas existe)
- So funciona quando user esta no browser
- Mantem nosso posicionamento "web", mas hibridiza

## Recomendacao para V1.5

**Comecar com Caminho 2 (engenharia reversa).** Custo-beneficio melhor. Implementar com:
- Worker QStash dedicado em `api/workers/publish_beatstars.py`
- Cookies do user encriptados em `vault.user_beatstars_cookies` (mesmo padrao do refresh_token YouTube)
- State machine: `publishing_beatstars → published_beatstars | failed_beatstars`
- Throttle conservador: 3 uploads/hora por user no inicio

**Manter Caminho 1 como fallback** se Caminho 2 quebrar de vez (BeatStars endurecer).

**Caminho 3** so se Caminhos 1 e 2 ambos provarem inviaveis.

## Antes de implementar (checklist)

- [ ] Reler Terms of Service do BeatStars
- [ ] Tentar contato comercial / parceria oficial primeiro (afiliados)
- [ ] Validar via prototipo rapido se a API interna deles e estavel
- [ ] Ter plano B claro (Caminho 1) caso quebre

## Por que nao no MVP

- Escopo MVP ja apertado (beta set/2026)
- Risco tecnico (engenharia reversa) nao combina com prazo critico
- Validar primeiro se YouTube sozinho gera demanda
