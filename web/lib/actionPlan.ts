/**
 * Plano de acao do produtor -- camada de dados.
 *
 * O plano e RAMIFICADO baseado nas respostas do onboarding (questions.ts).
 * Cada tarefa do master list tem uma funcao `shouldInclude` que decide se ela
 * aparece pra esse produtor especifico. Algumas tarefas tambem tem
 * `isPriorityFor` que promove sua prioridade quando o objetivo do produtor
 * casa com o tema da tarefa.
 *
 * T8.4 entrega so a estrutura -- cada tarefa tem titulo + descricao curta.
 * T8.6+ vai adicionar conteudo educacional embutido (texto/video/checklist)
 * dentro de cada tarefa.
 */

export type Category =
  | 'canal'
  | 'loja'
  | 'branding'
  | 'beats'
  | 'vendas'
  | 'networking'

export type TaskPriority = 'foundation' | 'core' | 'growth'

export type TaskEffort = 'XS' | 'S' | 'M' | 'L'

export type ActionTask = {
  id: string
  title: string
  description: string
  category: Category
  priority: TaskPriority
  effort: TaskEffort
}

export type Answers = Record<string, string[]>

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'canal', label: 'Canal' },
  { id: 'branding', label: 'Branding' },
  { id: 'loja', label: 'Loja' },
  { id: 'vendas', label: 'Vendas' },
  { id: 'beats', label: 'Beats' },
  { id: 'networking', label: 'Networking' },
]

const CATEGORY_LABELS: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
) as Record<Category, string>

export function categoryLabel(c: Category): string {
  return CATEGORY_LABELS[c]
}

/* ───────────────────────── master tasks ───────────────────────── */

type MasterTask = ActionTask & {
  shouldInclude: (a: Answers) => boolean
  isPriorityFor?: (a: Answers) => boolean
}

/** Helper: testa se uma resposta inclui algum dos valores. */
const has = (a: Answers, key: string, ...values: string[]) =>
  values.some((v) => (a[key] ?? []).includes(v))

const MASTER_TASKS: MasterTask[] = [
  // ─── CANAL ────────────────────────────────────────────
  {
    id: 'criar-canal',
    title: 'Crie seu canal do YouTube',
    description:
      'Nome consistente com seu @ de produtor, foto, descricao com tag + link de venda. Base de tudo.',
    category: 'canal',
    priority: 'foundation',
    effort: 'S',
    shouldInclude: (a) => has(a, 'frequencia', 'zero'),
  },
  {
    id: 'tag-produtor-audio',
    title: 'Grave sua tag de produtor no audio',
    description:
      'Tag no inicio e final do beat. Impede que artistas removam o credito quando baixarem do YouTube.',
    category: 'canal',
    priority: 'foundation',
    effort: 'XS',
    shouldInclude: () => true,
  },
  {
    id: 'placar-certo',
    title: 'Aprenda a ler o placar certo',
    description:
      'CTR, retencao e sessao sao os indicadores que precedem venda. Mes 1 e 2 voce comemora ESSES — venda vem em sequencia.',
    category: 'canal',
    priority: 'foundation',
    effort: 'XS',
    shouldInclude: () => true,
  },
  {
    id: 'link-venda-descricao',
    title: 'Configure seu link de venda na descricao',
    description:
      'CTA clara em todo video. Link curto, primeiro link da descricao, sem distrair.',
    category: 'canal',
    priority: 'core',
    effort: 'XS',
    shouldInclude: (a) => !has(a, 'loja', 'nao-vendo'),
  },
  {
    id: 'constancia-upload',
    title: 'Estabeleca constancia de upload',
    description:
      'Algoritmo premia consistencia. 2-3 videos por semana minimo, horario fixo no calendario.',
    category: 'canal',
    priority: 'core',
    effort: 'M',
    shouldInclude: (a) => !has(a, 'frequencia', 'doistres', 'quatro'),
  },
  {
    id: 'seo-youtube',
    title: 'Otimize SEO dos seus videos',
    description:
      'Titulo com keyword forte + descricao com link + 15+ tags relevantes do nicho. Vital pra crescer.',
    category: 'canal',
    priority: 'core',
    effort: 'M',
    shouldInclude: () => true,
    isPriorityFor: (a) => has(a, 'objetivos', 'crescer-yt'),
  },

  // ─── LOJA ─────────────────────────────────────────────
  {
    id: 'escolher-loja',
    title: 'Escolha sua loja de beats',
    description:
      'BeatStars, Airbit ou Traktrain. Cada uma com seus tradeoffs (comissao, alcance, ferramentas). Escolha uma e foque.',
    category: 'loja',
    priority: 'foundation',
    effort: 'M',
    shouldInclude: (a) => has(a, 'loja', 'nao-vendo'),
  },
  {
    id: 'configurar-loja-visual',
    title: 'Configure visualmente sua loja',
    description:
      'Banner, logo, descricao do perfil, paleta de cores. Vitrine importa tanto quanto produto.',
    category: 'loja',
    priority: 'core',
    effort: 'M',
    shouldInclude: () => true,
    isPriorityFor: (a) => has(a, 'objetivos', 'capas'),
  },
  {
    id: 'precos-licencas',
    title: 'Defina preco dos beats e tiers de licenca',
    description:
      'Estrutura de tiers (basic, premium, exclusive). Quanto vale cada licenca e por que.',
    category: 'loja',
    priority: 'core',
    effort: 'M',
    shouldInclude: () => true,
    isPriorityFor: (a) => has(a, 'objetivos', 'vender'),
  },

  // ─── BRANDING ─────────────────────────────────────────
  {
    id: 'definir-nicho',
    title: 'Cravar seu nicho de type beat',
    description:
      '2-3 artistas referencia principais. Algoritmo aprende mais rapido, audiencia te identifica.',
    category: 'branding',
    priority: 'foundation',
    effort: 'S',
    shouldInclude: (a) => has(a, 'frequencia', 'zero', 'um'),
  },
  {
    id: 'branding-canal',
    title: 'Construa o branding visual do canal',
    description:
      'Banner, foto perfil, intro/outro, paleta. Canal sem branding parece amador — espanta cliente bom.',
    category: 'branding',
    priority: 'core',
    effort: 'L',
    shouldInclude: () => true,
    isPriorityFor: (a) => has(a, 'objetivos', 'capas', 'crescer-yt'),
  },

  // ─── BEATS ────────────────────────────────────────────
  {
    id: 'samples-novos',
    title: 'Renove sua biblioteca de samples',
    description:
      'Samples novos = som novo. Investir em packs bons ou achar samples livres de royalty.',
    category: 'beats',
    priority: 'growth',
    effort: 'M',
    shouldInclude: () => true,
  },

  // ─── VENDAS ───────────────────────────────────────────
  {
    id: 'templates-resposta',
    title: 'Templates de resposta pra clientes',
    description:
      'Mensagens prontas pras perguntas comuns (preco, licenca, exclusividade). Resposta em <2h dispara conversao.',
    category: 'vendas',
    priority: 'core',
    effort: 'S',
    shouldInclude: (a) =>
      has(a, 'objetivos', 'vender') || !has(a, 'loja', 'nao-vendo'),
  },
  {
    id: 'cliente-1-1',
    title: 'Como conversar com cliente 1:1',
    description:
      'DM, e-mail, follow-up. Sutil = venda; insistente = spam. Tom certo importa mais que voce imagina.',
    category: 'vendas',
    priority: 'growth',
    effort: 'M',
    shouldInclude: (a) => has(a, 'objetivos', 'vender'),
  },

  // ─── NETWORKING ───────────────────────────────────────
  {
    id: 'network-artistas',
    title: 'Networking com artistas do seu nicho',
    description:
      'Manda beat free pra artistas 1k-10k ouvintes mensais. Cresce organico via colab — mais barato que ad.',
    category: 'networking',
    priority: 'growth',
    effort: 'L',
    shouldInclude: () => true,
  },
]

/* ───────────────────────── builder ───────────────────────── */

const PRIORITY_ORDER: TaskPriority[] = ['foundation', 'core', 'growth']

/**
 * Monta o plano personalizado pro produtor baseado nas respostas do onboarding.
 *
 * Logica:
 *   1. Filtra tarefas via `shouldInclude(answers)`
 *   2. Promove prioridade de 'core' -> 'foundation' se o objetivo do produtor
 *      faz aquela tarefa especialmente relevante (`isPriorityFor`)
 *   3. Ordena por foundation -> core -> growth
 */
export function buildActionPlan(answers: Answers): ActionTask[] {
  return MASTER_TASKS.filter((t) => t.shouldInclude(answers))
    .map((t) => {
      const promoted =
        t.isPriorityFor?.(answers) && t.priority === 'core'
          ? 'foundation'
          : t.priority
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        priority: promoted,
        effort: t.effort,
      }
    })
    .sort((a, b) => {
      const aIdx = PRIORITY_ORDER.indexOf(a.priority)
      const bIdx = PRIORITY_ORDER.indexOf(b.priority)
      return aIdx - bIdx
    })
}
