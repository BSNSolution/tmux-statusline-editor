#!/usr/bin/env python3
"""install-hooks.py — adiciona (ou remove) os hooks do tmux-statusline-editor no ~/.claude/settings.json.

Grava o estado PRECISO do Claude Code por painel do tmux, para o indicador nas abas. É idempotente
(não duplica), preserva todos os hooks existentes, e faz backup antes de gravar.

Uso:
  install-hooks.py <caminho-do-agent-hook.sh> install   # adiciona os hooks
  install-hooks.py <caminho-do-agent-hook.sh> uninstall  # remove só os nossos
  install-hooks.py <caminho-do-agent-hook.sh> status     # mostra se estão instalados
"""
import json
import os
import sys
import time

MARK = "tse-agent-hook"  # marcador para reconhecer nossos hooks

# evento do Claude Code -> estado que gravamos
EVENT_STATE = {
    "UserPromptSubmit": "working",
    "PreToolUse": "working",
    "PostToolUse": "working",
    "Stop": "idle",
    "SessionEnd": "idle",
    "Notification": "needs",
    "PermissionRequest": "needs",
}

SETTINGS = os.path.expanduser("~/.claude/settings.json")


def load():
    with open(SETTINGS) as f:
        return json.load(f)


def save(data):
    bak = f"{SETTINGS}.bak-{time.strftime('%Y%m%d-%H%M%S')}"
    with open(SETTINGS) as f:
        os.write(os.open(bak, os.O_WRONLY | os.O_CREAT, 0o600), f.read().encode())
    with open(SETTINGS, "w") as f:
        json.dump(data, f, indent=2)
    return bak


def our_hook_cmd(script, state):
    # comando com marcador, para reconhecer/remover depois
    return f'"{script}" {state}  # {MARK}'


def is_ours(h):
    return isinstance(h, dict) and MARK in str(h.get("command", ""))


def install(script):
    data = load()
    hooks = data.setdefault("hooks", {})
    added = 0
    for event, state in EVENT_STATE.items():
        groups = hooks.setdefault(event, [])
        # já instalado nesse evento?
        if any(is_ours(h) for g in groups for h in g.get("hooks", [])):
            continue
        groups.append({"hooks": [{"type": "command", "command": our_hook_cmd(script, state)}]})
        added += 1
    bak = save(data)
    print(f"✓ hooks do indicador instalados ({added} evento(s) novo(s)).")
    print(f"  backup: {bak}")
    print("  reinicie/retome suas sessões do Claude Code para os hooks valerem.")


def uninstall():
    data = load()
    hooks = data.get("hooks", {})
    removed = 0
    for event, groups in list(hooks.items()):
        newgroups = []
        for g in groups:
            g["hooks"] = [h for h in g.get("hooks", []) if not is_ours(h)]
            if g["hooks"]:
                newgroups.append(g)
            else:
                removed += 1
        hooks[event] = newgroups
    bak = save(data)
    print(f"✓ hooks do indicador removidos ({removed} grupo(s)).")
    print(f"  backup: {bak}")


def status():
    data = load()
    hooks = data.get("hooks", {})
    found = []
    for event in EVENT_STATE:
        if any(is_ours(h) for g in hooks.get(event, []) for h in g.get("hooks", [])):
            found.append(event)
    if found:
        print("✓ instalados em: " + ", ".join(found))
    else:
        print("✗ não instalados. Rode: tmux-statusline agent-tabs --install-hooks")


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    script, action = sys.argv[1], sys.argv[2]
    if not os.path.exists(SETTINGS):
        print(f"⚠️  {SETTINGS} não existe — o Claude Code não parece instalado.")
        sys.exit(1)
    if action == "install":
        install(script)
    elif action == "uninstall":
        uninstall()
    elif action == "status":
        status()
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
