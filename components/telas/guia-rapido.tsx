'use client'

import {
  Mic, FileText, Users, Wallet, Tags, History, HardHat, Sparkles,
  ArrowRight, Lightbulb,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'

type Pagina =
  | 'dashboard' | 'novo-orcamento' | 'historico' | 'clientes'
  | 'fluxo-caixa' | 'funcionarios' | 'tabela-precos' | 'perfil' | 'admin'

interface Passo {
  icon: React.ElementType
  titulo: string
  destino?: Pagina
  passos: string[]
}

const GUIA: Passo[] = [
  {
    icon: Mic,
    titulo: 'Criar orçamento por voz ou texto',
    destino: 'novo-orcamento',
    passos: [
      'Toque no microfone e fale naturalmente: "orçamento pro seu João, dois split de 12 mil".',
      'A IA monta os equipamentos, materiais e a mão de obra sozinha.',
      'Peça ajustes na conversa: "tira o disjuntor", "põe 6 metros no de 24", "deixa 3 suportes".',
      'Confira o preview e alterne entre Venda e Custo no canto superior.',
    ],
  },
  {
    icon: FileText,
    titulo: 'Salvar e exportar o orçamento',
    destino: 'novo-orcamento',
    passos: [
      'Preencha o cliente (nome, endereço e telefone) — a IA também capta isso pela fala.',
      'Toque em Salvar para guardar no Histórico.',
      'Exporte em 3 formatos: PDF para o Cliente, lista para a Loja e uso Interno.',
    ],
  },
  {
    icon: Users,
    titulo: 'Gerenciar clientes',
    destino: 'clientes',
    passos: [
      'Cadastre clientes e veja todos os orçamentos de cada um.',
      'Toque em um orçamento na ficha para abrir e editar.',
      'Use o botão Receber para lançar o pagamento direto no fluxo de caixa.',
    ],
  },
  {
    icon: Wallet,
    titulo: 'Controlar o fluxo de caixa',
    destino: 'fluxo-caixa',
    passos: [
      'Registre receitas e despesas com o botão correspondente.',
      'Navegue entre os meses nas setas do topo.',
      'Toque em qualquer lançamento para ver o detalhe, editar o valor ou excluir.',
    ],
  },
  {
    icon: Tags,
    titulo: 'Ajustar a tabela de preços',
    destino: 'tabela-precos',
    passos: [
      'Defina seus preços de materiais e serviços nas abas.',
      'Os valores alimentam os cálculos automáticos dos orçamentos.',
      'Atualize sempre que o custo mudar para manter o lucro correto.',
    ],
  },
  {
    icon: HardHat,
    titulo: 'Cadastrar funcionários',
    destino: 'funcionarios',
    passos: [
      'Cadastre a equipe com função, salário e dia de pagamento.',
      'A folha mensal aparece resumida aqui na aba Geral.',
    ],
  },
  {
    icon: History,
    titulo: 'Consultar o histórico',
    destino: 'historico',
    passos: [
      'Veja todos os orçamentos salvos, com status e valores.',
      'Reabra para editar, mudar o status ou exportar novamente.',
    ],
  },
]

export function GuiaRapido({
  open, onOpenChange, onNavegar,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onNavegar?: (p: Pagina) => void
}) {
  const ir = (destino?: Pagina) => {
    if (!destino) return
    onOpenChange(false)
    onNavegar?.(destino)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" /> Guia rápido
          </DialogTitle>
          <DialogDescription>
            Passo a passo das principais funções. Toque em um item para ir direto até ele.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {GUIA.map((g, i) => {
            const Icon = g.icon
            return (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-muted flex items-center justify-center text-primary shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-balance">{g.titulo}</h3>
                      {g.destino && (
                        <button
                          onClick={() => ir(g.destino)}
                          className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                        >
                          Abrir <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                    <ol className="mt-2 space-y-1.5">
                      {g.passos.map((p, j) => (
                        <li key={j} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                            {j + 1}
                          </span>
                          <span className="text-pretty">{p}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )
          })}

          <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-brand-muted p-3">
            <Lightbulb size={15} className="text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground text-pretty">
              Dica: fale com a IA como falaria com um ajudante — ela entende gírias, corrige erros de digitação
              e faz só o ajuste que você pediu, sem apagar o resto do orçamento.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
