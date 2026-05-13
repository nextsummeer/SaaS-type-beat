'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const itens = [
  { href: '/upload', label: 'Upload' },
  { href: '/beats', label: 'Beats' },
  { href: '/configuracoes', label: 'Configurações' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSair() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="flex w-60 flex-col border-r border-zinc-800 bg-zinc-950 px-4 py-6">
      <div className="mb-6 px-2">
        <span className="text-lg font-bold text-white">BeatPost</span>
      </div>

      <nav className="flex flex-col gap-1">
        {itens.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              pathname.startsWith(item.href)
                ? 'bg-violet-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        ))}

        <div className="my-2 border-t border-zinc-800" />

        <Link
          href="#"
          onClick={async (e) => { e.preventDefault(); await handleSair() }}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
        >
          Sair
        </Link>
      </nav>
    </aside>
  )
}
