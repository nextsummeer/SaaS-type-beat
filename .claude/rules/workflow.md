# Workflow de Desenvolvimento

```
1. DISCUTIR   → Brainstorming, entender problema, sem codigo
2. TASK       → Identificar entrada no _tasks-mvp.md
3. PLANEJAR   → Modo planejamento, definir abordagem (/pique:executar)
4. EXECUTAR   → Codigo + testes juntos
5. FECHAR     → Atualizar _tasks-mvp.md + commitar (tudo junto)
```

**REGRA: Sem task no `_tasks-mvp.md` = sem codigo.**

## Detalhamento

### 1. DISCUTIR
- Entender o problema antes de codar
- Se precisar investigar, abrir sessao em `docs/sessoes/`
- Se gerar decisao tecnica, registrar em `docs/decisoes/`

### 2. TASK
- Toda unidade de trabalho tem entrada no `_tasks-mvp.md`
- Cada task tem ID `T<fase>.<num>`, criterio de pronto e arquivos previstos
- Dependencias listadas explicitamente

### 3. PLANEJAR
- Rodar `/pique:executar` — ele abre `_tasks-mvp.md`, identifica proxima, entra em plan mode
- Listar arquivos que serao modificados
- Verificar se ha docs relevantes em `docs/_mapa.md`

### 4. EXECUTAR
- Codigo e testes caminham juntos
- Rodar testes relevantes durante o desenvolvimento
- Nao quebrar testes existentes

### 5. FECHAR
Ao concluir uma task:
1. Marcar checkbox `[x]` no `_tasks-mvp.md`
2. Atualizar `Proximo passo:` no topo
3. Adicionar linha em `## Historico de chats` (data + task + resumo)
4. Commitar `_tasks-mvp.md` junto com o codigo na mesma entrega

## Padrao de Commit

```
tipo: descricao curta (imperativo, portugues)

- detalhe 1
- detalhe 2

T<fase>.<num>: <task>
```

Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
Mensagens em portugues. Um commit por entrega logica.

## Quando criar documentacao

- **Decisao tecnica tomada?** → `docs/decisoes/YYYY-MM-DD-nome.md`
- **Investigou algo complexo?** → `docs/sessoes/YYYY-MM-DD-tema.md`
- **Arquitetura mudou?** → Atualizar doc em `docs/arquitetura/`
- **Referencia nova de API/lib?** → `docs/referencias/nome.md`
- Sempre atualizar `docs/_mapa.md` ao criar/modificar docs
