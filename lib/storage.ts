'use client'

import type { Orcamento, PerfilTecnico } from './tipos'
import { STORAGE_KEY_ORCAMENTOS, STORAGE_KEY_PERFIL, MAX_ORCAMENTOS, PERFIL_PADRAO } from './tipos'

// ─── PERFIL ──────────────────────────────────────────────────────────────────

export function carregarPerfil(): PerfilTecnico {
  if (typeof window === 'undefined') return PERFIL_PADRAO
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PERFIL)
    if (!raw) return PERFIL_PADRAO
    return { ...PERFIL_PADRAO, ...JSON.parse(raw) }
  } catch {
    return PERFIL_PADRAO
  }
}

export function salvarPerfil(perfil: PerfilTecnico): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_PERFIL, JSON.stringify(perfil))
}

// ─── ORÇAMENTOS ──────────────────────────────────────────────────────────────

export function carregarOrcamentos(): Orcamento[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORCAMENTOS)
    if (!raw) return []
    return JSON.parse(raw) as Orcamento[]
  } catch {
    return []
  }
}

export function salvarOrcamento(orc: Orcamento): { ok: boolean; mensagem?: string } {
  const lista = carregarOrcamentos()

  // Verifica se já existe (edição)
  const idx = lista.findIndex(o => o.id === orc.id)
  if (idx >= 0) {
    lista[idx] = orc
    localStorage.setItem(STORAGE_KEY_ORCAMENTOS, JSON.stringify(lista))
    return { ok: true }
  }

  // Espelho local (o limite real é validado no servidor conforme o plano).
  // Mantém só os mais recentes para não estourar o localStorage.
  lista.unshift(orc) // mais recente primeiro
  const limitado = lista.slice(0, MAX_ORCAMENTOS)
  localStorage.setItem(STORAGE_KEY_ORCAMENTOS, JSON.stringify(limitado))
  return { ok: true }
}

export function excluirOrcamento(id: string): void {
  const lista = carregarOrcamentos().filter(o => o.id !== id)
  localStorage.setItem(STORAGE_KEY_ORCAMENTOS, JSON.stringify(lista))
}

export function atualizarStatusOrcamento(
  id: string,
  status: Orcamento['status']
): void {
  const lista = carregarOrcamentos()
  const idx = lista.findIndex(o => o.id === id)
  if (idx >= 0) {
    lista[idx].status = status
    localStorage.setItem(STORAGE_KEY_ORCAMENTOS, JSON.stringify(lista))
  }
}
