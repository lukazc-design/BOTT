'use client'

import { useState } from 'react'
import {
  Megaphone, Copy, Check, Layers, ListChecks, Share2, Sparkles,
  Target, Clock, Hash, Camera, Film, MessageSquare, Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────
// Kit de lançamento no Instagram para o OrçaFacil-Frio.
// Conteúdo pronto para copiar: carrossel, tutorial e 10 posts.
// ─────────────────────────────────────────────────────────────────────────

// Botão que copia um texto e mostra confirmação por 2s
function BotaoCopiar({ texto, rotulo = 'Copiar' }: { texto: string; rotulo?: string }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* clipboard indisponível */ }
  }
  return (
    <button
      onClick={copiar}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
        copiado
          ? 'bg-profit/15 text-profit'
          : 'bg-accent text-muted-foreground hover:bg-accent/70 hover:text-foreground'
      )}
      aria-label={copiado ? 'Copiado' : rotulo}
    >
      {copiado ? <Check size={13} /> : <Copy size={13} />}
      {copiado ? 'Copiado' : rotulo}
    </button>
  )
}

// ── Carrossel de lançamento (o primeiro post, o mais importante) ──
interface Slide { titulo: string; texto: string; nota: string }
const CARROSSEL: Slide[] = [
  {
    titulo: 'Capa',
    texto: 'Você ainda faz orçamento de ar-condicionado no papel?',
    nota: 'Fundo azul, foto de um técnico com o celular na mão. Texto grande e chamativo.',
  },
  {
    titulo: 'A dor',
    texto: 'Perder 40 minutos calculando fio, disjuntor e material… e ainda errar o preço.',
    nota: 'Mostre um caderno rabiscado ou uma calculadora. Gera identificação imediata.',
  },
  {
    titulo: 'A virada',
    texto: 'E se bastasse FALAR o serviço e o orçamento sair pronto em 30 segundos?',
    nota: 'Print da tela do app com o microfone ativo. Contraste com o slide anterior.',
  },
  {
    titulo: 'Como funciona',
    texto: '1. Fale: "split de 12 mil pro seu João". 2. O app calcula tudo. 3. Você envia o PDF.',
    nota: 'Três ícones em sequência. Simples e visual.',
  },
  {
    titulo: 'O diferencial',
    texto: 'Bitola, disjuntor e tubulação calculados pela norma ABNT. Sem chute, sem prejuízo.',
    nota: 'Destaque a palavra ABNT. Passa autoridade técnica.',
  },
  {
    titulo: 'Cliente x Interno',
    texto: 'PDF do cliente mostra só o preço. A versão interna mostra seu custo, margem e lucro.',
    nota: 'Duas telas lado a lado. Mostra profissionalismo.',
  },
  {
    titulo: 'Oferta',
    texto: '7 dias grátis. Depois, só R$ 9,99 por mês. Sem cartão pra testar.',
    nota: 'Preço em destaque, fundo verde (cor de lucro). Gatilho de urgência.',
  },
  {
    titulo: 'Chamada final',
    texto: 'Toque no link da bio e faça seu primeiro orçamento por voz hoje.',
    nota: 'Seta apontando pra cima (bio). CTA claro e direto.',
  },
]

// ── Tutorial passo a passo (bom para Reels ou carrossel-tutorial) ──
interface PassoTut { titulo: string; passos: string[] }
const TUTORIAL: PassoTut[] = [
  {
    titulo: 'Grave a tela do celular',
    passos: [
      'Abra o app já logado, na aba "Novo Orçamento".',
      'Use o gravador de tela nativo do celular (deixe o áudio do microfone ligado).',
      'Grave na vertical (9:16) para ocupar a tela inteira no Reels.',
    ],
  },
  {
    titulo: 'Mostre a mágica em 3 toques',
    passos: [
      'Toque no microfone e fale um serviço real: "orçamento pro seu João, dois split de 12 mil".',
      'Espere o app montar equipamentos, materiais e mão de obra sozinho.',
      'Peça um ajuste falando: "tira o disjuntor" — mostre que ele obedece sem apagar o resto.',
    ],
  },
  {
    titulo: 'Feche com o resultado',
    passos: [
      'Alterne entre "Venda" e "Custo" para mostrar a margem.',
      'Exporte o PDF do cliente e mostre como fica profissional.',
      'Finalize com a legenda: "Isso levou 30 segundos. No papel levaria 40 minutos."',
    ],
  },
]

// ── 10 posts prontos (legenda + hashtags) ──
interface Post { n: number; tipo: string; gancho: string; legenda: string; hashtags: string }
const HASH_BASE = '#arcondicionado #refrigeracao #tecnicoderefrigeracao #climatizacao #instalacaodearcondicionado #hvac #orcamento #splitinverter #frioarcondicionado #empreendedorismo'

const POSTS: Post[] = [
  {
    n: 1, tipo: 'Carrossel de lançamento', gancho: 'Você ainda faz orçamento no papel?',
    legenda: 'Chega de perder cliente porque o orçamento demorou.\n\nCom o OrçaFacil-Frio você FALA o serviço e o orçamento sai pronto em 30 segundos — com fio, disjuntor e material calculados pela norma ABNT.\n\n7 dias grátis pra testar. Depois é só R$ 9,99/mês.\n\nLink na bio.',
    hashtags: HASH_BASE,
  },
  {
    n: 2, tipo: 'Reels (dor)', gancho: '40 minutos pra fazer 1 orçamento?',
    legenda: 'Quanto tempo você gasta calculando bitola, disjuntor e tubulação na mão?\n\nEnquanto você calcula, o concorrente já mandou o preço e fechou o serviço.\n\nO app faz esse cálculo por você em segundos. Testa 7 dias de graça.',
    hashtags: HASH_BASE,
  },
  {
    n: 3, tipo: 'Reels (demonstração)', gancho: 'Orçamento por voz: veja funcionando',
    legenda: 'Falei "split de 12 mil pro seu João" e olha o que aconteceu.\n\nO app montou equipamento, material e mão de obra sozinho. Eu só exportei o PDF.\n\nIsso é o OrçaFacil-Frio. Link na bio pra testar grátis.',
    hashtags: HASH_BASE,
  },
  {
    n: 4, tipo: 'Post único (autoridade)', gancho: 'Cálculo pela norma ABNT',
    legenda: 'Bitola de fio errada queima o compressor. Disjuntor errado é risco de incêndio.\n\nO OrçaFacil-Frio calcula tudo pelas normas técnicas — você passa profissionalismo e evita retrabalho.\n\nSeu orçamento com cara de engenheiro, feito em segundos.',
    hashtags: HASH_BASE,
  },
  {
    n: 5, tipo: 'Carrossel (antes x depois)', gancho: 'Antes x Depois do técnico organizado',
    legenda: 'ANTES: caderno, calculadora, WhatsApp e preço no chute.\n\nDEPOIS: fala, o app calcula, o cliente recebe um PDF profissional e você sabe exatamente sua margem.\n\nQual técnico você quer ser em 2026? Link na bio.',
    hashtags: HASH_BASE,
  },
  {
    n: 6, tipo: 'Post único (lucro)', gancho: 'Você sabe quanto lucra por serviço?',
    legenda: 'A versão interna do app mostra seu CUSTO, sua MARGEM e seu LUCRO em cada orçamento.\n\nO cliente vê só o preço final. Você vê o negócio inteiro.\n\nPare de trabalhar no escuro. Teste 7 dias grátis.',
    hashtags: HASH_BASE,
  },
  {
    n: 7, tipo: 'Reels (objeção de preço)', gancho: 'R$ 9,99 por mês é caro?',
    legenda: 'Um único serviço que você fecha mais rápido já paga o mês inteiro do app.\n\nR$ 9,99/mês pra fazer orçamento em segundos, sem erro de cálculo e com cara de profissional.\n\n7 dias grátis, sem cartão. Link na bio.',
    hashtags: HASH_BASE,
  },
  {
    n: 8, tipo: 'Post único (marcas)', gancho: 'Samsung, LG, Midea, Elgin e mais',
    legenda: 'As tabelas de bitola das principais marcas já vêm prontas no app: Samsung, LG, Midea, Elgin, Springer, Gree, Fujitsu, Carrier e outras.\n\nVocê fala o modelo, o app já sabe o cálculo certo. Testa grátis.',
    hashtags: HASH_BASE,
  },
  {
    n: 9, tipo: 'Story/Reels (prova social)', gancho: 'O que muda no seu dia',
    legenda: 'Mais orçamentos enviados no mesmo dia = mais serviços fechados.\n\nTécnico que responde rápido ganha o cliente. O OrçaFacil-Frio te deixa rápido.\n\nComenta "QUERO" que eu te mando o link.',
    hashtags: HASH_BASE,
  },
  {
    n: 10, tipo: 'Post único (chamada final)', gancho: 'Última chamada: 7 dias grátis',
    legenda: 'Ainda dá tempo de testar sem pagar nada.\n\n7 dias grátis pra fazer quantos orçamentos quiser. Se gostar, são só R$ 9,99/mês. Se não, é só não continuar.\n\nO link tá na bio. Bora profissionalizar seu negócio de refrigeração.',
    hashtags: HASH_BASE,
  },
]

// Monta o texto completo (legenda + hashtags) para o botão "Copiar tudo"
function textoCompleto(p: Post) {
  return `${p.legenda}\n\n${p.hashtags}`
}

const DORES = [
  { dor: 'Perde tempo calculando fio, disjuntor e material na mão', cura: 'O app calcula tudo pela norma ABNT em segundos' },
  { dor: 'Demora pra responder e perde o cliente pro concorrente', cura: 'Orçamento por voz pronto em 30 segundos' },
  { dor: 'Erra o preço e trabalha no prejuízo', cura: 'Versão interna mostra custo, margem e lucro reais' },
  { dor: 'Orçamento no papel passa amadorismo', cura: 'PDF profissional com a cara da sua empresa' },
]

export function Marketing() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-sale/70 flex items-center justify-center text-primary-foreground shrink-0">
          <Megaphone size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Kit de lançamento no Instagram</h1>
          <p className="text-muted-foreground text-sm mt-0.5 max-w-2xl text-pretty">
            Tudo pronto para você postar: roteiro do carrossel, tutorial em vídeo e 10 legendas com hashtags.
            Toque em copiar e cole direto no Instagram.
          </p>
        </div>
      </div>

      {/* Estratégia rápida */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CardInfo icon={<Target size={16} />} titulo="Público" texto="Técnicos e instaladores de ar-condicionado e refrigeração." />
        <CardInfo icon={<Sparkles size={16} />} titulo="Promessa" texto="Orçamento profissional por voz em 30 segundos, sem erro de cálculo." />
        <CardInfo icon={<Clock size={16} />} titulo="Oferta" texto="7 dias grátis, sem cartão. Depois R$ 9,99/mês." />
      </section>

      {/* Dor -> Cura */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Lightbulb size={15} className="text-primary" /> Qual dor o app cura (use nos ganchos)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DORES.map((d, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-destructive">DOR</p>
              <p className="text-sm text-foreground mt-0.5 text-pretty">{d.dor}</p>
              <div className="h-px bg-border my-2.5" />
              <p className="text-xs font-semibold text-profit">O APP CURA</p>
              <p className="text-sm text-foreground mt-0.5 text-pretty">{d.cura}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Carrossel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers size={15} className="text-primary" /> Carrossel de lançamento — {CARROSSEL.length} slides
          </h2>
          <BotaoCopiar
            rotulo="Copiar roteiro"
            texto={CARROSSEL.map((s, i) => `Slide ${i + 1} — ${s.titulo}\n${s.texto}\n(Visual: ${s.nota})`).join('\n\n')}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CARROSSEL.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/15 text-primary text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{s.titulo}</span>
              </div>
              <p className="text-sm font-medium text-foreground text-pretty leading-snug">{s.texto}</p>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5 text-pretty">
                <Camera size={12} className="mt-0.5 shrink-0" /> {s.nota}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tutorial */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Film size={15} className="text-primary" /> Tutorial em vídeo (Reels) — roteiro de gravação
        </h2>
        <div className="space-y-3">
          {TUTORIAL.map((t, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-foreground">{t.titulo}</h3>
              </div>
              <ol className="space-y-1.5 pl-1">
                {t.passos.map((p, j) => (
                  <li key={j} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                    <ListChecks size={13} className="mt-0.5 shrink-0 text-primary/70" />
                    <span className="text-pretty">{p}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* 10 posts */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Share2 size={15} className="text-primary" /> 10 posts prontos para publicar
        </h2>
        <div className="space-y-3">
          {POSTS.map(p => (
            <article key={p.n} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-accent/40 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {p.n}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground truncate">{p.tipo}</span>
                </div>
                <BotaoCopiar rotulo="Copiar tudo" texto={textoCompleto(p)} />
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-start gap-2 text-pretty">
                  <MessageSquare size={14} className="mt-0.5 shrink-0 text-primary" /> {p.gancho}
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{p.legenda}</p>
                <div className="flex items-start gap-2 pt-1">
                  <Hash size={13} className="mt-0.5 shrink-0 text-muted-foreground/60" />
                  <p className="text-xs text-primary/80 leading-relaxed break-words">{p.hashtags}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Dica final */}
      <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-brand-muted p-4">
        <Lightbulb size={15} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground text-pretty leading-relaxed">
          Dica de calendário: publique o carrossel de lançamento (post 1) primeiro, depois 1 post por dia na
          ordem da lista. Sempre coloque o link do app na bio e repita o CTA "link na bio" no primeiro comentário.
        </p>
      </div>
    </div>
  )
}

function CardInfo({ icon, titulo, texto }: { icon: React.ReactNode; titulo: string; texto: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{titulo}</span>
      </div>
      <p className="text-sm text-foreground mt-1.5 text-pretty leading-snug">{texto}</p>
    </div>
  )
}
