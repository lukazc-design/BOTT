// Utilitários de telefone: normalização + links de ligação e WhatsApp.
// Regras pensadas para números brasileiros (DDI 55).

// Mantém só dígitos
export function apenasDigitos(tel: string): string {
  return (tel || '').replace(/\D/g, '')
}

// Normaliza para o formato internacional do WhatsApp (55 + DDD + número).
// Retorna '' quando o número é curto demais para ser válido.
export function normalizarWhatsApp(tel: string): string {
  let d = apenasDigitos(tel)
  if (!d) return ''
  // remove zeros à esquerda (ex.: 0XX)
  d = d.replace(/^0+/, '')
  // já veio com DDI 55
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d
  // veio com DDD + número (10 ou 11 dígitos) → prefixa 55
  if (d.length === 10 || d.length === 11) return '55' + d
  // formatos fora do padrão: não arrisca um link quebrado
  return ''
}

// true quando dá para montar um link de WhatsApp confiável
export function temWhatsAppValido(tel: string): boolean {
  return normalizarWhatsApp(tel) !== ''
}

// Link para abrir a conversa no WhatsApp (com mensagem opcional já preenchida)
export function linkWhatsApp(tel: string, mensagem?: string): string {
  const num = normalizarWhatsApp(tel)
  if (!num) return ''
  const base = `https://wa.me/${num}`
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base
}

// Link para o discador do celular
export function linkTelefone(tel: string): string {
  const d = apenasDigitos(tel)
  return d ? `tel:${d}` : ''
}

// Formata para exibição amigável: (11) 91234-5678
export function formatarTelefone(tel: string): string {
  const d = apenasDigitos(tel).replace(/^55/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return tel || ''
}
