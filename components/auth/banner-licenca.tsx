'use client'

import { useEffect, useState } from 'react'
import { verificarAcesso, criarCheckoutLicenca } from '@/lib/actions/licenca'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, Loader2, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

type InfoAcesso = Awaited<ReturnType<typeof verificarAcesso>>

export function BannerLicenca() {
  const [info, setInfo] = useState<InfoAcesso | null>(null)
  const [comprando, setComprando] = useState<'basico' | 'pro' | null>(null)

  useEffect(() => {
    verificarAcesso().then(setInfo).catch(() => {})
  }, [])

  async function handleComprar(plano: 'basico' | 'pro') {
    setComprando(plano)
    try {
      const { url } = await criarCheckoutLicenca(plano)
      if (window.self !== window.top) window.open(url, '_blank')
      else window.location.href = url
    } finally {
      setComprando(null)
    }
  }

  if (!info) return null

  // Assinante ativo: só mostra um aviso discreto quando estiver perto do limite
  if (info.status === 'active') {
    const restantes = info.limiteMes - info.usoMes
    if (restantes > 3) return null
    const estourou = restantes <= 0
    return (
      <div className={cn(
        'flex items-center justify-between gap-3 px-4 py-2 text-xs border-b flex-shrink-0',
        estourou ? 'bg-destructive/10 border-destructive/20 text-destructive'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
      )}>
        <span className="font-medium">
          {estourou
            ? `Você atingiu ${info.usoMes}/${info.limiteMes} orçamentos do mês (plano ${info.plano === 'pro' ? 'Pro' : 'Básico'}).`
            : `Faltam ${restantes} orçamentos do seu limite mensal (${info.usoMes}/${info.limiteMes}).`}
        </span>
        {estourou && info.plano !== 'pro' && (
          <Button size="sm" onClick={() => handleComprar('pro')} disabled={!!comprando}
            className="h-7 px-3 text-xs gap-1.5 shrink-0 bg-amber-500 hover:bg-amber-600 text-black">
            {comprando ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />} Upgrade Pro — R$ 30/mês · 100 orçamentos
          </Button>
        )}
      </div>
    )
  }

  const expirado = info.status === 'expired'

  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-2 text-xs border-b flex-shrink-0',
      expirado ? 'bg-destructive/10 border-destructive/20 text-destructive'
        : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
    )}>
      <div className="flex items-center gap-2">
        {expirado ? <AlertTriangle size={13} className="shrink-0" /> : <Clock size={13} className="shrink-0" />}
        <span className="font-medium">
          {expirado
            ? 'Seu teste grátis encerrou. Escolha um plano para continuar.'
            : `Teste grátis: ${info.diasRestantes} dia${info.diasRestantes === 1 ? '' : 's'} restante${info.diasRestantes === 1 ? '' : 's'} · ${info.usoMes}/${info.limiteMes} orçamentos.`}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" onClick={() => handleComprar('basico')} disabled={!!comprando}
          className="h-7 px-3 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
          {comprando === 'basico' ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />} R$ 15/mês <span className="opacity-70">· 30 orçamentos</span>
        </Button>
        <Button size="sm" onClick={() => handleComprar('pro')} disabled={!!comprando}
          className="h-7 px-3 text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-black">
          {comprando === 'pro' ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />} R$ 30/mês <span className="opacity-70">· 100 orçamentos</span>
        </Button>
      </div>
    </div>
  )
}
