# shadcn/ui — Componentes copy-paste

**Versao alvo:** shadcn 2.x + Tailwind 3.4+
**Docs oficiais:** https://ui.shadcn.com
**Atualizado:** 2026-04-25

## Filosofia

shadcn/ui NAO e biblioteca npm. Voce roda CLI, ele copia o codigo do componente direto pro seu projeto. Voce tem controle total, edita livremente.

## Setup inicial (apos `pnpm create next-app`)

```bash
cd web
npx shadcn@latest init
```

Responder:
- TypeScript: yes
- Style: Default
- Base color: Slate (ou Zinc)
- CSS variables: yes
- React Server Components: yes

Cria:
- `components.json` (config)
- `lib/utils.ts` (cn helper)
- `tailwind.config.ts` (theme extendido)
- `app/globals.css` (CSS variables)
- `components/ui/` (vazio inicialmente)

## Adicionar componentes

```bash
npx shadcn@latest add button input label textarea
npx shadcn@latest add card dialog skeleton alert
npx shadcn@latest add form select toast progress
npx shadcn@latest add avatar dropdown-menu separator
```

## Componentes que vamos usar no MVP

| Componente | Onde |
|---|---|
| `Button` | em todo lugar |
| `Input` + `Label` | login, edit form |
| `Textarea` | descricao do beat |
| `Card` + `CardHeader` + `CardContent` | beat list, variacao A/B/C |
| `Dialog` | confirmacao de agendamento |
| `Form` (com react-hook-form + zod) | upload, edit |
| `Skeleton` | loading state |
| `Alert` | error state |
| `Progress` | upload progress |
| `Toast` (sonner) | feedback rapido |
| `DropdownMenu` | sidebar (sair) |
| `Avatar` | foto do user |

## Exemplo: form de upload

```tsx
// web/components/UploadForm.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function UploadForm() {
  const [progress, setProgress] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // ... upload via signed URL
    toast.success("Beat enviado!");
  }

  return (
    <Card>
      <CardHeader><CardTitle>Novo beat</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="audio">Audio</Label>
            <Input id="audio" type="file" accept="audio/*" required />
          </div>
          <div>
            <Label htmlFor="cover">Capa (jpg/png 1280x720)</Label>
            <Input id="cover" type="file" accept="image/jpeg,image/png" required />
          </div>
          {progress > 0 && <Progress value={progress} />}
          <Button type="submit">Enviar</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

## Theme do BeatPost

`app/globals.css` ja vem com CSS variables. Customizar pro BeatPost (V1: dark default):

```css
:root {
  --background: 240 10% 4%;     /* preto azulado */
  --foreground: 0 0% 98%;
  --primary: 24 100% 50%;       /* laranja BeatPost */
  --primary-foreground: 0 0% 100%;
  /* ... */
}
```

## Sonner (toast)

```bash
npx shadcn@latest add sonner
```

```tsx
// web/app/layout.tsx
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

## Gotchas

- **CLI atualizou recentemente:** use `npx shadcn@latest`, nao `npx shadcn-ui` (deprecated)
- **`components/ui/`** nao deve ser editado direto pro padrao mas voce PODE editar — e seu codigo
- **Dark mode:** shadcn vem com class strategy. `<html class="dark">` no layout pra forcar
- **Tailwind v4 ainda nao suportado** — manter Tailwind 3.4
- **React Server Components:** maioria dos componentes shadcn sao client (`"use client"`). Cuidado em Server Components — nao pode importar componente com hooks
- **Custom classes:** combinar shadcn com Tailwind extra usa `cn()` helper
- **CardContent padding:** padrao 6, as vezes incomoda. Override com `className="p-4"`
- **Form com react-hook-form + zod:** precisa instalar `react-hook-form @hookform/resolvers zod` separado
