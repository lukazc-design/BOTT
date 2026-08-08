'use client'

import { LayoutGrid, FilePlus2, History, Settings, LogOut, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth-client'

type Pagina = 'dashboard' | 'novo-orcamento' | 'historico' | 'perfil'

interface NavBottomProps {
  paginaAtiva: Pagina
  onNavegar: (p: Pagina) => void
  onAbrirIA?: () => void
}

// Abas laterais (o "Novo" fica em destaque no centro, fora desta lista)
const ESQUERDA = [
  { id: 'dashboard' as Pagina, label: 'Geral',     icon: LayoutGrid },
  { id: 'historico' as Pagina, label: 'Histórico', icon: History    },
]
const DIREITA = [
  { id: 'perfil' as Pagina, label: 'Perfil', icon: Settings },
]

export function NavBottom({ paginaAtiva, onNavegar, onAbrirIA }: NavBottomProps) {
  const router = useRouter()
  const [saindo, setSaindo] = useState(false)

  async function sair() {
    setSaindo(true)
    try { await signOut() } catch { /* segue para o login mesmo assim */ }
    router.replace('/entrar')
  }

  const TabBtn = ({ id, label, Icon }: { id: Pagina; label: string; Icon: typeof LayoutGrid }) => {
    const ativo = paginaAtiva === id
    return (
      <button
        onClick={() => onNavegar(id)}
        className={cn(
          'flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative',
          ativo ? 'text-primary' : 'text-muted-foreground'
        )}
        aria-label={label}
      >
        {ativo && <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full bg-primary" />}
        <Icon size={20} strokeWidth={ativo ? 2.5 : 1.8} />
        <span className="text-[10px] font-medium">{label}</span>
      </button>
    )
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {ESQUERDA.map(t => <TabBtn key={t.id} id={t.id} label={t.label} Icon={t.icon} />)}

        {/* NOVO + IA — botões em destaque, centralizados e elevados */}
        <div className="flex-1 flex justify-center items-center gap-2">
          <button
            onClick={() => onNavegar('novo-orcamento')}
            aria-label="Novo orçamento"
            className={cn(
              'relative -top-4 flex flex-col items-center justify-center gap-0.5',
              'w-16 h-16 rounded-full bg-primary text-primary-foreground',
              'shadow-lg shadow-primary/40 ring-4 ring-sidebar transition-transform active:scale-95',
              paginaAtiva === 'novo-orcamento' && 'ring-primary/30'
            )}
          >
            <FilePlus2 size={22} strokeWidth={2.4} />
            <span className="text-[9px] font-bold leading-none">Novo</span>
          </button>

          {/* IA — atalho direto para o chat da IA, azul mais escuro para se destacar */}
          <button
            onClick={() => (onAbrirIA ? onAbrirIA() : onNavegar('novo-orcamento'))}
            aria-label="Chat da IA"
            className={cn(
              'relative -top-4 flex flex-col items-center justify-center gap-0.5',
              'w-14 h-14 rounded-full bg-blue-800 text-white',
              'shadow-lg shadow-blue-900/40 ring-4 ring-sidebar transition-transform active:scale-95'
            )}
          >
            <Sparkles size={18} strokeWidth={2.4} />
            <span className="text-[9px] font-bold leading-none">IA</span>
          </button>
        </div>

        {DIREITA.map(t => <TabBtn key={t.id} id={t.id} label={t.label} Icon={t.icon} />)}

        {/* Sair — encerra a sessão e volta ao login */}
        <button
          onClick={sair}
          disabled={saindo}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50"
          aria-label="Sair"
        >
          <LogOut size={20} strokeWidth={1.8} />
          <span className="text-[10px] font-medium">{saindo ? '...' : 'Sair'}</span>
        </button>
      </div>
    </nav>
  )
}
