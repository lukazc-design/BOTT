#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LEITOR DE LOGS - OrçaFácil-Frio
================================
Mostra o arquivo logs-ia.jsonl de forma legível no terminal.
Rode com:  python ler-logs.py
"""

import json
import os

PASTA = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(PASTA, "logs-ia.jsonl")


def encurtar(txt: str, limite: int = 600) -> str:
    txt = (txt or "").strip()
    return txt if len(txt) <= limite else txt[:limite] + " [...]"


def main():
    if not os.path.exists(LOG):
        print("Ainda não há logs. Rode o porteiro e use o app primeiro.")
        return

    with open(LOG, encoding="utf-8") as f:
        linhas = [l for l in f if l.strip()]

    print(f"\n{len(linhas)} registro(s) em {LOG}\n" + "=" * 60)
    for i, linha in enumerate(linhas, 1):
        try:
            r = json.loads(linha)
        except Exception:
            continue
        print(f"\n#{i}  {r.get('quando', '')}   modelo: {r.get('modelo', '')}")
        if r.get("usuario"):
            print(f"usuário: {r['usuario']}")
        print("-" * 60)
        print("PERGUNTA:\n" + encurtar(r.get("prompt", "")))
        print("\nRESPOSTA:\n" + encurtar(r.get("resposta", "")))
        print("=" * 60)


if __name__ == "__main__":
    main()
