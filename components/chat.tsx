'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Square, Bot, User } from 'lucide-react'

const SUGGESTIONS = [
  'Explique o que você faz',
  'Me dê uma ideia de projeto',
  'Escreva um e-mail curto de agradecimento',
]

export function Chat() {
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const isBusy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, status])

  function submit(text: string) {
    const value = text.trim()
    if (!value || isBusy) return
    sendMessage({ text: value })
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      e.keyCode !== 229
    ) {
      e.preventDefault()
      submit(input)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4">
      <header className="flex items-center gap-3 border-b border-border py-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Bot className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight">BOTT</h1>
          <p className="text-xs text-muted-foreground">
            Assistente de IA · respostas em tempo real
          </p>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-6"
        aria-live="polite"
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-card">
              <Bot className="size-7 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-balance">
                Como posso ajudar hoje?
              </h2>
              <p className="text-sm text-muted-foreground text-pretty">
                Faça uma pergunta ou escolha uma sugestão abaixo.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                text={message.parts
                  .map((p) => (p.type === 'text' ? p.text : ''))
                  .join('')}
              />
            ))}
            {status === 'submitted' && (
              <div className="flex items-center gap-3">
                <Avatar role="assistant" />
                <div className="flex gap-1 py-2">
                  <Dot />
                  <Dot delay="150ms" />
                  <Dot delay="300ms" />
                </div>
              </div>
            )}
            {error && (
              <p className="rounded-lg bg-card px-4 py-3 text-sm text-muted-foreground">
                Algo deu errado ao gerar a resposta. Tente novamente.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-background pb-4 pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(input)
          }}
          className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:border-primary"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Escreva sua mensagem..."
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Mensagem"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={stop}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-opacity hover:opacity-80"
              aria-label="Parar geração"
            >
              <Square className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Enviar mensagem"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </button>
          )}
        </form>
        <p className="pt-2 text-center text-xs text-muted-foreground">
          O BOTT pode cometer erros. Verifique informações importantes.
        </p>
      </div>
    </div>
  )
}

function MessageBubble({
  role,
  text,
}: {
  role: string
  text: string
}) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar role={role} />
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-card-foreground'
        }`}
      >
        {text}
      </div>
    </div>
  )
}

function Avatar({ role }: { role: string }) {
  const isUser = role === 'user'
  return (
    <div
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
        isUser ? 'bg-muted' : 'bg-primary text-primary-foreground'
      }`}
    >
      {isUser ? (
        <User className="size-4" aria-hidden="true" />
      ) : (
        <Bot className="size-4" aria-hidden="true" />
      )}
    </div>
  )
}

function Dot({ delay = '0ms' }: { delay?: string }) {
  return (
    <span
      className="size-2 animate-bounce rounded-full bg-muted-foreground"
      style={{ animationDelay: delay }}
    />
  )
}
