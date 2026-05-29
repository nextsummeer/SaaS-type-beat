// Config das perguntas do onboarding.
// Trocar pergunta = mexer SO neste arquivo. O wizard nao tem nada chumbado.
// Pra adicionar/remover etapa: editar o array `questions` -- a barra de
// progresso, navegacao e validacao se ajustam automaticamente.

export type QuestionType = 'single' | 'multi'

export type QuestionOption = {
  id: string
  label: string
  hint?: string
  /** Metadata usada por calculos da tela final (ex: beats por dia). */
  meta?: {
    perDay?: number
  }
}

export type Question = {
  id: string
  /** Eyebrow editorial mostrado acima do titulo (ex: "CAPITULO 01 - ORIGEM"). */
  eyebrow: string
  title: string
  subtitle?: string
  type: QuestionType
  /** Numero de colunas no grid de opcoes (1, 2 ou 3). Default: 2. */
  columns?: 1 | 2 | 3
  options: QuestionOption[]
}

export const questions: Question[] = [
  {
    id: 'origem',
    eyebrow: 'CAPITULO 01 — ORIGEM',
    title: 'Como você nos conheceu?',
    subtitle: 'Pra gente saber por onde está chegando.',
    type: 'single',
    columns: 3,
    options: [
      { id: 'instagram', label: 'Instagram' },
      { id: 'youtube', label: 'YouTube' },
      { id: 'tiktok', label: 'TikTok' },
      { id: 'indicacao', label: 'Indicação de amigo' },
      { id: 'discord', label: 'Discord / comunidade' },
      { id: 'outro', label: 'Outro lugar' },
    ],
  },
  {
    id: 'genero',
    eyebrow: 'CAPITULO 02 — ESTILO',
    title: 'Qual gênero você produz?',
    subtitle: 'O que mais sai do seu estúdio.',
    type: 'single',
    columns: 3,
    options: [
      { id: 'trap-melodico', label: 'Trap melódico', hint: 'Drake, Weeknd, Future melódico' },
      { id: 'rage', label: 'Rage', hint: 'Yeat, Carti, Ken Carson' },
      { id: 'drill', label: 'Drill', hint: 'NY, UK, drill melódico' },
      { id: 'plugg', label: 'Plugg / Pluggnb', hint: 'Summrs, Autumn, Kankan' },
      { id: 'trap-pesado', label: 'Trap pesado', hint: '21 Savage, Future, Lil Baby' },
      { id: 'boom-bap', label: 'Boom Bap', hint: 'old school, lo-fi hip-hop' },
      { id: 'rnb', label: 'R&B', hint: 'soul, alternative, sad boy' },
      { id: 'hyperpop', label: 'Hyperpop', hint: 'experimental, fragmentado' },
      { id: 'outro', label: 'Outro gênero' },
    ],
  },
  {
    id: 'loja',
    eyebrow: 'CAPITULO 03 — LOJA',
    title: 'Onde você vende seus beats hoje?',
    subtitle: 'Pra gente saber pra onde mandar o tráfego do YouTube depois.',
    type: 'single',
    columns: 2,
    options: [
      { id: 'beatstars', label: 'BeatStars' },
      { id: 'airbit', label: 'Airbit' },
      { id: 'traktrain', label: 'Traktrain' },
      { id: 'direto', label: 'Direto', hint: 'Instagram, WhatsApp, e-mail' },
      { id: 'nao-vendo', label: 'Ainda não vendo' },
      { id: 'outra', label: 'Outra plataforma' },
    ],
  },
  {
    id: 'objetivos',
    eyebrow: 'CAPITULO 04 — OBJETIVOS',
    title: 'O que você quer conquistar?',
    subtitle: 'Pode marcar quantas quiser.',
    type: 'multi',
    columns: 2,
    options: [
      { id: 'vender', label: 'Vender mais beats' },
      { id: 'crescer-yt', label: 'Crescer meu canal no YouTube' },
      { id: 'tempo', label: 'Economizar tempo no upload' },
      { id: 'constancia', label: 'Postar com mais constância' },
      { id: 'capas', label: 'Ter capas/thumbnails que destacam' },
      { id: 'organizar', label: 'Organizar meus lançamentos' },
    ],
  },
  {
    id: 'frequencia',
    eyebrow: 'CAPITULO 05 — RITMO',
    title: 'Quantos beats você posta por dia?',
    subtitle: 'Em qualquer canal — YouTube, BeatStars, qualquer um.',
    type: 'single',
    columns: 2,
    options: [
      { id: 'zero',     label: 'Ainda não posto',     hint: 'comecei agora ou parei',  meta: { perDay: 0 } },
      { id: 'um',       label: '1 por dia',           hint: 'ritmo de iniciante',      meta: { perDay: 1 } },
      { id: 'doistres', label: '2 a 3 por dia',       hint: 'ritmo de quem joga sério', meta: { perDay: 2.5 } },
      { id: 'quatro',   label: '4 ou mais por dia',   hint: 'modo máquina',            meta: { perDay: 4 } },
    ],
  },
]
