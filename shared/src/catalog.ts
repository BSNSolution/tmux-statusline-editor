// catalog.ts — biblioteca de itens que o usuário pode adicionar à statusline.
// Cobre variáveis/formats do tmux 3.x + itens custom comuns (git, hora, widgets).
// Cada item vira um Segment kind="format" (ou "text"/"command") ao ser adicionado.

export interface CatalogItem {
  key: string;
  /** O que é inserido no conteúdo do segmento. */
  insert: string;
  label: string;
  category: CatalogCategory;
  description: string;
  /** Exemplo de saída (p/ preview no picker). */
  example?: string;
  /** kind resultante ao adicionar (default "format"). */
  kind?: "text" | "format" | "command" | "conditional";
  /** Desde qual versão do tmux (para validação). */
  since?: string;
}

export type CatalogCategory =
  | "Sessão & Cliente"
  | "Janela & Painel"
  | "Host & Sistema"
  | "Data & Hora"
  | "Git & Projeto"
  | "Condicionais & Estado"
  | "Texto & Separadores"
  | "Ícones (Nerd Font)"
  | "Widgets (scripts)"
  | "Prontos ✨ (legais)"
  | "Dev: Claude Code & Ghostty 󰚩";

export const CATALOG: CatalogItem[] = [
  // ---- Sessão & Cliente ----
  { key: "session_name", insert: "#S", label: "Nome da sessão", category: "Sessão & Cliente", description: "Nome da sessão atual.", example: "main" },
  { key: "session_id", insert: "#{session_id}", label: "ID da sessão", category: "Sessão & Cliente", description: "Identificador único da sessão.", example: "$0" },
  { key: "session_windows", insert: "#{session_windows}", label: "Nº de janelas", category: "Sessão & Cliente", description: "Quantidade de janelas na sessão.", example: "3" },
  { key: "session_attached", insert: "#{session_attached}", label: "Clientes conectados", category: "Sessão & Cliente", description: "Quantos clientes estão conectados nesta sessão.", example: "1" },
  { key: "client_prefix", insert: "#{?client_prefix,PREFIXO,}", label: "Prefixo ativo?", category: "Sessão & Cliente", description: "Mostra algo quando o prefixo (C-b) está ativo.", kind: "conditional", example: "PREFIXO" },
  { key: "client_key_table", insert: "#{client_key_table}", label: "Key table", category: "Sessão & Cliente", description: "Tabela de teclas ativa (root/prefix/copy-mode).", example: "root" },

  // ---- Janela & Painel ----
  { key: "window_index", insert: "#I", label: "Número da aba", category: "Janela & Painel", description: "Número da janela.", example: "1" },
  { key: "window_name", insert: "#W", label: "Nome da aba", category: "Janela & Painel", description: "Nome da janela.", example: "zsh" },
  { key: "window_flags", insert: "#F", label: "Marcadores da aba", category: "Janela & Painel", description: "Flags (*=atual, -=última, Z=zoom).", example: "*" },
  { key: "pane_current_path", insert: "#{pane_current_path}", label: "Pasta atual", category: "Janela & Painel", description: "Caminho do painel atual.", example: "~/Work" },
  { key: "pane_current_path_base", insert: "#{b:pane_current_path}", label: "Pasta atual (só o nome)", category: "Janela & Painel", description: "Só o nome da pasta atual (sem o caminho todo).", example: "Work" },
  { key: "pane_current_command", insert: "#{pane_current_command}", label: "Comando atual", category: "Janela & Painel", description: "Comando rodando no painel.", example: "nvim" },
  { key: "pane_index", insert: "#P", label: "Número do painel", category: "Janela & Painel", description: "Índice do painel dentro da janela.", example: "0" },
  { key: "pane_pid", insert: "#{pane_pid}", label: "PID do painel", category: "Janela & Painel", description: "ID do processo do shell do painel.", example: "48213" },
  { key: "pane_title", insert: "#T", label: "Título do painel", category: "Janela & Painel", description: "Título do painel.", example: "bash" },
  { key: "window_zoomed", insert: "#{?window_zoomed_flag,ZOOM,}", label: "Zoom?", category: "Janela & Painel", description: "Indica quando um painel está com zoom.", kind: "conditional", example: "ZOOM" },
  { key: "window_activity", insert: "#{?window_activity_flag,●,}", label: "Atividade na aba?", category: "Janela & Painel", description: "Marca ● quando houve atividade recente na janela.", kind: "conditional", example: "●" },
  { key: "window_bell", insert: "#{?window_bell_flag,🔔,}", label: "Sino/alerta na aba?", category: "Janela & Painel", description: "Marca quando a janela disparou um alerta (bell).", kind: "conditional", example: "🔔" },

  // ---- Host & Sistema ----
  { key: "host_short", insert: "#h", label: "Nome do computador", category: "Host & Sistema", description: "Hostname sem domínio.", example: "macbook" },
  { key: "host", insert: "#H", label: "Nome do computador (completo)", category: "Host & Sistema", description: "Hostname completo.", example: "macbook.local" },
  { key: "user", insert: "#(whoami)", label: "Usuário", category: "Host & Sistema", description: "Usuário atual (via whoami).", kind: "command", example: "user" },
  { key: "uptime", insert: "#(uptime | sed 's/.*up //; s/,.*//')", label: "Uptime", category: "Host & Sistema", description: "Tempo ligado (script).", kind: "command", example: "3 days" },
  { key: "load", insert: "#(uptime | sed 's/.*load average: //')", label: "Load average", category: "Host & Sistema", description: "Carga do sistema (script).", kind: "command", example: "1.20 1.10 0.90" },

  // ---- Data & Hora ----
  { key: "time_hm", insert: "%H:%M", label: "Relógio (hora:min)", category: "Data & Hora", description: "Hora no formato 24h.", kind: "text", example: "14:35" },
  { key: "time_hms", insert: "%H:%M:%S", label: "Relógio (com segundos)", category: "Data & Hora", description: "Hora com segundos.", kind: "text", example: "14:35:07" },
  { key: "date_dmy", insert: "%d/%m/%Y", label: "Data (DD/MM/AAAA)", category: "Data & Hora", description: "Data pt-BR.", kind: "text", example: "14/07/2026" },
  { key: "date_ymd", insert: "%Y-%m-%d", label: "Data (AAAA-MM-DD)", category: "Data & Hora", description: "Data ISO.", kind: "text", example: "2026-07-14" },
  { key: "time_12h", insert: "%I:%M %p", label: "Relógio (12h AM/PM)", category: "Data & Hora", description: "Hora no formato 12h com AM/PM.", kind: "text", example: "02:35 PM" },
  { key: "date_long", insert: "%d de %B", label: "Data por extenso", category: "Data & Hora", description: "Dia e mês por extenso.", kind: "text", example: "14 de julho" },
  { key: "weekday", insert: "%A", label: "Dia da semana", category: "Data & Hora", description: "Nome do dia.", kind: "text", example: "segunda" },
  { key: "weekday_short", insert: "%a", label: "Dia da semana (curto)", category: "Data & Hora", description: "Abreviação do dia.", kind: "text", example: "seg" },

  // ---- Git & Projeto ----
  { key: "git_branch", insert: "#(cd #{pane_current_path}; git rev-parse --abbrev-ref HEAD 2>/dev/null)", label: "Branch git", category: "Git & Projeto", description: "Branch atual do diretório do painel.", kind: "command", example: "main" },
  { key: "git_dirty", insert: "#(cd #{pane_current_path}; git status --porcelain 2>/dev/null | head -1 | sed 's/.*/±/')", label: "Git sujo?", category: "Git & Projeto", description: "Marca ± se há mudanças não commitadas.", kind: "command", example: "±" },

  // ---- Condicionais & Estado ----
  { key: "cond_generic", insert: "#{?condição,verdadeiro,falso}", label: "Condicional #{?...}", category: "Condicionais & Estado", description: "Bloco condicional do tmux — edite a condição e os dois valores.", kind: "conditional" },

  // ---- Texto & Separadores ----
  { key: "text", insert: " texto ", label: "Texto livre", category: "Texto & Separadores", description: "Texto literal (edite à vontade).", kind: "text", example: "texto" },
  { key: "space", insert: " ", label: "Espaço", category: "Texto & Separadores", description: "Um espaço.", kind: "text" },
  { key: "dot", insert: " · ", label: "Ponto médio (·)", category: "Texto & Separadores", description: "Separador visual.", kind: "text", example: "·" },
  { key: "pipe", insert: " | ", label: "Barra (|)", category: "Texto & Separadores", description: "Separador em barra.", kind: "text", example: "|" },
  { key: "pl_right", insert: "", label: "Powerline ", category: "Texto & Separadores", description: "Separador powerline à direita (Nerd Font).", kind: "text", example: "" },
  { key: "pl_left", insert: "", label: "Powerline ", category: "Texto & Separadores", description: "Separador powerline à esquerda (Nerd Font).", kind: "text", example: "" },
  { key: "pl_round_r", insert: "", label: "Powerline ", category: "Texto & Separadores", description: "Separador redondo à direita.", kind: "text", example: "" },
  { key: "pl_round_l", insert: "", label: "Powerline ", category: "Texto & Separadores", description: "Separador redondo à esquerda.", kind: "text", example: "" },

  // ---- Ícones (Nerd Font) — requer uma Nerd Font instalada no terminal ----
  { key: "ic_folder", insert: "", label: "Ícone: pasta", category: "Ícones (Nerd Font)", description: "Ícone de pasta (combina com 'Pasta atual').", kind: "text", example: "" },
  { key: "ic_git", insert: "", label: "Ícone: git", category: "Ícones (Nerd Font)", description: "Ícone do git (combina com 'Branch git').", kind: "text", example: "" },
  { key: "ic_branch", insert: "", label: "Ícone: branch", category: "Ícones (Nerd Font)", description: "Ícone de ramo/branch.", kind: "text", example: "" },
  { key: "ic_clock", insert: "", label: "Ícone: relógio", category: "Ícones (Nerd Font)", description: "Ícone de relógio (combina com o horário).", kind: "text", example: "" },
  { key: "ic_calendar", insert: "", label: "Ícone: calendário", category: "Ícones (Nerd Font)", description: "Ícone de calendário (combina com a data).", kind: "text", example: "" },
  { key: "ic_apple", insert: "", label: "Ícone: maçã (macOS)", category: "Ícones (Nerd Font)", description: "Logo da Apple.", kind: "text", example: "" },
  { key: "ic_linux", insert: "", label: "Ícone: Linux", category: "Ícones (Nerd Font)", description: "Pinguim do Linux.", kind: "text", example: "" },
  { key: "ic_host", insert: "", label: "Ícone: computador", category: "Ícones (Nerd Font)", description: "Ícone de computador/notebook.", kind: "text", example: "" },
  { key: "ic_server", insert: "", label: "Ícone: servidor", category: "Ícones (Nerd Font)", description: "Ícone de servidor.", kind: "text", example: "" },
  { key: "ic_user", insert: "", label: "Ícone: usuário", category: "Ícones (Nerd Font)", description: "Ícone de pessoa/usuário.", kind: "text", example: "" },
  { key: "ic_battery", insert: "", label: "Ícone: bateria", category: "Ícones (Nerd Font)", description: "Ícone de bateria (combina com o widget de bateria).", kind: "text", example: "" },
  { key: "ic_cpu", insert: "", label: "Ícone: CPU", category: "Ícones (Nerd Font)", description: "Ícone de processador.", kind: "text", example: "" },
  { key: "ic_bolt", insert: "", label: "Ícone: raio", category: "Ícones (Nerd Font)", description: "Ícone de raio/energia.", kind: "text", example: "" },
  { key: "ic_star", insert: "", label: "Ícone: estrela", category: "Ícones (Nerd Font)", description: "Estrela.", kind: "text", example: "" },
  { key: "ic_circle", insert: "", label: "Ícone: bolinha", category: "Ícones (Nerd Font)", description: "Bolinha cheia (bom para status).", kind: "text", example: "" },

  // ---- Widgets (scripts) ----
  { key: "battery", insert: "#(if command -v pmset >/dev/null 2>&1; then pmset -g batt | grep -Eo '[0-9]+%' | head -1; elif [ -r /sys/class/power_supply/BAT0/capacity ]; then echo \"$(cat /sys/class/power_supply/BAT0/capacity)%\"; fi)", label: "Bateria (%)", category: "Widgets (scripts)", description: "Percentual de bateria. Funciona em macOS (pmset) e Linux (/sys). Vazio em desktop sem bateria.", kind: "command", example: "82%" },
  { key: "cpu", insert: "#(ps -A -o %cpu | awk '{s+=$1} END {printf \"%.0f%%\", s}')", label: "CPU total", category: "Widgets (scripts)", description: "Uso de CPU somado (script).", kind: "command", example: "12%" },
  { key: "memory_mac", insert: "#(if command -v memory_pressure >/dev/null 2>&1; then memory_pressure | grep -Eo '[0-9]+%' | head -1; elif [ -r /proc/meminfo ]; then awk '/MemAvailable/{a=$2} /MemTotal/{t=$2} END{printf \"%.0f%%\", a/t*100}' /proc/meminfo; fi)", label: "Memória livre (%)", category: "Widgets (scripts)", description: "Percentual de memória disponível. macOS (memory_pressure) e Linux (/proc/meminfo).", kind: "command", example: "64%" },
  { key: "volume_mac", insert: "#(command -v osascript >/dev/null 2>&1 && osascript -e 'output volume of (get volume settings)')", label: "Volume do sistema (macOS)", category: "Widgets (scripts)", description: "Volume atual (só macOS — usa osascript). Em Linux, deixe vazio ou use um script próprio.", kind: "command", example: "50" },
  { key: "ip_local", insert: "#(if command -v ipconfig >/dev/null 2>&1; then ipconfig getifaddr en0 2>/dev/null; elif command -v hostname >/dev/null 2>&1; then hostname -I 2>/dev/null | awk '{print $1}'; fi)", label: "IP local", category: "Widgets (scripts)", description: "Endereço IP local. macOS (ipconfig en0) e Linux (hostname -I).", kind: "command", example: "192.168.0.10" },
  { key: "custom_script", insert: "#(/caminho/do/script.sh)", label: "Script custom #(...)", category: "Widgets (scripts)", description: "Chame qualquer script — a saída vira o conteúdo.", kind: "command" },

  // ---- Prontos ✨ (combos legais, colam e já funcionam) ----
  { key: "ready_clock", insert: " %H:%M", label: "Relógio com ícone", category: "Prontos ✨ (legais)", description: "Ícone de relógio + hora. Cole no status-right.", kind: "text", example: " 14:35" },
  { key: "ready_date_clock", insert: " %d/%m   %H:%M", label: "Data + hora com ícones", category: "Prontos ✨ (legais)", description: "Calendário + data e relógio + hora.", kind: "text", example: " 14/07   14:35" },
  { key: "ready_git", insert: "#(cd #{pane_current_path}; b=$(git rev-parse --abbrev-ref HEAD 2>/dev/null); [ -n \"$b\" ] && echo \"  $b\")", label: "Git: ícone + branch (só se tiver)", category: "Prontos ✨ (legais)", description: "Mostra  branch só quando a pasta é um repositório git.", kind: "command", example: " main" },
  { key: "ready_git_dirty", insert: "#(cd #{pane_current_path}; b=$(git rev-parse --abbrev-ref HEAD 2>/dev/null); [ -n \"$b\" ] && { d=$(git status --porcelain 2>/dev/null | head -1); echo \"  $b$([ -n \"$d\" ] && echo ' ')\"; })", label: "Git: branch + bolinha se sujo", category: "Prontos ✨ (legais)", description: "Branch com ● quando há mudanças não commitadas.", kind: "command", example: " main " },
  { key: "ready_battery_icon", insert: "#(p=$(if command -v pmset >/dev/null 2>&1; then pmset -g batt | grep -Eo '[0-9]+' | head -1; elif [ -r /sys/class/power_supply/BAT0/capacity ]; then cat /sys/class/power_supply/BAT0/capacity; fi); if [ -z \"$p\" ]; then echo ''; elif [ \"$p\" -ge 80 ]; then echo \"  $p%\"; elif [ \"$p\" -ge 40 ]; then echo \"  $p%\"; else echo \"  $p%\"; fi)", label: "Bateria: ícone muda com o nível", category: "Prontos ✨ (legais)", description: "Ícone de bateria cheia/média/vazia conforme a carga. macOS e Linux.", kind: "command", example: " 82%" },
  { key: "ready_battery_charging", insert: "#(p=$(if command -v pmset >/dev/null 2>&1; then pmset -g batt | grep -Eo '[0-9]+' | head -1; elif [ -r /sys/class/power_supply/BAT0/capacity ]; then cat /sys/class/power_supply/BAT0/capacity; fi); chg=$(if command -v pmset >/dev/null 2>&1; then pmset -g batt | grep -q 'AC Power' && echo 1; elif [ -r /sys/class/power_supply/AC/online ]; then [ \"$(cat /sys/class/power_supply/AC/online)\" = 1 ] && echo 1; fi); ic=$([ -n \"$chg\" ] && echo '' || echo ''); [ -n \"$p\" ] && echo \" $ic $p%\")", label: "Bateria: raio quando carregando", category: "Prontos ✨ (legais)", description: "Raio quando na tomada, senão bateria, + %. macOS e Linux.", kind: "command", example: " 82%" },
  { key: "ready_spotify", insert: " #(osascript -e 'tell application \"Spotify\" to if it is running then (get name of current track) & \" — \" & (get artist of current track)' 2>/dev/null)", label: "Spotify: tocando agora (macOS)", category: "Prontos ✨ (legais)", description: "Nome e artista da música tocando no Spotify. Vazio se fechado.", kind: "command", example: " Song — Artist" },
  { key: "ready_weather", insert: "#(curl -s 'wttr.in/?format=%t' 2>/dev/null)", label: "Clima (temperatura, wttr.in)", category: "Prontos ✨ (legais)", description: "Temperatura atual pela sua localização (via wttr.in — precisa de internet). Use refresh ~300s.", kind: "command", example: "+21°C" },
  { key: "ready_weather_full", insert: "#(curl -s 'wttr.in/?format=%c+%t' 2>/dev/null)", label: "Clima (ícone + temperatura)", category: "Prontos ✨ (legais)", description: "Condição + temperatura (wttr.in). Ex.: ☀️ +21°C.", kind: "command", example: "☀️ +21°C" },
  { key: "ready_docker", insert: "#( c=$(docker ps -q 2>/dev/null | wc -l | tr -d ' '); [ \"$c\" -gt 0 ] && echo \"  $c\")", label: "Docker: nº de containers rodando", category: "Prontos ✨ (legais)", description: "Ícone Docker + quantos containers ativos (some se zero).", kind: "command", example: " 3" },
  { key: "ready_cpu_icon", insert: " #(ps -A -o %cpu | awk '{s+=$1} END {printf \"%.0f%%\", s}')", label: "CPU com ícone", category: "Prontos ✨ (legais)", description: "Ícone de processador + uso total de CPU.", kind: "command", example: " 12%" },
  { key: "ready_net", insert: "#(ip=$(if command -v ipconfig >/dev/null 2>&1; then ipconfig getifaddr en0 2>/dev/null; else hostname -I 2>/dev/null | awk '{print $1}'; fi); [ -n \"$ip\" ] && echo \" $ip\")", label: "IP local com ícone", category: "Prontos ✨ (legais)", description: "Ícone de rede + IP local. macOS ou Linux. Some se não achar.", kind: "command", example: " 192.168.0.10" },
  { key: "ready_prefix", insert: "#{?client_prefix,#[bg=#fbbf24#,fg=#15161A#,bold] PREFIX #[default],}", label: "Aviso de PREFIX ativo (colorido)", category: "Prontos ✨ (legais)", description: "Mostra um selo amarelo 'PREFIX' quando você aperta o prefixo (C-b).", kind: "conditional", example: " PREFIX " },

  // ---- Dev: Claude Code & Ghostty 󰚩 (funciona no seu setup: tmux + Claude Code + tmux-agent-indicator) ----
  { key: "cc_agent_tab", insert: "#(b=\"\"; for p in $(tmux list-panes -t \"#{window_index}\" -F \"##{pane_id}\" 2>/dev/null); do s=$(tmux show-environment -g \"TMUX_AGENT_PANE_${p}_STATE\" 2>/dev/null | cut -d= -f2); if [ \"$s\" = needs-input ] || [ \"$s\" = needs_input ]; then b=n; elif [ \"$s\" = running ] && [ \"$b\" != n ]; then b=r; fi; done; [ \"$b\" = r ] && printf \" \"; [ \"$b\" = n ] && printf \" \")", label: "Ícone do agente NA ABA (varre a janela)", category: "Dev: Claude Code & Ghostty 󰚩", description: "Para as abas: mostra  (trabalhando) ou  (precisa de você) se QUALQUER painel da janela tem Claude ativo (varre todos os panes). Some SEM deixar espaço quando não há agente. Cole em 'abas (outras)' e 'aba atual'.", kind: "command", example: "" },
  { key: "cc_running_here", insert: "#{?#{m:*claude*,#{pane_current_command}}},󰚩,}", label: "Ícone 󰚩 se Claude roda neste painel", category: "Dev: Claude Code & Ghostty 󰚩", description: "Mostra só 󰚩 quando o painel atual é o Claude Code (nada se não for).", kind: "conditional", example: "󰚩" },
  { key: "cc_agent_state", insert: "#(tmux show-environment -g \"TMUX_AGENT_PANE_#{pane_id}_STATE\" 2>/dev/null | cut -d= -f2)", label: "Estado do agente neste painel", category: "Dev: Claude Code & Ghostty 󰚩", description: "running / needs-input / done — lido do tmux-agent-indicator para o painel atual.", kind: "command", example: "running" },
  { key: "cc_agent_badge", insert: "#(s=$(tmux show-environment -g \"TMUX_AGENT_PANE_#{pane_id}_STATE\" 2>/dev/null | cut -d= -f2); if [ \"$s\" = running ]; then printf \"\"; elif [ \"$s\" = needs-input ] || [ \"$s\" = needs_input ]; then printf \"\"; elif [ -n \"$s\" ]; then printf \"\"; fi)", label: "Ícone do agente (só ícone)", category: "Dev: Claude Code & Ghostty 󰚩", description: "Só o ícone conforme o estado do Claude Code (Nerd Font):  trabalhando ·  precisa de você ·  pronto.", kind: "command", example: "" },
  { key: "cc_agent_count", insert: "#(tmux show-environment -g 2>/dev/null | grep -c '_STATE=running')", label: "Nº de agentes Claude ativos (todas as abas)", category: "Dev: Claude Code & Ghostty 󰚩", description: "Quantos painéis têm um agente Claude Code trabalhando agora.", kind: "command", example: "3" },
  { key: "cc_version", insert: "󰚩 #(command -v claude >/dev/null 2>&1 && claude --version 2>/dev/null | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+')", label: "Versão do Claude Code", category: "Dev: Claude Code & Ghostty 󰚩", description: "Ícone + versão do Claude Code CLI instalado.", kind: "command", example: "󰚩 2.1.210" },
  { key: "cc_any_working", insert: "#(n=$(tmux show-environment -g 2>/dev/null | grep -c '_STATE=running'); [ \"$n\" -gt 0 ] && echo \"󰚩$n\")", label: "󰚩N agentes ativos (só ícone+nº)", category: "Dev: Claude Code & Ghostty 󰚩", description: "Some se não há agente; senão 󰚩 + quantos rodando (ex.: 󰚩3).", kind: "command", example: "󰚩3" },
  { key: "term_program", insert: "#{client_termname}", label: "Terminal em uso (termname)", category: "Dev: Claude Code & Ghostty 󰚩", description: "Nome do terminal do cliente (ex.: xterm-ghostty / tmux-256color).", kind: "format", example: "xterm-ghostty" },
  { key: "ghostty_version", insert: "👻 #(command -v ghostty >/dev/null 2>&1 && ghostty --version 2>/dev/null | head -1 | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+')", label: "Versão do Ghostty", category: "Dev: Claude Code & Ghostty 󰚩", description: "Ícone + versão do Ghostty (precisa do binário ghostty no PATH).", kind: "command", example: "👻 1.3.1" },
];

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  "Sessão & Cliente",
  "Janela & Painel",
  "Host & Sistema",
  "Data & Hora",
  "Git & Projeto",
  "Condicionais & Estado",
  "Texto & Separadores",
  "Ícones (Nerd Font)",
  "Widgets (scripts)",
  "Prontos ✨ (legais)",
  "Dev: Claude Code & Ghostty 󰚩",
];

export function catalogByKey(key: string): CatalogItem | undefined {
  return CATALOG.find((c) => c.key === key);
}

/** Descobre qual item do catálogo corresponde a um conteúdo cru (ex.: "#h" → host_short). */
export function catalogByInsert(content: string): CatalogItem | undefined {
  const c = content.trim();
  return CATALOG.find((item) => item.insert.trim() === c);
}

/** Itens do catálogo agrupados por categoria, na ordem de CATALOG_CATEGORIES. */
export function catalogGrouped(): { category: CatalogCategory; items: CatalogItem[] }[] {
  return CATALOG_CATEGORIES.map((category) => ({
    category,
    items: CATALOG.filter((c) => c.category === category),
  })).filter((g) => g.items.length > 0);
}
