# Cobranca na unha (Pix manual) ate o 10o pagante

**Data:** 2026-04-25
**Status:** aceita
**Tags:** decisao, billing, mvp, validacao

## Contexto

Sessao fundadora alertou (sec 11.4) que beatmaker brasileiro underground tem cultura de pirataria — quer tudo de graca, quebra ferramenta, troca conta. SaaS recorrente em dolar pra esse publico rema contra a mare. A pergunta: no MVP cobrar ou liberar gratuito?

Modelo: Nivel 2 do plano fundador — beta privado, 5-10 beatmakers convidados.

## Opcoes Consideradas

### 1. Cobranca na unha (Pix manual) ate o 10o pagante
- **Pros:** Voce conversa com cada pagante, aprende objecoes, calibra preco. Zero implementacao Stripe. Disposicao a pagar fica clara em dias, nao meses.
- **Contras:** Voce gasta tempo cobrando manualmente. Nao escala. Aceita tarjas de inflexivel.

### 2. Stripe desde o dia 1 (free trial 7 dias + $25/mes)
- **Pros:** Profissional. Receita recorrente automatizada.
- **Contras:** 1-2 semanas de implementacao (Stripe + webhooks + tier limits + recovery flow). MVP atrasa. Voce ainda nao sabe se beatmaker paga $25.

### 3. Free total (sem cobrar)
- **Pros:** Maximiza adoption. Aprende uso real.
- **Contras:** Voce so descobre disposicao a pagar quando ja gastou meses. Risco de virar "ferramenta gratuita" mental no nicho — dificil reverter pra paga depois.

## Decisao

**Veredito: Opcao 1 — Cobranca na unha ate 10o pagante.**

Apos os primeiros 5 beatmakers usando ativamente, cobrar Pix R$50/mes na unha (equivalente ~$10 no MVP, abaixo do alvo de $25 final). Quando 10 pagantes consecutivos toparam, ai sim implementar Stripe.

Razao: o 11.4 do brief e suficientemente alarmante pra precisar saber CEDO se beatmaker paga. Stripe atrasa esse aprendizado em 6-8 semanas. Pix manual responde em 5 minutos.

### Politica de gratuidade no beta privado

- **Convidados pessoalmente:** uso livre por 30 dias
- **Apos 30 dias:** Pix R$50/mes (mensagem direta no WhatsApp/Instagram)
- **Quem nao topar:** mantem conta ativa com limite (5 beats/mes free) — vira viral organico se gostar e indicar
- **Quem topar:** vira referencia + caso de uso pra captar os proximos

### Quando passar pra Stripe

Trigger: 10 pagantes consecutivos com >2 meses cada. Antes disso seria over-engineering.

## Consequencias

- Voce (Henrique) gasta ~30min/semana cobrando. Plano: Sextas as 17h, planilha simples.
- `_tasks-mvp.md` Fase 6 NAO inclui Stripe.
- Schema do Supabase ja deixa hook pra billing futuro (`api_usage` table existe desde dia 1)
- Pricing alvo $25/mes em produto comercial. Beta em R$50 e pra testar disposicao, nao ancora final
- Medir custo por usuario REAL via `api_usage` desde dia 1 — sem isso voce cobra cego
