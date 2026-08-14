'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Thermometer, Mic, FileText, Calculator, Zap, Shield, ArrowRight, Wifi } from 'lucide-react'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const isLogin = mode === 'sign-in'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      if (isLogin) {
        const res = await authClient.signIn.email({ email, password: senha })
        if (res.error) { setErro(res.error.message ?? 'Erro ao entrar'); return }
      } else {
        const res = await authClient.signUp.email({ email, password: senha, name: nome })
        if (res.error) { setErro(res.error.message ?? 'Erro ao criar conta'); return }
      }
      router.push('/')
      router.refresh()
    } catch {
      setErro('Erro inesperado. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  function scrollParaForm() {
    document.getElementById('form-acesso')?.scrollIntoView({ behavior: 'smooth' })
  }

  // Posts do Instagram exibidos na tela inicial (marketing)
  const videos = [
    { id: 'DbsXWOntq8T', titulo: 'Como criar um orçamento em 1 minuto' },
    { id: 'DbsXKWlNtid', titulo: 'IA montando orçamento completo' },
    { id: 'Dbtfr1hPKm0', titulo: 'Geração de PDF com sua marca' },
  ]

  const features = [
    {
      icon: Mic,
      cor: 'text-primary bg-primary/10 border-primary/20',
      titulo: 'Fale e gere',
      desc: 'Descreva a instalação por voz. A IA interpreta e monta o orçamento completo.',
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
      titulo: 'Dados seguros na nuvem',
      desc: 'Orçamentos salvos no banco de dados. Acesse de qualquer dispositivo a qualquer hora.',
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">

      {/* ── HERO ────────────────────────────────────────────── */}
      <header className="relative flex flex-col items-center justify-center px-6 pt-16 pb-12 text-center overflow-hidden">
        {/* Fundo decorativo */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-20 left-1/4 w-40 h-40 rounded-full bg-primary/8 blur-2xl" />
          <div className="absolute top-32 right-1/4 w-28 h-28 rounded-full bg-sale/10 blur-2xl" />
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
          IA — 1 dia grátis. Planos a partir de R$ 15/mês
        </div>

        {/* Icone */}
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
          Gere orçamentos profissionais de refrigeração por voz. A IA calcula materiais, bitolas e disjuntores automaticamente.
        </p>

        <Button
          onClick={scrollParaForm}
          size="lg"
          className="relative gap-2 px-8 py-6 text-base font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
        >
          Acessar Sistema
          <ArrowRight size={18} />
        </Button>
        <p className="relative text-xs text-muted-foreground mt-3">
          1 dia grátis — sem cartão
        </p>
      </header>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section className="px-4 pb-8">
        <div className="max-w-lg mx-auto grid grid-cols-1 gap-3">
          {features.map(({ icon: Icon, cor, titulo, desc }) => (
            <div key={titulo} className="flex items-start gap-4 p-4 rounded-2xl border bg-card">
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

      {/* ── MARCAS ──────────────────────────────────────────── */}
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

      {/* ── VIDEOS ──────────────────────────────────────────── */}
      <section className="px-4 pb-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Veja como funciona</span>
            <div className="flex-1 border-t border-border" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videos.map((v, i) => (
              <div key={i} className="space-y-2">
                <div className="relative w-full overflow-hidden rounded-xl bg-muted aspect-[9/16]">
                  <iframe
                    src={`https://www.instagram.com/p/${v.id}/embed`}
                    title={v.titulo}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    scrolling="no"
                    className="absolute inset-0 w-full h-full border-0"
                  />
                </div>
                <p className="text-sm font-medium text-foreground">{v.titulo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORMULÁRIO ──────────────────────────────────────── */}
      <section id="form-acesso" className="px-4 pb-16">
        <div className="max-w-sm mx-auto space-y-6">

          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">
              {isLogin ? 'Bem-vindo de volta' : 'Criar conta grátis'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin
                ? 'Entre com seu e-mail e senha'
                : '1 dia grátis para testar. Depois a partir de R$ 15/mês.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Seu nome</label>
                <Input
                  placeholder="João Silva"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">E-mail</label>
              <Input
                type="email"
                placeholder="joao@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Senha</label>
              <Input
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                minLength={8}
                className="h-11"
              />
            </div>

            {erro && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                {erro}
              </p>
            )}

            <Button type="submit" className="w-full h-11 font-semibold" disabled={carregando}>
              {carregando
                ? <><Loader2 size={14} className="animate-spin mr-2" />Aguarde...</>
                : isLogin ? 'Entrar' : 'Começar grátis'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <a
              href={isLogin ? '/cadastro' : '/entrar'}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? 'Criar conta' : 'Entrar'}
            </a>
          </p>
        </div>
      </section>

      {/* ── RODAPÉ ──────────────────────────────────────────── */}
      <footer className="mt-auto px-4 pb-8">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Wifi size={12} />
          <span>IA rodando no servidor — disponível para todos os técnicos</span>
        </div>
      </footer>

    </div>
  )
}
