# Testes

## Regras

- Nunca quebrar testes existentes — todos devem passar antes de commitar
- Novas features devem vir com testes (unit + integration)
- Preferir rodar teste especifico durante desenvolvimento, suite completa antes de fechar
- Testes lentos (API real, integracao com Gemini/YouTube) tem marker `@slow` pra rodar separado

## Comandos

### Backend (api/)

```bash
cd api

# Suite completa
pytest tests/ -v

# Teste especifico
pytest tests/workers/test_convert.py -v

# So testes rapidos (sem API real)
pytest tests/ -v -m "not slow"

# So testes lentos (com API real, custa $)
pytest tests/ -v -m "slow"

# Coverage
pytest tests/ --cov=app --cov-report=html
```

### Frontend (web/)

```bash
cd web

# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# E2E (Playwright)
pnpm test:e2e

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Estrategia por camada

| Camada | Tipo de teste | Onde |
|---|---|---|
| Workers (convert, analyze, generate, publish) | Integration com mocks | `api/tests/workers/` |
| Services (gemini, anthropic, youtube) | Unit + integration `@slow` | `api/tests/services/` |
| Routes FastAPI | Integration com TestClient | `api/tests/routes/` |
| Componentes React | Unit (Vitest) | `web/components/__tests__/` |
| Fluxos E2E | Playwright | `web/e2e/` |
| RLS Supabase | SQL tests | `supabase/tests/` |

## Gates de qualidade

Antes de commitar:
- [ ] `pytest tests/ -m "not slow"` passa
- [ ] `pnpm test` passa
- [ ] `pnpm typecheck` passa
- [ ] `pnpm lint` passa

Antes de cada Fase fechar:
- [ ] E2E especifico do criterio de pronto da Fase passa
- [ ] Testes `@slow` da camada tocada passam (se houver)
