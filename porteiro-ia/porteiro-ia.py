#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PORTEIRO DA IA - OrçaFácil-Frio
================================

Este programinha roda NO SEU PC. Ele fica "no meio do caminho" entre o app
(que vem pela internet via ngrok) e o seu Ollama offline. Toda pergunta que
chega para a IA é ANOTADA num arquivo local antes de ser repassada ao Ollama.

Fluxo:
    ngrok  ->  PORTEIRO (esta porta, grava o log)  ->  Ollama (11434)

O que ele salva (arquivo logs-ia.jsonl, na mesma pasta deste script):
    - data e hora
    - modelo usado
    - o prompt completo enviado para a IA (a pergunta + contexto do orçamento)
    - a resposta que a IA devolveu
    - o usuário, SE o app enviar o cabeçalho X-Usuario (opcional, ver README)

Não precisa instalar nada: usa só o Python padrão.
Rode com:  python porteiro-ia.py
"""

import http.server
import urllib.request
import urllib.error
import json
import datetime
import os

# ------------------------------------------------------------------
# CONFIGURAÇÃO (ajuste se precisar)
# ------------------------------------------------------------------
OLLAMA = "http://localhost:11434"  # endereço do seu Ollama real
PORTA = 11500                      # porta do porteiro (aponte o ngrok para ela)
PASTA = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(PASTA, "logs-ia.jsonl")   # 1 linha por pergunta (formato JSONL)
# ------------------------------------------------------------------


def registrar(entrada: dict) -> None:
    """Anexa uma linha ao arquivo de log (não sobrescreve o que já existe)."""
    try:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(entrada, ensure_ascii=False) + "\n")
    except Exception as e:
        print("  [aviso] não consegui gravar o log:", e)


class Porteiro(http.server.BaseHTTPRequestHandler):
    def _repassar(self, corpo: bytes) -> tuple[int, bytes, str]:
        """Repassa a requisição ao Ollama e devolve (status, corpo, content-type)."""
        req = urllib.request.Request(
            OLLAMA + self.path,
            data=corpo,
            headers={"Content-Type": "application/json"},
            method=self.command,
        )
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                return r.status, r.read(), r.headers.get("Content-Type", "application/json")
        except urllib.error.HTTPError as e:
            return e.code, e.read(), "application/json"
        except Exception as e:
            msg = json.dumps({"error": f"porteiro nao alcancou o Ollama: {e}"})
            return 502, msg.encode("utf-8"), "application/json"

    def do_POST(self):
        tamanho = int(self.headers.get("Content-Length", 0))
        corpo = self.rfile.read(tamanho) if tamanho else b""

        # 1) repassa ao Ollama e captura a resposta
        status, resposta, ctype = self._repassar(corpo)

        # 2) registra a pergunta (e a resposta) no arquivo local
        try:
            dados = json.loads(corpo) if corpo else {}
            texto_resposta = ""
            try:
                texto_resposta = json.loads(resposta).get("response", "")
            except Exception:
                pass

            registrar({
                "quando": datetime.datetime.now().isoformat(timespec="seconds"),
                "usuario": self.headers.get("X-Usuario", ""),  # preenchido só se o app mandar
                "rota": self.path,
                "modelo": dados.get("model", ""),
                "prompt": dados.get("prompt", ""),
                "resposta": texto_resposta,
            })
            hora = datetime.datetime.now().strftime("%H:%M:%S")
            quem = self.headers.get("X-Usuario", "sem-identificacao")
            print(f"  [{hora}] pergunta registrada  (usuario: {quem})")
        except Exception as e:
            print("  [aviso] erro ao interpretar a requisição:", e)

        # 3) devolve ao app exatamente o que o Ollama respondeu
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(resposta)))
        self.end_headers()
        self.wfile.write(resposta)

    def do_GET(self):
        # Página de teste: abra o link do ngrok + /porteiro-teste no navegador.
        # Serve para confirmar que o tráfego está passando pelo porteiro.
        if self.path.rstrip("/") == "/porteiro-teste":
            hora = datetime.datetime.now().isoformat(timespec="seconds")
            registrar({
                "quando": hora,
                "usuario": "",
                "rota": "/porteiro-teste",
                "modelo": "",
                "prompt": "*** LINHA DE TESTE: o porteiro esta no caminho e gravando ***",
                "resposta": "",
            })
            print(f"  [{datetime.datetime.now():%H:%M:%S}] TESTE recebido -> linha de teste gravada no log")
            html = (
                "<html><head><meta charset='utf-8'></head><body style='font-family:sans-serif;padding:40px'>"
                "<h2 style='color:#1a56db'>Porteiro funcionando!</h2>"
                "<p>O trafego esta passando por aqui e uma linha de teste foi gravada no arquivo "
                "<b>logs-ia.jsonl</b>.</p>"
                "<p>Agora faca uma pergunta de verdade na IA que ela tambem sera registrada.</p>"
                "</body></html>"
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html)))
            self.end_headers()
            self.wfile.write(html)
            return

        # Repassa GETs simples (ex.: /api/tags para checar se o Ollama está online)
        status, resposta, ctype = self._repassar(b"")
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(resposta)))
        self.end_headers()
        self.wfile.write(resposta)

    def log_message(self, *args):
        pass  # silencia o log padrão barulhento do Python


def garantir_arquivo_log() -> None:
    """Cria o arquivo de log já na inicialização (vazio), para você ver que existe.
    Se já existir com conteúdo, NÃO apaga nada — apenas garante que o arquivo está lá."""
    try:
        if not os.path.exists(LOG):
            open(LOG, "a", encoding="utf-8").close()
    except Exception as e:
        print("  [aviso] não consegui criar o arquivo de log:", e)


def main():
    garantir_arquivo_log()
    existe = os.path.exists(LOG)
    print("=" * 52)
    print("  PORTEIRO DA IA - OrçaFácil-Frio")
    print("=" * 52)
    print(f"  Escutando em : http://localhost:{PORTA}")
    print(f"  Repassando p/: {OLLAMA}")
    print(f"  Salvando log : {LOG}")
    print(f"  Arquivo criado: {'SIM (pronto)' if existe else 'NAO (erro de permissao?)'}")
    print("-" * 52)
    print("  IMPORTANTE: o arquivo só ENCHE quando chega pergunta da IA.")
    print("  Para as perguntas passarem por aqui, o ngrok TEM que apontar")
    print("  para a porta do porteiro, e NAO direto para o Ollama:")
    print(f"       ngrok http {PORTA}")
    print("  (Ctrl+C para parar)")
    print("=" * 52)
    try:
        servidor = http.server.ThreadingHTTPServer(("0.0.0.0", PORTA), Porteiro)
    except OSError as e:
        print(f"\n  [ERRO] Não consegui abrir a porta {PORTA}: {e}")
        print("  Pode ser que ela já esteja em uso. Feche o porteiro antigo ou")
        print("  troque o valor de PORTA no topo do script e tente de novo.")
        return
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\n  Porteiro encerrado. Até logo!")


if __name__ == "__main__":
    main()
