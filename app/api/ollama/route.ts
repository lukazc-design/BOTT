import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { prompt, model } = await req.json()

  // URL do Ollama sempre vem do servidor (centralizado no PC do dono)
  const url = process.env.OLLAMA_URL ?? 'http://localhost:11434'
  const mdl = model ?? 'qwen2.5:14b'

  const SYSTEM = `Você é um assistente especializado em orçamentos de instalação de ar condicionado e refrigeração.
Seu trabalho é interpretar o que o técnico descreveu e extrair as informações para gerar um orçamento.

Responda SEMPRE em JSON válido com o seguinte formato:
{
  "entendimento": "Resumo em português do que foi solicitado",
  "clienteNome": "Nome do cliente se mencionado, senão vazio",
  "clienteEndereco": "Endereço se mencionado, senão vazio",
  "clienteTelefone": "Telefone se mencionado, senão vazio",
  "equipamentos": [
    {
      "marca": "Nome da marca (Samsung, LG, Midea, etc.)",
      "tipo": "hi-wall | piso-teto | cassete | bi-split | tri-split | quadri-split",
      "btu": 12000,
      "quantidade": 1,
      "ambiente": "Nome do ambiente (Sala, Quarto, etc.)",
      "distanciaTubulacao": 5,
      "tensao": "220V"
    }
  ],
  "observacoes": "Observações extras relevantes se houver"
}

Regras:
- Se a marca não for mencionada, use "Samsung" como padrão
- Se a tensão não for mencionada, use "220V" como padrão
- Se a distância de tubulação não for mencionada, use 5 metros como padrão
- Se o ambiente não for mencionado, use "Ambiente" seguido do número do equipamento
- BTU deve ser número inteiro (7000, 9000, 12000, 18000, 24000, etc.)
- Responda SOMENTE o JSON, sem texto antes ou depois`

  // Headers necessários para Cloudflare e ngrok não retornarem página de aviso
  const cfHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'OrcaFacilFrio/1.0',
    'CF-Access-Client-Id': 'bypass',
    'bypass-tunnel-reminder': '1',
    'ngrok-skip-browser-warning': 'true',
  }

  try {
    const resp = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: cfHeaders,
      body: JSON.stringify({
        model: mdl,
        prompt: `${SYSTEM}\n\nTécnico disse: "${prompt}"`,
        stream: false,
        options: { temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(120000),
    })

    if (!resp.ok) {
      const body = await resp.text()
      const isHtml = body.trim().startsWith('<')
      return NextResponse.json(
        {
          erro: isHtml
            ? 'Cloudflare Tunnel bloqueou a requisição. Verifique se o tunnel ainda está ativo no CMD.'
            : `Ollama retornou status ${resp.status}. Verifique se o Ollama está rodando.`,
        },
        { status: 502 }
      )
    }

    // Garante que a resposta é JSON e não página HTML do Cloudflare
    const contentType = resp.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      const body = await resp.text()
      return NextResponse.json(
        { erro: 'Cloudflare retornou página HTML em vez do Ollama. Verifique se o tunnel está ativo.', raw: body.slice(0, 200) },
        { status: 502 }
      )
    }

    const data = await resp.json()
    const rawText: string = data.response ?? ''

    // Extrai JSON da resposta
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json(
        { erro: 'Não foi possível extrair JSON da resposta da IA.', raw: rawText },
        { status: 422 }
      )
    }

    const parsed = JSON.parse(match[0])
    return NextResponse.json(parsed)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    const isTimeout = msg.includes('timeout') || msg.includes('abort')
    return NextResponse.json(
      {
        erro: isTimeout
          ? 'Tempo limite atingido. O Ollama demorou mais de 60s para responder.'
          : `Não foi possível conectar ao Ollama: ${msg}`,
      },
      { status: 503 }
    )
  }
}

// ─── STATUS DO OLLAMA ─────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  // URL centralizada no servidor — nao depende do cliente
  const url = process.env.OLLAMA_URL ?? 'http://localhost:11434'
  try {
    const resp = await fetch(`${url}/api/tags`, {
      headers: {
        'User-Agent': 'OrcaFacilFrio/1.0',
        'bypass-tunnel-reminder': '1',
        'CF-Access-Client-Id': 'bypass',
        'ngrok-skip-browser-warning': 'true',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) {
      const body = await resp.text()
      return NextResponse.json({ online: false, erro: `HTTP ${resp.status}`, detalhe: body.slice(0, 300) })
    }
    const contentType = resp.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      const body = await resp.text()
      return NextResponse.json({ online: false, erro: 'Tunnel retornou pagina HTML em vez do Ollama', detalhe: body.slice(0, 300) })
    }
    const data = await resp.json()
    const models = (data.models ?? []).map((m: { name: string }) => m.name)
    return NextResponse.json({ online: true, models, url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ online: false, erro: msg, url, models: [] })
  }
}
