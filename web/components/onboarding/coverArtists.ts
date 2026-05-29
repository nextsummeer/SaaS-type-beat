// Artistas curados validados pra geracao da 1a capa no onboarding.
// Lista pequena de proposito -- todos foram visualmente validados em prod
// pelo prompt v3 da capa IA (ver `docs/decisoes/2026-05-22-prompt-dna-capa-v3.md`).
// No app de verdade o produtor digita qualquer artista (com fallback gracioso).
// Aqui no onboarding a escolha e travada nestes 5 pra garantir bom resultado
// na primeira impressao -- onde o risco de "essa IA e lixo" e maior.

export type CoverArtist = {
  id: string
  name: string
  descriptor: string
  /** Paleta da mock cover (apenas pra placeholder visual, nao tem nada a ver com a paleta real do prompt). */
  palette: {
    /** Gradiente do background -- CSS string. */
    background: string
    /** Cor de texto do nome do artista sobre o cover. */
    foreground: string
    /** Cor de destaque (glow + ornamento). */
    accent: string
  }
}

export const coverArtists: CoverArtist[] = [
  {
    id: 'drake',
    name: 'Drake',
    descriptor: 'trap melódico · tons quentes',
    palette: {
      background:
        'radial-gradient(at 30% 20%, #5C3A1F 0%, transparent 55%), linear-gradient(140deg, #1A0E08 0%, #3A2418 100%)',
      foreground: '#F0D9B0',
      accent: '#C9963A',
    },
  },
  {
    id: 'travis',
    name: 'Travis Scott',
    descriptor: 'psicodélico · vermelho terra',
    palette: {
      background:
        'radial-gradient(at 70% 30%, #6B1818 0%, transparent 55%), linear-gradient(140deg, #1A0606 0%, #3A0E0E 100%)',
      foreground: '#FFD9D0',
      accent: '#FF4A4A',
    },
  },
  {
    id: 'weeknd',
    name: 'The Weeknd',
    descriptor: 'after-hours · neon noturno',
    palette: {
      background:
        'radial-gradient(at 30% 70%, #1A1A6B 0%, transparent 55%), linear-gradient(140deg, #06061A 0%, #0E0E3A 100%)',
      foreground: '#D0E0FF',
      accent: '#FF1ABE',
    },
  },
  {
    id: 'fakemink',
    name: 'Fakemink',
    descriptor: 'underground · granulado',
    palette: {
      background:
        'radial-gradient(at 50% 50%, #2A2A2A 0%, transparent 60%), linear-gradient(140deg, #060606 0%, #1A1A1A 100%)',
      foreground: '#E8E8E8',
      accent: '#FFFFFF',
    },
  },
  {
    id: 'nettspend',
    name: 'Nettspend',
    descriptor: 'rage · glitch elétrico',
    palette: {
      background:
        'radial-gradient(at 70% 80%, #4100FF 0%, transparent 55%), linear-gradient(140deg, #0A0518 0%, #2A0A4A 100%)',
      foreground: '#E0D0FF',
      accent: '#FF1ABE',
    },
  },
]
