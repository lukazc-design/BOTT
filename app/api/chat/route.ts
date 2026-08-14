import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai'

// Permite streaming de respostas por até 30 segundos
export const maxDuration = 30

// Modelo pequeno e barato por padrão, para economizar cota do AI Gateway.
// Troque por outro ID (ex: 'google/gemini-2.5-flash-lite') se preferir.
const MODEL = 'openai/gpt-4o-mini'

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: MODEL,
    system:
      'Você é o BOTT, um assistente prestativo e direto. Responda sempre em português do Brasil, de forma clara e concisa.',
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
