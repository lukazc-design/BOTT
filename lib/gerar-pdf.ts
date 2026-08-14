/**
 * gerar-pdf.ts — gerador central de HTML para impressão/PDF
 * Usado tanto no Histórico quanto no Preview do Novo Orçamento
 */

import type { Orcamento, PerfilTecnico } from './tipos'

export type VersaoPdf = 'cliente' | 'cliente-servico' | 'interna' | 'interna-sem-custo' | 'loja'

// Recalcula os totais de um orçamento a partir de uma lista de itens
function recalcTotais(itens: Orcamento['itens']) {
  const totalCusto = itens.reduce((s, i) => s + i.precoCusto * i.quantidade, 0)
  const totalVenda = itens.reduce((s, i) => s + i.precoVenda * i.quantidade, 0)
  const lucro = totalVenda - totalCusto
  const margemLucro = totalVenda > 0 ? (lucro / totalVenda) * 100 : 0
  return { totalCusto, totalVenda, lucro, margemLucro }
}

// Hexadecimal → RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const big = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return { r: (big >> 16) & 255, g: (big >> 8) & 255, b: big & 255 }
}

// Gera cor com opacidade para uso inline
function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

// Versão clara da cor para backgrounds
function corClara(hex: string) {
  return rgba(hex, 0.08)
}

function fmtR(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function gerarHtmlPdf(oEntrada: Orcamento, perfil: PerfilTecnico, versaoEntrada: VersaoPdf): string {
  // "cliente-servico" = mesmo layout do cliente, mas só com a mão de obra/serviços
  // (sem a lista de materiais). Filtra os itens e recalcula os totais.
  const soServico = versaoEntrada === 'cliente-servico'
  const versao: VersaoPdf = soServico ? 'cliente' : versaoEntrada
  const o: Orcamento = soServico
    ? (() => {
        const itensServico = oEntrada.itens.filter(i => i.categoria === 'servico')
        return { ...oEntrada, itens: itensServico, ...recalcTotais(itensServico) }
      })()
    : oEntrada

  if (versao === 'loja') return gerarHtmlLoja(o, perfil)

  const cor = perfil.corPrimaria ?? '#0ea5e9'
  const layout = perfil.layoutOrcamento ?? 'classico'
  const isInterna = versao === 'interna' || versao === 'interna-sem-custo'

  // Nome do documento (título da aba/arquivo ao salvar em PDF). Usa cliente + empresa
  // para quem RECEBE ver algo útil, e nunca "PRE-VISUALIZACAO".
  const numeroLimpo = o.numero && o.numero !== 'PRE-VISUALIZACAO' ? o.numero : 'Rascunho'
  const clienteDoc = o.clienteNome ? ` - ${o.clienteNome}` : ''
  const tituloDoc = isInterna
    ? `Orcamento (interno) ${numeroLimpo}${clienteDoc}`
    : `Orcamento ${numeroLimpo}${clienteDoc}${perfil.empresa ? ` - ${perfil.empresa}` : ''}`
  const mostrarCusto = versao === 'interna' // interna-sem-custo mostra lucro/margem mas nao custo
  const { r, g, b } = hexToRgb(cor)

  const logoTag = perfil.logoBase64
    ? `<img src="${perfil.logoBase64}" alt="${perfil.empresa || 'Logo'}" style="max-height:84px;max-width:220px;object-fit:contain;display:block;" />`
    : `<div style="font-size:26px;font-weight:900;color:${cor};letter-spacing:-1px;line-height:1;">${perfil.empresa || 'Empresa'}</div>`

  const empresaInfo = [
    perfil.cnpj ? `CNPJ: ${perfil.cnpj}` : '',
    perfil.telefone,
    perfil.email,
    [perfil.cidade, perfil.estado].filter(Boolean).join(' / '),
  ].filter(Boolean).join('  ·  ')

  // ── Marca d'água central: usa a LOGO do cliente (suave e centralizada).
  // Se não houver logo, cai no nome da empresa em texto grande e clarinho.
  const marcaDAguaCentral = perfil.logoBase64
    ? `<div style="
        position:fixed; top:50%; left:50%;
        transform:translate(-50%,-50%);
        width:60%; max-width:520px;
        opacity:0.05; z-index:0; pointer-events:none;
      ">
        <img src="${perfil.logoBase64}" alt="" style="width:100%;object-fit:contain;" />
      </div>`
    : `<div style="
        position:fixed; top:50%; left:50%;
        transform:translate(-50%,-50%) rotate(-24deg);
        font-size:64px; font-weight:900;
        color:${rgba(cor, 0.05)};
        white-space:nowrap; z-index:0; pointer-events:none;
        letter-spacing:2px; text-align:center;
      ">${(perfil.empresa || 'ORÇAMENTO').toUpperCase()}</div>`

  // ── Molduras/faixas decorativas nas bordas (cor do usuário) + selo "USO INTERNO"
  const marcaDAgua = `
    ${marcaDAguaCentral}
    <div style="
      position:fixed; top:0; right:0; bottom:0;
      width:10px;
      background:linear-gradient(180deg,${cor},${rgba(cor,0.3)},${cor});
      z-index:0;
    "></div>
    <div style="
      position:fixed; top:0; left:0; bottom:0;
      width:10px;
      background:linear-gradient(180deg,${cor},${rgba(cor,0.3)},${cor});
      z-index:0;
    "></div>
    ${isInterna ? `
    <div style="
      position:fixed; top:14%; left:50%;
      transform:translate(-50%,0) rotate(-24deg);
      font-size:64px; font-weight:900;
      color:${rgba(cor, 0.06)};
      white-space:nowrap; z-index:0; pointer-events:none;
      letter-spacing:4px;
    ">USO INTERNO</div>` : ''}
    <div style="
      position:fixed; top:0; left:0; right:0; height:6px;
      background:linear-gradient(90deg,${cor},${rgba(cor,0.4)},${cor});
      z-index:2;
    "></div>
    <div style="
      position:fixed; bottom:0; left:0; right:0; height:6px;
      background:linear-gradient(90deg,${rgba(cor,0.4)},${cor},${rgba(cor,0.4)});
      z-index:2;
    "></div>
  `

  // ── Cabeçalho de cliente
  const clienteBlock = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:11px;color:#374151;">
      <div><span style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">Cliente</span><br/><strong style="font-size:13px;color:#111827;">${o.clienteNome || '—'}</strong></div>
      ${o.clienteEndereco ? `<div><span style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">Endereco</span><br/>${o.clienteEndereco}</div>` : '<div></div>'}
      ${o.clienteTelefone ? `<div style="margin-top:6px;"><span style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">Telefone</span><br/>${o.clienteTelefone}</div>` : '<div></div>'}
      ${o.clienteEmail ? `<div style="margin-top:6px;"><span style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:.05em;">E-mail</span><br/>${o.clienteEmail}</div>` : '<div></div>'}
    </div>
  `

  // ── Equipamentos
  const eqBlock = o.equipamentos.length > 0 ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${cor};margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid ${rgba(cor,0.2)};">Equipamentos</div>
      ${o.equipamentos.map(eq => `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 14px;border-radius:8px;border:1px solid ${rgba(cor,0.15)};background:${corClara(cor)};margin-bottom:8px;border-left:4px solid ${cor};">
          <div>
            <div style="font-size:12px;font-weight:700;color:#111827;">${eq.marca || ''} ${eq.tipo.replace('-',' ').toUpperCase()} &mdash; ${eq.btu.toLocaleString('pt-BR')} BTU/h &times; ${eq.quantidade} un.</div>
            <div style="font-size:10px;color:#6b7280;margin-top:3px;">${eq.ambiente} &nbsp;&middot;&nbsp; ${eq.tensao} &nbsp;&middot;&nbsp; ${eq.distanciaTubulacao}m tubulacao</div>
            <div style="font-size:10px;color:#6b7280;margin-top:2px;">
              Cabo interl.: <strong>${eq.caboInterligacao}</strong> &nbsp;
              Cabo alim.: <strong>${eq.caboAlimentacao}</strong> &nbsp;
              Disjuntor: <strong>${eq.disjuntor}</strong> &nbsp;
              Gas: <strong style="color:#d97706;">${eq.cargaGas}</strong>
            </div>
          </div>
        </div>`).join('')}
    </div>` : ''

  // ── Tabela de itens agrupada por categoria
  const thSt = `padding:8px 10px;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#fff;background:${cor};`
  const tdSt = `padding:8px 10px;font-size:11px;border-bottom:1px solid #f1f5f9;color:#374151;`

  // Agrupa itens por categoria para exibicao
  type ItGrp = { cat: string; label: string; itens: typeof o.itens }
  const grpMap: Record<string, ItGrp> = {}
  for (const it of o.itens) {
    const cat = it.categoria ?? 'outros'
    if (!grpMap[cat]) grpMap[cat] = { cat, label: cat === 'servico' ? 'Servicos' : cat === 'material' ? 'Materiais' : cat === 'equipamento' ? 'Equipamentos' : 'Outros', itens: [] }
    grpMap[cat].itens.push(it)
  }
  const grupos = Object.values(grpMap)

  const colsHeader = isInterna && mostrarCusto
    ? `<th style="${thSt}text-align:left;border-radius:6px 0 0 0;">Descricao</th><th style="${thSt}width:52px;text-align:center;">Qtd</th><th style="${thSt}width:88px;text-align:right;color:#fde68a;">Custo</th><th style="${thSt}width:88px;text-align:right;">Venda</th><th style="${thSt}width:72px;text-align:right;border-radius:0 6px 0 0;color:#86efac;">Lucro</th>`
    : isInterna
      ? `<th style="${thSt}text-align:left;border-radius:6px 0 0 0;">Descricao</th><th style="${thSt}width:52px;text-align:center;">Qtd</th><th style="${thSt}width:100px;text-align:right;border-radius:0 6px 0 0;">Preco</th>`
      : `<th style="${thSt}text-align:left;border-radius:6px 0 0 0;">Descricao</th><th style="${thSt}width:52px;text-align:center;">Qtd</th><th style="${thSt}width:100px;text-align:right;border-radius:0 6px 0 0;">Valor</th>`

  const gerarGrupoRows = (grp: ItGrp, baseIndex: number) => {
    const catHeader = grupos.length > 1
      ? `<tr><td colspan="${isInterna && mostrarCusto ? 5 : 3}" style="padding:9px 10px 6px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:${cor};background:${corClara(cor)};border-bottom:1.5px solid ${rgba(cor,0.2)};border-top:1px solid ${rgba(cor,0.1)};">${grp.label} · ${grp.itens.length} ${grp.itens.length === 1 ? 'item' : 'itens'}</td></tr>`
      : ''
    const rows = grp.itens.map((it, i) => {
      const lucroItem = it.precoVenda - it.precoCusto
      const bg = (baseIndex + i) % 2 === 0 ? '#fff' : '#f9fafb'
      const cols = isInterna && mostrarCusto
        ? `<td style="${tdSt}background:${bg};">${it.descricao}</td>
           <td style="${tdSt}background:${bg};text-align:center;color:#6b7280;">${it.quantidade} ${it.unidade}</td>
           <td style="${tdSt}background:${bg};text-align:right;color:#d97706;">${fmtR(it.precoCusto * it.quantidade)}</td>
           <td style="${tdSt}background:${bg};text-align:right;color:${cor};font-weight:600;">${fmtR(it.precoVenda * it.quantidade)}</td>
           <td style="${tdSt}background:${bg};text-align:right;color:#16a34a;">${fmtR(lucroItem * it.quantidade)}</td>`
        : `<td style="${tdSt}background:${bg};">${it.descricao}</td>
           <td style="${tdSt}background:${bg};text-align:center;color:#6b7280;">${it.quantidade} ${it.unidade}</td>
           <td style="${tdSt}background:${bg};text-align:right;color:${cor};font-weight:600;">${fmtR(it.precoVenda * it.quantidade)}</td>`
      return `<tr>${cols}</tr>`
    }).join('')
    return catHeader + rows
  }

  let idx = 0
  const itensRows = grupos.map(grp => { const r = gerarGrupoRows(grp, idx); idx += grp.itens.length; return r }).join('')

  const ncols = isInterna && mostrarCusto ? 5 : 3
  const totalRowCols = isInterna && mostrarCusto
    ? `<td colspan="2" style="padding:11px 10px;font-weight:800;font-size:12px;background:#f8fafc;border-top:2.5px solid ${cor};">TOTAL GERAL</td>
       <td style="padding:11px 10px;text-align:right;font-weight:700;color:#d97706;background:#fefce8;border-top:2.5px solid ${cor};">${fmtR(o.totalCusto)}</td>
       <td style="padding:11px 10px;text-align:right;font-weight:800;font-size:13px;color:${cor};background:${corClara(cor)};border-top:2.5px solid ${cor};">${fmtR(o.totalVenda)}</td>
       <td style="padding:11px 10px;text-align:right;font-weight:700;color:#16a34a;background:#f0fdf4;border-top:2.5px solid ${cor};">${fmtR(o.lucro)}</td>`
    : `<td colspan="${ncols - 1}" style="padding:11px 10px;font-weight:800;font-size:12px;background:#f8fafc;border-top:2.5px solid ${cor};">TOTAL DO ORCAMENTO</td>
       <td style="padding:11px 10px;text-align:right;font-weight:900;font-size:15px;color:${cor};background:${corClara(cor)};border-top:2.5px solid ${cor};">${fmtR(o.totalVenda)}</td>`

  const tabelaItens = `
    <div style="overflow:hidden;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 1px 4px rgba(0,0,0,.06);">
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead><tr>${colsHeader}</tr></thead>
        <tbody>${itensRows}</tbody>
        <tfoot><tr>${totalRowCols}</tr></tfoot>
      </table>
    </div>`

  // ── Resumo interno (somente versao com custo)
  const resumoInterno = isInterna ? `
    <div style="display:grid;grid-template-columns:repeat(${mostrarCusto ? 3 : 2},1fr);gap:10px;margin-top:16px;">
      ${mostrarCusto ? `<div style="padding:12px 16px;background:#fefce8;border-radius:10px;border:1.5px solid #fde68a;">
        <div style="font-size:9px;color:#92400e;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Custo Total</div>
        <div style="font-size:17px;font-weight:800;color:#d97706;">${fmtR(o.totalCusto)}</div>
      </div>` : ''}
      <div style="padding:12px 16px;background:#f0fdf4;border-radius:10px;border:1.5px solid #bbf7d0;">
        <div style="font-size:9px;color:#166534;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Lucro</div>
        <div style="font-size:17px;font-weight:800;color:#16a34a;">${fmtR(o.lucro)}</div>
      </div>
      <div style="padding:12px 16px;background:#f0fdf4;border-radius:10px;border:1.5px solid #bbf7d0;">
        <div style="font-size:9px;color:#166534;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Margem</div>
        <div style="font-size:17px;font-weight:800;color:#16a34a;">${o.margemLucro.toFixed(1)}%</div>
      </div>
    </div>` : ''

  // ── Observacoes
  const obsBlock = o.observacoes ? `
    <div style="margin-top:20px;padding:12px 16px;background:${corClara(cor)};border-left:4px solid ${cor};border-radius:0 8px 8px 0;font-size:11px;color:#374151;line-height:1.6;">
      <strong style="font-size:10px;color:${cor};text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:4px;">Observacoes</strong>
      ${o.observacoes}
    </div>` : ''

  // ── Aceite / assinatura — só na proposta do cliente (dá cara de documento oficial)
  const aceiteBlock = !isInterna ? `
    <div style="margin-top:22px;padding:14px 18px;border:1px dashed ${rgba(cor,0.4)};border-radius:10px;background:${corClara(cor)};">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${cor};margin-bottom:6px;">Condicoes</div>
      <div style="font-size:10px;color:#4b5563;line-height:1.7;">
        Proposta valida ate <strong>${fmtData(o.validade)}</strong>. Valores sujeitos a alteracao apos o vencimento.
        A execucao do servico inicia apos o aceite desta proposta.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:26px;">
        <div style="border-top:1.5px solid #cbd5e1;padding-top:6px;text-align:center;font-size:10px;color:#6b7280;">${perfil.empresa || 'Responsavel'}</div>
        <div style="border-top:1.5px solid #cbd5e1;padding-top:6px;text-align:center;font-size:10px;color:#6b7280;">Aceite do cliente</div>
      </div>
    </div>` : ''

  // ── Rodapé
  const rodape = `
    <div style="margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;font-size:9px;color:#9ca3af;">
      <span>${perfil.empresa || ''} ${perfil.cnpj ? `· CNPJ ${perfil.cnpj}` : ''}</span>
      <span>Emitido em ${fmtData(o.dataCriacao)} · Valido ate ${fmtData(o.validade)}</span>
    </div>`

  // ── CSS global
  const styles = `<style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    body{font-family:'Segoe UI',system-ui,Arial,sans-serif;font-size:12px;color:#1e293b;background:#fff;}
    @media print{
      html,body{margin:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
      *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
      @page{margin:14mm 18mm 14mm 18mm;size:A4;}
      .no-print{display:none!important;}
    }
  </style>`

  // ── Badge interno
  const badgeInterno = isInterna
    ? `<span style="background:#fef3c7;color:#92400e;border:1.5px solid #fde68a;font-size:9px;padding:2px 10px;border-radius:20px;font-weight:700;vertical-align:middle;margin-left:8px;">USO INTERNO</span>`
    : ''

  // ═════��═════════════════════════════════════════════════════
  // LAYOUT CLÁSSICO — header colorido sólido (como imagem)
  // ═════════════════════════�����════════════════════════════════
  if (layout === 'classico') {
    // Calcula totais por categoria para o mini-grafico de composicao
    const totalMat = o.itens.filter(i => i.categoria === 'material' || i.categoria === 'equipamento').reduce((s, i) => s + i.precoVenda * i.quantidade, 0)
    const totalServ = o.itens.filter(i => i.categoria === 'servico').reduce((s, i) => s + i.precoVenda * i.quantidade, 0)
    const totalOutros = o.itens.filter(i => i.categoria === 'outros').reduce((s, i) => s + i.precoVenda * i.quantidade, 0)
    const gtotal = totalMat + totalServ + totalOutros || 1
    const pMat = ((totalMat / gtotal) * 100).toFixed(0)
    const pServ = ((totalServ / gtotal) * 100).toFixed(0)

    const composicaoBlock = `
      <div style="margin-bottom:18px;padding:14px 18px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-bottom:10px;">Composicao do Orcamento</div>
        <div style="display:flex;align-items:center;gap:20px;">
          <!-- Barra de composicao -->
          <div style="flex:1;height:8px;border-radius:4px;overflow:hidden;background:#f1f5f9;display:flex;">
            ${totalMat > 0 ? `<div style="width:${pMat}%;background:${cor};"></div>` : ''}
            ${totalServ > 0 ? `<div style="width:${pServ}%;background:#10b981;"></div>` : ''}
            ${totalOutros > 0 ? `<div style="flex:1;background:#8b5cf6;"></div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap;">
          ${totalMat > 0 ? `<div style="display:flex;align-items:center;gap:5px;font-size:10px;"><span style="width:8px;height:8px;border-radius:50%;background:${cor};display:inline-block;"></span><span style="color:#6b7280;">Materiais</span><strong style="color:${cor};">${pMat}% &nbsp; ${fmtR(totalMat)}</strong></div>` : ''}
          ${totalServ > 0 ? `<div style="display:flex;align-items:center;gap:5px;font-size:10px;"><span style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;"></span><span style="color:#6b7280;">Servicos</span><strong style="color:#10b981;">${pServ}% &nbsp; ${fmtR(totalServ)}</strong></div>` : ''}
        </div>
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;">
          <span>${o.equipamentos.length} equipamento(s) &middot; ${o.itens.length} itens</span>
          <strong style="color:${cor};">${fmtR(o.totalVenda)}</strong>
        </div>
      </div>`

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${tituloDoc}</title>${styles}</head>
    <body style="padding:0;background:#f8fafc;">
      ${marcaDAgua}
      <div style="position:relative;z-index:1;max-width:860px;margin:0 auto;background:#fff;min-height:100vh;">

        <!-- Header colorido sólido -->
        <div style="background:${cor};padding:28px 28px 24px;border-radius:0 0 0 0;position:relative;overflow:hidden;">
          <!-- Detalhe decorativo -->
          <div style="position:absolute;top:-30px;right:-30px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>
          <div style="position:absolute;bottom:-20px;right:60px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.06);"></div>

          <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;">
            <div>
              ${perfil.logoBase64
                ? `<div style="display:inline-block;background:#fff;padding:10px 14px;border-radius:14px;margin-bottom:12px;box-shadow:0 4px 14px rgba(0,0,0,0.15);">
                     <img src="${perfil.logoBase64}" alt="Logo" style="max-height:64px;max-width:180px;object-fit:contain;display:block;" />
                   </div>`
                : `<div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:24px;font-weight:900;color:#fff;">${(perfil.empresa || 'E')[0]}</div>`
              }
              <div style="font-size:19px;font-weight:800;color:#fff;line-height:1.2;">${perfil.empresa || 'Empresa'}</div>
              ${perfil.cnpj ? `<div style="font-size:10px;color:rgba(255,255,255,0.75);margin-top:2px;">CNPJ: ${perfil.cnpj}</div>` : ''}
              <div style="font-size:10px;color:rgba(255,255,255,0.75);margin-top:3px;line-height:1.6;">
                ${[perfil.telefone, perfil.email].filter(Boolean).join(' · ')}
              </div>
              ${[perfil.cidade, perfil.estado].filter(Boolean).join(', ') ? `<div style="font-size:10px;color:rgba(255,255,255,0.65);margin-top:1px;">${[perfil.cidade, perfil.estado].filter(Boolean).join(', ')}</div>` : ''}
            </div>
            <div style="text-align:right;">
              <div style="font-size:9px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.12em;">${isInterna ? 'USO INTERNO' : 'Proposta Comercial'}</div>
              <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;margin-top:2px;">${o.numero}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.65);margin-top:3px;">${fmtData(o.dataCriacao)}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.55);margin-top:1px;">Valido ate ${fmtData(o.validade)}</div>
              ${isInterna ? `<div style="margin-top:6px;display:inline-block;background:rgba(0,0,0,0.25);color:#fde68a;font-size:9px;font-weight:700;padding:2px 10px;border-radius:20px;letter-spacing:.06em;">USO INTERNO</div>` : ''}
            </div>
          </div>
        </div>

        <div style="padding:22px 28px;">

          <!-- Cliente -->
          <div style="margin-bottom:18px;padding:14px 18px;background:#f9fafb;border-radius:12px;border:1px solid #f1f5f9;">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-bottom:8px;">Cliente</div>
            <div style="font-size:14px;font-weight:700;color:#111827;">${o.clienteNome || '—'}</div>
            <div style="font-size:10px;color:#6b7280;margin-top:3px;line-height:1.7;">
              ${[o.clienteTelefone, o.clienteEndereco, o.clienteEmail].filter(Boolean).join(' · ')}
            </div>
          </div>

          ${composicaoBlock}

          ${eqBlock}

          <!-- Itens -->
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af;margin-bottom:8px;">Itens do Orcamento</div>
          ${tabelaItens}
          ${resumoInterno}
          ${obsBlock}
          ${aceiteBlock}
          ${rodape}
        </div>
      </div>
    </body></html>`
  }

  // ═══════════════════════════════════════════════════════════
  // LAYOUT MODERNO
  // ═══════════════════════════════════════════════════════════
  if (layout === 'moderno') {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${tituloDoc}</title>${styles}</head>
    <body style="padding:0;background:#f8fafc;">
      ${marcaDAgua}
      <div style="position:relative;z-index:1;">
        <!-- Header escuro -->
        <div style="background:#0f172a;padding:28px 36px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            ${perfil.logoBase64
              ? `<div style="display:inline-block;background:#fff;padding:10px 14px;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,0.25);"><img src="${perfil.logoBase64}" alt="Logo" style="max-height:72px;max-width:200px;object-fit:contain;display:block;" /></div>`
              : `<div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px;line-height:1;">${perfil.empresa || 'Empresa'}</div>`}
            <div style="font-size:10px;color:#94a3b8;margin-top:10px;line-height:1.8;">${empresaInfo}</div>
          </div>
          <div style="text-align:right;color:#fff;">
            <div style="font-size:10px;color:#475569;letter-spacing:.15em;text-transform:uppercase;">Proposta Comercial</div>
            <div style="font-size:26px;font-weight:900;letter-spacing:-0.5px;">${o.numero}</div>
            <div style="font-size:10px;color:#475569;margin-top:2px;">Valido ate ${fmtData(o.validade)}${isInterna ? `&nbsp;<span style="background:#fef3c7;color:#92400e;padding:1px 8px;border-radius:10px;font-weight:700;">USO INTERNO</span>` : ''}</div>
          </div>
        </div>
        <div style="height:5px;background:linear-gradient(90deg,${cor},${rgba(cor,0.3)},${cor});"></div>

        <div style="padding:28px 36px;">
          <!-- Empresa + Cliente em 2 colunas -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:22px;">
            <div style="padding:14px 18px;background:#fff;border-radius:10px;border:1px solid #e5e7eb;">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${cor};margin-bottom:8px;">Empresa</div>
              <div style="font-size:11px;color:#374151;line-height:1.7;">${empresaInfo.replace(/ · /g,'<br/>')}</div>
            </div>
            <div style="padding:14px 18px;background:#fff;border-radius:10px;border:1px solid #e5e7eb;">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${cor};margin-bottom:8px;">Cliente</div>
              ${clienteBlock}
            </div>
          </div>
          ${eqBlock}
          <div style="margin-bottom:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${cor};">Itens do Orcamento</div>
          ${tabelaItens}
          ${resumoInterno}${obsBlock}${aceiteBlock}${rodape}
        </div>
      </div>
    </body></html>`
  }

  // ═══════════════════════════════════════════════════════════
  // LAYOUT MINIMALISTA
  // ═══════════════════════════════════════════════════════════
  if (layout === 'minimalista') {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${tituloDoc}</title>${styles}</head>
    <body style="padding:32px 36px;background:#fff;">
      ${marcaDAgua}
      <div style="position:relative;z-index:1;max-width:860px;margin:0 auto;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;">
          <div>
            ${logoTag}
            <div style="font-size:10px;color:#9ca3af;margin-top:6px;">${empresaInfo}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.12em;">Orcamento</div>
            <div style="font-size:22px;font-weight:800;color:#111827;">${o.numero}${badgeInterno}</div>
            <div style="font-size:10px;color:#9ca3af;">Valido ate ${fmtData(o.validade)}</div>
          </div>
        </div>
        <div style="height:2px;background:${cor};margin-bottom:24px;border-radius:2px;"></div>
        <div style="margin-bottom:22px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${cor};margin-bottom:8px;">Cliente</div>
          ${clienteBlock}
        </div>
        ${eqBlock}
        <div style="margin-bottom:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${cor};">Itens</div>
        ${tabelaItens}
        ${resumoInterno}${obsBlock}${aceiteBlock}${rodape}
      </div>
    </body></html>`
  }

  // ═══════════════════════════════════════════════════════════
  // LAYOUT CORPORATIVO (duas colunas laterais)
  // ═══════════════════════════════════════════════════════════
  // Fallback para corporativo abaixo — nao remover este comentario
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${tituloDoc}</title>${styles}</head>
  <body style="padding:0;background:#fff;">
    ${marcaDAgua}
    <div style="position:relative;z-index:1;display:flex;min-height:100vh;">
      <!-- Coluna lateral esquerda -->
      <div style="width:200px;background:${cor};padding:28px 20px;flex-shrink:0;display:flex;flex-direction:column;gap:20px;">
        <div>${perfil.logoBase64
          ? `<div style="background:#fff;padding:10px;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.2);"><img src="${perfil.logoBase64}" alt="Logo" style="max-width:100%;max-height:80px;object-fit:contain;display:block;margin:0 auto;" /></div>`
          : `<div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-1px;line-height:1;">${perfil.empresa || 'Empresa'}</div>`}</div>
        <div style="height:1px;background:rgba(255,255,255,0.2);"></div>
        <div>
          <div style="font-size:9px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">Empresa</div>
          <div style="font-size:10px;color:#fff;line-height:1.8;">${empresaInfo.replace(/ · /g,'<br/>')}</div>
        </div>
        <div>
          <div style="font-size:9px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">Numero</div>
          <div style="font-size:14px;font-weight:800;color:#fff;">${o.numero}</div>
          ${isInterna ? `<div style="background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;margin-top:4px;display:inline-block;">USO INTERNO</div>` : ''}
        </div>
        <div>
          <div style="font-size:9px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">Emissao</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.9);">${fmtData(o.dataCriacao)}</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.1em;margin-top:8px;margin-bottom:4px;">Validade</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.9);">${fmtData(o.validade)}</div>
        </div>
        <div style="margin-top:auto;font-size:9px;color:rgba(255,255,255,0.4);line-height:1.5;">
          ${perfil.empresa || ''}<br/>
          ${perfil.cidade || ''}${perfil.estado ? `, ${perfil.estado}` : ''}
        </div>
      </div>
      <!-- Conteúdo principal -->
      <div style="flex:1;padding:28px 28px;">
        <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f1f5f9;">
          <div style="font-size:28px;font-weight:900;color:#111827;letter-spacing:-1px;">ORCAMENTO</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;">Proposta comercial de servicos de refrigeracao</div>
        </div>
        <div style="margin-bottom:20px;padding:14px 18px;background:${corClara(cor)};border-radius:10px;border:1px solid ${rgba(cor,0.15)};">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${cor};margin-bottom:8px;">Cliente</div>
          ${clienteBlock}
        </div>
        ${eqBlock}
        <div style="margin-bottom:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${cor};">Itens do Orcamento</div>
        ${tabelaItens}
        ${resumoInterno}${obsBlock}${aceiteBlock}${rodape}
      </div>
    </div>
  </body></html>`
}

// ═══════════════════════════════════════════════════════════
// VERSÃO LOJA — pedido de cotação para fornecedor
// Lista consolidada de materiais agrupados por categoria
// ════════════════════════════════════════════��══════════════
function gerarHtmlLoja(o: Orcamento, perfil: PerfilTecnico): string {
  const cor = perfil.corPrimaria ?? '#0ea5e9'
  const { r, g, b } = hexToRgb(cor)
  const corClr = `rgba(${r},${g},${b},0.08)`
  const fmtQtd = (n: number, u: string) => `${n % 1 === 0 ? n : n.toFixed(2)} ${u}`

  // Agrupa itens por categoria
  const grupos: Record<string, { descricao: string; quantidade: number; unidade: string; categoria: string }[]> = {
    equipamento: [], material: [], servico: [], outros: [],
  }
  for (const it of o.itens) {
    const cat = it.categoria ?? 'outros'
    if (!grupos[cat]) grupos[cat] = []
    // Consolida itens com mesma descricao
    const existente = grupos[cat].find(x => x.descricao === it.descricao)
    if (existente) existente.quantidade += it.quantidade
    else grupos[cat].push({ descricao: it.descricao, quantidade: it.quantidade, unidade: it.unidade, categoria: cat })
  }

  const nomesCat: Record<string, string> = {
    equipamento: 'Equipamentos',
    material: 'Materiais',
    servico: 'Servicos',
    outros: 'Outros',
  }

  const logoTag = perfil.logoBase64
    ? `<img src="${perfil.logoBase64}" alt="Logo" style="max-height:76px;max-width:200px;object-fit:contain;" />`
    : `<div style="font-size:22px;font-weight:900;color:${cor};">${perfil.empresa || 'Empresa'}</div>`

  let tabelasCategorias = ''
  for (const cat of ['equipamento', 'material', 'servico', 'outros']) {
    const itens = grupos[cat]
    if (!itens || itens.length === 0) continue
    tabelasCategorias += `
      <div style="margin-bottom:22px;">
        <div style="
          display:flex;align-items:center;gap:10px;
          padding:7px 12px;border-radius:8px 8px 0 0;
          background:${cor};color:#fff;font-size:10px;font-weight:700;
          text-transform:uppercase;letter-spacing:.1em;
        ">${nomesCat[cat] || cat}</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:8px 10px;text-align:left;color:#6b7280;font-size:10px;font-weight:600;border-bottom:1.5px solid #e5e7eb;">#</th>
              <th style="padding:8px 10px;text-align:left;color:#6b7280;font-size:10px;font-weight:600;border-bottom:1.5px solid #e5e7eb;">Descricao do Item</th>
              <th style="padding:8px 10px;text-align:center;color:#6b7280;font-size:10px;font-weight:600;border-bottom:1.5px solid #e5e7eb;">Qtd Solicitada</th>
              <th style="padding:8px 10px;text-align:right;color:#6b7280;font-size:10px;font-weight:600;border-bottom:1.5px solid #e5e7eb;">Preco Unit. (R$)</th>
              <th style="padding:8px 10px;text-align:right;color:#6b7280;font-size:10px;font-weight:600;border-bottom:1.5px solid #e5e7eb;">Total (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${itens.map((it, i) => `
              <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
                <td style="padding:7px 10px;color:#9ca3af;border-bottom:1px solid #f1f5f9;">${i + 1}</td>
                <td style="padding:7px 10px;font-weight:500;border-bottom:1px solid #f1f5f9;">${it.descricao}</td>
                <td style="padding:7px 10px;text-align:center;font-weight:700;color:${cor};border-bottom:1px solid #f1f5f9;">${fmtQtd(it.quantidade, it.unidade)}</td>
                <td style="padding:7px 10px;text-align:right;color:#9ca3af;border-bottom:1px solid #f1f5f9;">______________</td>
                <td style="padding:7px 10px;text-align:right;color:#9ca3af;border-bottom:1px solid #f1f5f9;">______________</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`
  }

  // Bloco de assinatura/resposta do fornecedor
  const blocoResposta = `
    <div style="margin-top:32px;padding:18px 20px;border:1.5px dashed #d1d5db;border-radius:10px;background:#fafafa;">
      <div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:14px;text-transform:uppercase;letter-spacing:.05em;">Resposta do Fornecedor</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:11px;color:#374151;">
        <div>
          <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;">Fornecedor / Loja</div>
          <div style="border-bottom:1px solid #d1d5db;height:24px;"></div>
        </div>
        <div>
          <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;">CNPJ</div>
          <div style="border-bottom:1px solid #d1d5db;height:24px;"></div>
        </div>
        <div>
          <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;">Total da Cotacao (R$)</div>
          <div style="border-bottom:1px solid #d1d5db;height:24px;"></div>
        </div>
        <div>
          <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;">Prazo de Entrega</div>
          <div style="border-bottom:1px solid #d1d5db;height:24px;"></div>
        </div>
        <div style="grid-column:1/-1;">
          <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;">Observacoes / Condicoes de Pagamento</div>
          <div style="border-bottom:1px solid #d1d5db;height:24px;margin-bottom:8px;"></div>
          <div style="border-bottom:1px solid #d1d5db;height:24px;"></div>
        </div>
        <div style="grid-column:1/-1;margin-top:12px;">
          <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;">Assinatura / Carimbo</div>
          <div style="border-bottom:1px solid #d1d5db;height:40px;"></div>
        </div>
      </div>
    </div>`

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Pedido de Cotacao ${o.numero && o.numero !== 'PRE-VISUALIZACAO' ? o.numero : 'Rascunho'}${perfil.empresa ? ` - ${perfil.empresa}` : ''}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      body{font-family:'Segoe UI',system-ui,Arial,sans-serif;font-size:12px;color:#1e293b;background:#fff;}
      @media print{*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;} body{margin:0;} @page{margin:14mm 18mm;size:A4;}}
    </style>
  </head>
  <body style="padding:24px 28px;position:relative;">

    ${perfil.logoBase64 ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:55%;max-width:480px;opacity:0.05;z-index:0;pointer-events:none;"><img src="${perfil.logoBase64}" alt="" style="width:100%;object-fit:contain;" /></div>` : ''}
    <div style="position:relative;z-index:1;">

    <!-- Barra superior de cor -->
    <div style="height:6px;background:linear-gradient(90deg,${cor},rgba(${r},${g},${b},0.4),${cor});border-radius:3px;margin-bottom:22px;"></div>

    <!-- Cabecalho -->
    <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:16px;border-bottom:3px solid ${cor};margin-bottom:22px;">
      <div>
        ${logoTag}
        <div style="font-size:10px;color:#6b7280;margin-top:6px;line-height:1.7;">
          ${[perfil.empresa, perfil.cnpj ? `CNPJ: ${perfil.cnpj}` : '', perfil.telefone, perfil.email].filter(Boolean).join('  ·  ')}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.12em;">Pedido de Cotacao</div>
        <div style="font-size:24px;font-weight:900;color:${cor};letter-spacing:-1px;">${o.numero}</div>
        <div style="font-size:10px;color:#9ca3af;">Data: ${fmtData(o.dataCriacao)}</div>
      </div>
    </div>

    <!-- Dados do servico -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">
      <div style="padding:12px 14px;background:${corClr};border-radius:8px;border:1px solid rgba(${r},${g},${b},0.15);">
        <div style="font-size:9px;color:${cor};text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:6px;">Cliente Final</div>
        <div style="font-weight:600;font-size:12px;">${o.clienteNome || '—'}</div>
        ${o.clienteEndereco ? `<div style="font-size:10px;color:#6b7280;margin-top:2px;">${o.clienteEndereco}</div>` : ''}
      </div>
      <div style="padding:12px 14px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
        <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:6px;">Referencia Interna</div>
        <div style="font-size:11px;color:#374151;">${o.numero}</div>
        <div style="font-size:10px;color:#9ca3af;margin-top:2px;">Emitido em ${fmtData(o.dataCriacao)}</div>
      </div>
    </div>

    <!-- Instrucoes -->
    <div style="padding:10px 14px;background:#fffbeb;border:1.5px solid #fde68a;border-radius:8px;margin-bottom:20px;font-size:11px;color:#92400e;">
      <strong>Instrucoes:</strong> Por favor, preencha o preco unitario e total de cada item abaixo e retorne esta cotacao assinada.
      Os campos "Preco Unit." e "Total" devem ser preenchidos pelo fornecedor.
    </div>

    ${tabelasCategorias}
    ${blocoResposta}

    <!-- Rodape -->
    <div style="margin-top:24px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;display:flex;justify-content:space-between;">
      <span>${perfil.empresa || ''}</span>
      <span>Cotacao gerada em ${fmtData(o.dataCriacao)} · OrçaFacil Frio</span>
    </div>

    <!-- Barra inferior de cor -->
    <div style="height:4px;background:linear-gradient(90deg,rgba(${r},${g},${b},0.4),${cor},rgba(${r},${g},${b},0.4));border-radius:3px;margin-top:20px;"></div>

    </div>
  </body></html>`
}
