'use client'

// Gerencia o tema visual do app (escuro = padrão, ou claro).
// Persiste a escolha no localStorage e aplica a classe no <html>.

export type Tema = 'dark' | 'light'

export const TEMA_KEY = 'orcafacil-tema'

export function obterTema(): Tema {
  if (typeof window === 'undefined') return 'dark'
  const salvo = localStorage.getItem(TEMA_KEY)
  return salvo === 'light' ? 'light' : 'dark'
}

export function aplicarTema(tema: Tema): void {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  html.classList.remove('dark', 'light')
  html.classList.add(tema)
  html.style.colorScheme = tema
}

export function definirTema(tema: Tema): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TEMA_KEY, tema)
  aplicarTema(tema)
}

export function alternarTema(): Tema {
  const proximo: Tema = obterTema() === 'dark' ? 'light' : 'dark'
  definirTema(proximo)
  return proximo
}

// Script inline (string) que roda ANTES da pintura para evitar "flash" do tema errado.
export const TEMA_INLINE_SCRIPT = `(function(){try{var t=localStorage.getItem('${TEMA_KEY}');var m=t==='light'?'light':'dark';var h=document.documentElement;h.classList.remove('dark','light');h.classList.add(m);h.style.colorScheme=m;}catch(e){}})();`
