# Porteiro da IA — OrçaFácil-Frio

Grava, **no seu PC**, tudo o que é enviado para a sua IA offline (Ollama).
Não altera o app. Funciona como um "porteiro" entre a internet e o Ollama.

```
ngrok  ->  PORTEIRO (porta 11500, grava o log)  ->  Ollama (porta 11434)
```

## Pré-requisitos

- **Python 3** instalado (teste no terminal: `python --version`).
- Seu **Ollama** rodando normalmente (porta padrão 11434).
- O **ngrok** que você já usa.

## Como usar (passo a passo)

1. Coloque o arquivo `porteiro-ia.py` em uma pasta qualquer do seu PC.
2. Abra o terminal nessa pasta e rode:
   ```
   python porteiro-ia.py
   ```
   Vai aparecer "Escutando em http://localhost:11500".
3. Em **outro** terminal, aponte o ngrok para o porteiro (porta 11500),
   e **não mais** para o Ollama direto:
   ```
   ngrok http 11500
   ```
   O ngrok vai mostrar um link novo, tipo `https://xxxx.ngrok-free.app`.
4. **PASSO QUE FALTAVA** — atualize a variável `OLLAMA_URL` do app com esse
   link novo: no v0/Vercel, abra **Settings → Vars**, edite `OLLAMA_URL` e
   cole a URL que o ngrok mostrou no passo 3. Salve.
   > Sem isso, o app continua falando com o link antigo (que ia direto no
   > Ollama) e o porteiro nunca vê o tráfego — por isso o arquivo não enchia.
5. **Teste a ligação:** abra no navegador o link do ngrok + `/porteiro-teste`
   (ex.: `https://xxxx.ngrok-free.app/porteiro-teste`). Deve aparecer
   "Porteiro funcionando!" e uma **linha de teste** é gravada no `logs-ia.jsonl`.
6. Agora use o app normalmente. A cada pergunta à IA, uma linha é gravada no
   arquivo **`logs-ia.jsonl`**, na mesma pasta do script.

Pronto. Para parar, aperte `Ctrl + C` no terminal do porteiro.

> **Ao iniciar, o arquivo `logs-ia.jsonl` já é criado vazio** — é normal ele
> começar sem conteúdo. Ele só ganha linhas quando uma pergunta da IA passa
> pelo porteiro.

## "Rodei o script mas o arquivo não gera / não enche"

Quase sempre é o **passo 4**: a variável `OLLAMA_URL` do app ainda está com o
link antigo (apontando direto no Ollama), então as perguntas não passam pelo
porteiro. Confira, nesta ordem:

1. Abra o link do ngrok + `/porteiro-teste` no navegador. Apareceu
   "Porteiro funcionando!"? Se **não** apareceu, o ngrok não está em `11500`
   (passo 3) — corrija.
2. A variável `OLLAMA_URL` (Settings → Vars) é **exatamente** o link que o
   ngrok mostra agora? Lembre: no plano grátis o link **muda** toda vez que
   você reinicia o ngrok, então precisa reeditar a `OLLAMA_URL`.
3. O arquivo `logs-ia.jsonl` existe na pasta? Se não, mova o script para uma
   pasta sua (ex.: `Documentos`) por questão de permissão.
4. Faça **uma pergunta nova** à IA. No terminal do porteiro deve aparecer
   `[hora] pergunta registrada`. Aí o arquivo encheu.

Se aparecer `porteiro nao alcancou o Ollama`, o Ollama não está rodando ou
está em outra porta — abra o Ollama e tente de novo.

## O que fica salvo em cada linha

- `quando`  — data e hora
- `modelo`  — modelo da IA usado
- `prompt`  — a pergunta completa enviada à IA (com o contexto do orçamento)
- `resposta`— o que a IA respondeu
- `usuario` — só vem preenchido SE o app enviar (veja abaixo)

## Sobre identificar o usuário

Hoje o app **não envia** quem é o técnico logado junto do prompt, então o
campo `usuario` fica vazio. O porteiro já está preparado: se um dia você
quiser, peça para habilitarmos no app o envio do cabeçalho `X-Usuario`
(com o e-mail do técnico), e o porteiro passa a gravar isso automaticamente.

## Como ler o log depois

O arquivo `logs-ia.jsonl` é texto puro — abre em qualquer editor.
Cada linha é um registro. Se quiser uma leitura mais amigável, use o
leitor incluído:

```
python ler-logs.py
```
