# Sessão 2026-05-13 — Redesign Visual Interface Pós-Login (T6.14-T6.18)

**Data:** 2026-05-13
**Tasks cobertas:** T6.14, T6.15, T6.16, T6.17, T6.18
**Status:** todas concluídas e em produção (Vercel)
**Commit:** acd4a6d

---

## Contexto

Gustavo identificou que a interface pós-login estava visualmente ruim e com espaço desperdiçado. As páginas de auth (login/signup) estavam boas e não foram tocadas. O foco foi exclusivamente na área pós-login.

## Problemas identificados pelo Gustavo

### 1. Espaço desperdiçado (todas as páginas)
Conteúdo espremido numa coluna estreita (~430px) colada à esquerda. O restante da tela (>50%) ficava vazio em preto. Causa: ausência de `max-width` + centralização no layout.

### 2. Dashboard ausente na sidebar
Rota `/dashboard` existia mas não aparecia no menu lateral. Sidebar tinha só: Upload, Beats, Configurações, Sair.

### 3. Página Beats sem escalabilidade
Com muitos beats, a grade cresceria infinitamente. Sem opção de visualização compacta.

### 4. Tipografia sem hierarquia
Fonte Geist aplicada sem hierarquia de pesos/tamanhos. Tudo parecia ter o mesmo peso visual.

### 5. Sidebar crua
Sem grupos, sem ícones, sem personalidade visual.

## Referências visuais coletadas

- **Layout e estética geral:** Vaulto Dashboard — dark premium, sidebar com grupos de categoria, cards com profundidade (fundo levemente mais claro que o bg), accent color forte
- **Tipografia:** huly.io — Inter, mix de pesos, letter-spacing generoso nos títulos, labels uppercase muted
- **Toggle lista:** referência de tabela compacta com thumbnail pequena, status badge, ações inline

## O que foi implementado

### T6.14 — Fundação visual
- Fonte trocada de **Geist → Inter** (`next/font/google`)
- 8 novos tokens CSS em `globals.css`:
  - `--bg-base` (#0c0c0e), `--bg-surface` (#131316), `--bg-elevated` (#1c1c21)
  - `--border` (#27272f), `--border-muted` (#1e1e24)
  - `--text-primary` (#f4f4f5), `--text-muted` (#71717a), `--text-subtle` (#52525b)
  - `--accent` (#7c3aed), `--accent-hover` (#6d28d9), `--accent-muted` (rgba 15%)
- Metadata do site atualizada para "BeatPost"

### T6.15 — Novo layout + sidebar
- Sidebar redesenhada: grupos "GERAL" (Dashboard, Novo beat, Meus beats) e "CONTA" (Configurações)
- Ícones em todos os itens (lucide-react: LayoutDashboard, Upload, Music, Settings, LogOut)
- Item ativo: fundo `--bg-elevated` + ícone em `--accent` — mais sutil que o violeta flat anterior
- Logo com ícone Zap no topo
- Layout principal: `flex-1 overflow-y-auto` com `max-w-5xl mx-auto px-8 py-8` — centraliza e elimina espaço vazio

### T6.16 — Página Beats: toggle grade/lista
- Botão toggle (LayoutGrid / List) no header da página
- **Modo grade:** cards com `--bg-surface`, `--border`, `border-radius --radius-md`
- **Modo lista:** novo componente `BeatListRow` — linha horizontal com thumbnail 48x48, título, artista/BPM/tom, badge de status, data, botões "Abrir" e deletar
- Preferência salva em `localStorage` — persiste entre sessões
- Helpers `estadoVisual`, `destino`, `formataData`, `useCoverUrl` extraídos do BeatCard para reuso no BeatListRow

### T6.17 — Upload centralizado
- Formulário dentro de card `--bg-surface border --border rounded-xl p-8`
- `max-w-2xl mx-auto` — sem espaço vazio ao redor

### T6.18 — Config + Dashboard
- **Configurações:** seções em cards separados, labels uppercase tracking-widest estilo Vaulto, inputs com tokens CSS, `mx-auto`
- **Dashboard:** header de boas-vindas, 3 cards de métricas placeholder (beats publicados, views totais, agendados) com badge "Em breve" — prepara estrutura para Fase 2, CTA "Novo beat" em destaque

## O que ficou pendente

### Review page (`/beats/[id]/review`)
Layout em dois painéis (campos de edição esquerda + agendamento/ações direita) foi planejado mas não executado — ficou para a próxima sessão.

### Redesign completo com cores Vaulto
Gustavo não gostou totalmente do resultado visual — quer cores mais próximas da referência Vaulto (accent laranja/vermelho, gradientes no fundo, mais profundidade nos cards). Será feito na próxima sessão com a skill `/frontend-design`.

## Skill instalada

```bash
npx skills add https://github.com/anthropics/skills --skill frontend-design
```

Instalada em `.agents/skills/frontend-design` + symlink para Claude Code. Disponível a partir da **próxima sessão** (skills carregam na inicialização).

## Próxima sessão

1. Usar `/frontend-design` para redesign completo com referência Vaulto
2. Cores: accent mais forte (laranja ou vermelho), fundo com gradiente sutil, cards com mais profundidade
3. Review page: layout dois painéis
4. Aplicar tipografia hierárquica Inter corretamente
