'use client'

import { useEffect, useState } from 'react'
import { verificarAcesso, criarCheckoutLicenca } from '@/lib/actions/licenca'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, Loader2, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

type InfoAcesso = Awaited<ReturnType<typeof verificarAcesso>>

export function BannerLicenca() {
  const [info, setInfo] = useState<InfoAcesso | null>(null)
  const [comprando, setComprando] = useState(false)

  useEffect(() => {
    verificarAcesso().then(setInfo).catch(() => {})
  }, [])

  async function handleComprar() {
    setComprando(true)
    try {
      const { url } = await criarCheckoutLicenca('mensal')
      if (window.self !== window.top) window.open(url, '_blank')
      else window.location.href = url
    } finally {
      setComprando(false)
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
            ? `Você atingiu o limite de ${info.limiteMes} orçamentos deste mês. Ele renova no mês que vem.`
            : `Faltam ${restantes} orçamentos do seu limite mensal (${info.usoMes}/${info.limiteMes}).`}
        </span>
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
            ? 'Seu teste grátis de 7 dias encerrou. Assine para continuar usando.'
            : `Teste grátis: ${info.diasRestantes} dia${info.diasRestantes === 1 ? '' : 's'} restante${info.diasRestantes === 1 ? '' : 's'} · ${info.usoMes}/${info.limiteMes} orçamentos.`}
        </span>
      </div>
      <div className="flex items-center shrink-0">
        <Button size="sm" onClick={handleComprar} disabled={comprando}
          className="h-7 px-3 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
          {comprando ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />} Assinar por R$ 9,99/mês
        </Button>
      </div>
    </div>
  )
}
