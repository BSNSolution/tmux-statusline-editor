# tmux-statusline-editor

> Um editor **visual** da statusline do tmux, no próprio terminal (TUI). Pense num
> [`tweakcc`](https://github.com/piqoni/tweakcc), mas para o tmux: você monta a barra
> escolhendo itens de uma biblioteca em linguagem humana, ajusta cores com preview fiel,
> aplica ao vivo e mantém histórico de versões — sem precisar decorar `#{...}` nem `#[fg=...]`.

Feito pela [BSN Solution](https://bsnsolution.com.br). Roda em macOS e Linux.

---

## Por que

Configurar a statusline do tmux à mão é críptico: `status-left`, `#[fg=#9b988f,bg=#15161A]`,
`#{?window_zoomed_flag,...}`, `#(script)`... Este editor traduz tudo para linguagem de gente
("Nome da aba", "Bateria", "Branch git"), mostra um **preview fiel** (renderizado pelo próprio
tmux, com seus valores reais) e aplica a mudança na hora — com **backup e histórico** para você
nunca perder uma configuração.

## Recursos

- **Biblioteca com 80+ itens** em categorias humanas: sessão, janela/painel, host, data/hora,
  git, ícones (Nerd Font), separadores powerline, widgets (bateria, CPU, IP…), combos prontos
  e uma categoria **Dev: Claude Code & Ghostty**.
- **Busca por texto** na biblioteca (digite "git", "bateria", "hora"…).
- **Editor de cores** por segmento: fg/bg por nome ou hex, negrito, itálico, sublinhado, etc.,
  com **copiar/colar estilo** entre itens e "aplicar à zona inteira".
- **Preview fiel**: cada segmento é expandido pelo tmux (`display-message`), com as janelas,
  host e hora reais — em truecolor.
- **Aplicar ao vivo** (`tmux source-file`) + **histórico de versões** com backup automático.
- **Mover, duplicar, remover** itens; **gestão de temas** (desativar/reativar plugins que
  brigam pela statusline, como tokyo-night).
- **Indicador de agentes de IA nas abas** (opcional): mostra um ícone em cada aba conforme o
  Claude Code está trabalhando (⚙) ou precisa de você (🔔) — inclusive em abas de fundo.
- **Portável e autossuficiente**: nada de caminhos fixos; um comando `doctor` verifica e
  instala o que faltar.

## Requisitos

| Dependência           | Necessário | Para quê |
|-----------------------|:----------:|----------|
| **tmux** 3.x          | ✅ | é o que estamos configurando |
| **Node.js** 18+       | ✅ | roda a CLI |
| **pnpm**              | só p/ build a partir do fonte | build do monorepo |
| **Nerd Font**         | recomendado | ícones e bordas powerline (senão viram quadrados) |
| **tmux-agent-indicator** | opcional | itens "Dev: Claude Code" nas abas |

> Não sabe o que tem instalado? Rode `tmux-statusline doctor` — ele diz o que existe e o que falta.
> Com `doctor --fix`, ele instala (usa `brew` no macOS; `apt`/`dnf`/`pacman` no Linux).

## Instalação

```bash
git clone https://github.com/BSNSolution/tmux-statusline-editor.git
cd tmux-statusline-editor

# 1) verifique/instale dependências (opcional, mas recomendado)
bash cli/scripts/doctor.sh --fix

# 2) instale e compile
pnpm install
pnpm build:strict

# 3) rode
./run.sh
```

O `run.sh` força truecolor (`FORCE_COLOR=3`) para as cores baterem dentro do tmux.

## Uso

```bash
./run.sh                         # abre o editor (TUI)
node cli/dist/main.js doctor     # verifica dependências
node cli/dist/main.js doctor --fix
node cli/dist/main.js agent-tabs         # liga o indicador do Claude nas abas
node cli/dist/main.js agent-tabs stop    # desliga
node cli/dist/main.js --help
```

### Teclas do editor

| Tecla | Ação |
|-------|------|
| `←` / `→` | navegar entre as partes da barra (esquerda, abas, aba atual, direita) |
| `↑` / `↓` | navegar entre os itens |
| `,` / `.` (ou `Shift+↑/↓`) | **mover** o item na ordem |
| `a` | **adicionar** item (com busca por texto) |
| `d` | **duplicar** item |
| `r` | **remover** item |
| `e` | **editar** item (conteúdo via biblioteca buscável + cores) |
| `c` / `v` / `V` | **copiar** / **colar** cor / colar na zona inteira |
| `l` | **limpar** cores da zona |
| `g` | opções gerais (fundo geral, posição, intervalo…) |
| `Enter` | **aplicar** no tmux (salva uma versão) |
| `Tab` | trocar de aba (editor / histórico / temas) |
| `q` | sair |

### Indicador de agentes nas abas

Se você usa [Claude Code](https://claude.com/claude-code) em vários painéis do tmux, o editor
pode mostrar em **cada aba** se o agente está trabalhando ou esperando você — inclusive nas abas
que estão em background.

Requer o plugin [`tmux-agent-indicator`](https://github.com/accessd/tmux-agent-indicator)
(o `doctor` instala). Depois:

```bash
node cli/dist/main.js agent-tabs   # sobe o daemon
```

E no seu `window-status-format` (dá pra fazer pelo editor), inclua `#{@agent_icon}` onde quiser
o ícone. O daemon:

- varre **todos os painéis** de cada janela (não só o ativo);
- mostra ⚙ (trabalhando) ou 🔔 (precisa de você); **running vence needs**;
- **some ao focar o painel** (você já viu o alerta) e **expira sozinho** (anti-"ícone preso");
- some **sem deixar espaço** quando não há agente.

## Como funciona

Monorepo pnpm com dois pacotes:

```
shared/   @tse/shared — núcleo puro e testado (sem I/O)
  model.ts       tipos: Segment, StatusModel, TmuxStyle, Theme
  catalog.ts     biblioteca de ~80 itens (o que dá pra pôr na barra)
  parser.ts      statusline crua  →  modelo (respeita #{...}, #(...), #[...])
  generator.ts   modelo  →  statusline crua (só reemite #[...] quando muda)
  roundtrip.test.ts  garante parser∘generator = identidade

cli/      @tse/cli — a TUI (Ink/React) + I/O do tmux
  ui/            App, EditSegment, EditOptions, RealPreview, human.ts
  tmux.ts        importar/aplicar via tmux, expandir formats, janelas reais
  history.ts     versões + backup + prune + pin
  themes-cli.ts  desativar/reativar plugins de tema
  scripts/       doctor.sh (dependências) · agent-tabs-daemon.sh (indicador)
```

O **parser** e o **gerador** são o coração: convertem a statusline nos dois sentidos sem perder
nada (validado por testes de ida-e-volta com statuslines reais). A TUI só orquestra e mostra;
o preview pergunta ao próprio tmux como ele renderiza, para não mentir.

### Dados e backups

Tudo do usuário fica em `~/.config/tmux-statusline/`:

```
history/   uma versão por "aplicar" (JSON) — restaurável
backups/   cópias do ~/.tmux.conf e da statusline antes de cada mudança
```

## Desenvolvimento

```bash
pnpm install
pnpm build:strict          # tsc --noEmit && tsc -b nos dois pacotes
node --test shared/dist/roundtrip.test.js   # testes do núcleo
./run.sh                   # roda a TUI
```

TypeScript estrito (`noUncheckedIndexedAccess`), project references (`composite`), sem `any`.

## Gotchas conhecidos (documentados)

- `#()` no `window-status-format` **só roda no contexto da aba ativa** — por isso o indicador de
  agentes usa `#{@agent_icon}` (opção de usuário por janela, que o tmux expande por-aba) + daemon.
- Estilos de plugin (`window-status-activity-style = reverse`) podem **inverter fg/bg** nas abas
  com atividade — o editor neutraliza isso ao importar/aplicar.
- Plugins de tema (tokyo-night) injetam estilos na **memória** do tmux que persistem após comentar
  a linha — use a gestão de temas do editor (não `kill-server`).

## Licença

MIT © BSN Solution. Veja [LICENSE](LICENSE).

## Contribuindo

Issues e PRs são bem-vindos. Antes de abrir PR, rode `pnpm build:strict` e os testes.
