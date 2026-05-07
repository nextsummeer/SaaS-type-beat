# beatstars-upload (GitHub open source)

> Script Python pessoal de um dev individual. Nao e produto comercial.
> Repo: https://github.com/MyNameIsCarsten/beatstars-upload — analisado em 2026-05-06.

## O que e

Script Python local com GUI simples. Faz upload de beats no BeatStars e gera videos pra YouTube. Uso pessoal do autor, nao distribui como produto.

## Como funciona

1. Usuario abre `GUI.py` e digita o numero do beat
2. Script le o WAV correspondente (nome precisa seguir padrao rigido: `[N] Tonalidade BPM Beat-Name`)
3. Gera dois videos com Moviepy: versao completa + short
4. Abre Chrome via Selenium no BeatStars
5. **Usuario finaliza manualmente** (data de publicacao, confirmacao)

## Stack

- Python + Tkinter (GUI)
- Selenium (automacao Chrome)
- Moviepy + OpenCV (geracao de video)
- Excel (planilha manual de tags)

## Por que NAO e concorrente

| Dimensao | Este script | BEATPOST |
|---|---|---|
| Tipo | Script local pra uso proprio | SaaS comercial |
| Distribuicao | GitHub (so devs instalam) | Web acessivel a qualquer um |
| IA | Nenhuma | Gemini + Claude |
| SEO/copy | Planilha Excel manual | Geracao automatica |
| Suporte | Nenhum | Time + roadmap |

## Por que vale a leitura mesmo assim

1. **Confirma que dispender BeatStars sem API e viavel via Selenium** — comprova tecnicamente o caminho de browser automation.
2. **Padrao de extracao de BPM/key/nome do filename** e ideia interessante como fallback quando IA nao consegue analisar o audio.
3. **Mostra o quao basico e o estado da arte open source** — nada similar ao BEATPOST existe gratis.
