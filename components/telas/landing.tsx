'use client'

import { Thermometer, Mic, FileText, Calculator, Zap, Shield, ArrowRight, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LandingProps {
  onEntrar: () => void
}

export function Landing({ onEntrar }: LandingProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">

      {/* Hero */}
      <header className="relative flex flex-col items-center justify-center px-6 pt-16 pb-12 text-center overflow-hidden">
        {/* Fundo decorativo */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-20 left-1/4 w-40 h-40 rounded-full bg-primary/8 blur-2xl" />
          <div className="absolute top-32 right-1/4 w-28 h-28 rounded-full bg-sale/10 blur-2xl" />
          {/* Grade pontilhada */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="currentColor" className="text-foreground" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Badge */}
        <div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
          <Zap size={11} />
          7 dias grátis · depois R$ 9,99/mês
        </div>

        {/* Logo / ícone */}
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-primary to-sale/70 flex items-center justify-center shadow-2xl shadow-primary/30 mb-6">
          <Thermometer size={38} className="text-primary-foreground" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-profit flex items-center justify-center">
            <Zap size={12} className="text-white" />
          </div>
        </div>

        <h1 className="relative text-4xl sm:text-5xl font-black tracking-tight text-balance leading-[1.1] mb-3">
          <span className="text-foreground">OrçaFacil</span>
          <span className="text-primary">-Frio</span>
        </h1>
        <p className="relative text-base sm:text-lg text-muted-foreground text-balance max-w-sm leading-relaxed mb-8">
          Gere orçamentos profissionais de refrigeração por voz. O sistema calcula materiais, bitolas e disjuntores automaticamente.
        </p>

        <Button
          onClick={onEntrar}
          size="lg"
          className="relative gap-2 px-8 py-6 text-base font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
        >
          Acessar Sistema
          <ArrowRight size={18} />
        </Button>
        <p className="relative text-xs text-muted-foreground mt-3">
          7 dias grátis — sem cartão · depois R$ 9,99/mês
        </p>
      </header>

      {/* Features */}
      <section className="px-4 pb-8">
        <div className="max-w-lg mx-auto grid grid-cols-1 gap-3">
          {[
            {
              icon: Mic,
              cor: 'text-primary bg-primary/10 border-primary/20',
              titulo: 'Fale e gere',
              desc: 'Descreva a instalação por voz. O sistema interpreta e monta o orçamento completo.',
            },
            {
              icon: Calculator,
              cor: 'text-profit bg-profit/10 border-profit/20',
              titulo: 'Cálculo automático',
              desc: 'Bitola de fio, disjuntor, tubulação e carga de gás calculados pelas normas ABNT.',
            },
            {
              icon: FileText,
              cor: 'text-cost bg-cost/10 border-cost/20',
              titulo: 'Versão cliente e interna',
              desc: 'PDF do cliente mostra só o preço de venda. A versão interna exibe custo, margem e lucro.',
            },
            {
              icon: Shield,
              cor: 'text-sale bg-sale/10 border-sale/20',
              titulo: 'Seus dados protegidos',
              desc: 'Suas informações ficam seguras e sob seu controle o tempo todo.',
            },
          ].map(({ icon: Icon, cor, titulo, desc }) => (
            <div key={titulo} className={`flex items-start gap-4 p-4 rounded-2xl border bg-card`}>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${cor}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold">{titulo}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Marcas suportadas */}
      <section className="px-4 pb-8">
        <div className="max-w-lg mx-auto">
          <p className="text-xs text-center text-muted-foreground mb-3 uppercase tracking-wider">
            Tabelas de bitolas incluídas para
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Samsung','LG','Midea','Elgin','Springer','Electrolux','Hitachi','Carrier','Fujitsu','Gree','Komeco','York','Consul','Brastemp'].map(m => (
              <span key={m} className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border text-muted-foreground font-medium">
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Status bar */}
      <div className="mt-auto px-4 pb-8">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Wifi size={12} />
          <span>Pronto para usar — sem instalação, direto no navegador</span>
        </div>
      </div>

    </div>
  )
}
