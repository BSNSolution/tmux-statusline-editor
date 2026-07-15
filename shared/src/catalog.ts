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
  | "Session & Client"
  | "Window & Pane"
  | "Host & System"
  | "Date & Time"
  | "Git & Project"
  | "Conditionals & State"
  | "Text & Separators"
  | "Icons (Nerd Font)"
  | "Widgets (scripts)"
  | "Ready-made ✨ (cool)"
  | "Dev: Claude Code & Ghostty 󰚩";

export const CATALOG: CatalogItem[] = [
  // ---- Sessão & Cliente ----
  { key: "session_name", insert: "#S", label: "Session name", category: "Session & Client", description: "Current session name.", example: "main" },
  { key: "session_id", insert: "#{session_id}", label: "Session ID", category: "Session & Client", description: "Unique session identifier.", example: "$0" },
  { key: "session_windows", insert: "#{session_windows}", label: "Window count", category: "Session & Client", description: "Number of windows in the session.", example: "3" },
  { key: "session_attached", insert: "#{session_attached}", label: "Attached clients", category: "Session & Client", description: "How many clients are attached to this session.", example: "1" },
  { key: "client_prefix", insert: "#{?client_prefix,PREFIXO,}", label: "Prefix active?", category: "Session & Client", description: "Shows something when the prefix (C-b) is active.", kind: "conditional", example: "PREFIXO" },
  { key: "client_key_table", insert: "#{client_key_table}", label: "Key table", category: "Session & Client", description: "Active key table (root/prefix/copy-mode).", example: "root" },

  // ---- Janela & Painel ----
  { key: "window_index", insert: "#I", label: "Tab number", category: "Window & Pane", description: "Window number.", example: "1" },
  { key: "window_name", insert: "#W", label: "Tab name", category: "Window & Pane", description: "Window name.", example: "zsh" },
  { key: "window_flags", insert: "#F", label: "Tab flags", category: "Window & Pane", description: "Flags (*=current, -=last, Z=zoom).", example: "*" },
  { key: "pane_current_path", insert: "#{pane_current_path}", label: "Current folder", category: "Window & Pane", description: "Path of the current pane.", example: "~/Work" },
  { key: "pane_current_path_base", insert: "#{b:pane_current_path}", label: "Current folder (name only)", category: "Window & Pane", description: "Just the current folder name (without the full path).", example: "Work" },
  { key: "pane_current_command", insert: "#{pane_current_command}", label: "Current command", category: "Window & Pane", description: "Command running in the pane.", example: "nvim" },
  { key: "pane_index", insert: "#P", label: "Pane number", category: "Window & Pane", description: "Pane index within the window.", example: "0" },
  { key: "pane_pid", insert: "#{pane_pid}", label: "Pane PID", category: "Window & Pane", description: "Process ID of the pane's shell.", example: "48213" },
  { key: "pane_title", insert: "#T", label: "Pane title", category: "Window & Pane", description: "Pane title.", example: "bash" },
  { key: "window_zoomed", insert: "#{?window_zoomed_flag,ZOOM,}", label: "Zoomed?", category: "Window & Pane", description: "Indicates when a pane is zoomed.", kind: "conditional", example: "ZOOM" },
  { key: "window_activity", insert: "#{?window_activity_flag,●,}", label: "Tab activity?", category: "Window & Pane", description: "Marks ● when there was recent activity in the window.", kind: "conditional", example: "●" },
  { key: "window_bell", insert: "#{?window_bell_flag,🔔,}", label: "Tab bell/alert?", category: "Window & Pane", description: "Marks when the window fired an alert (bell).", kind: "conditional", example: "🔔" },

  // ---- Host & Sistema ----
  { key: "host_short", insert: "#h", label: "Computer name", category: "Host & System", description: "Hostname without domain.", example: "macbook" },
  { key: "host", insert: "#H", label: "Computer name (full)", category: "Host & System", description: "Full hostname.", example: "macbook.local" },
  { key: "user", insert: "#(whoami)", label: "User", category: "Host & System", description: "Current user (via whoami).", kind: "command", example: "user" },
  { key: "uptime", insert: "#(uptime | sed 's/.*up //; s/,.*//')", label: "Uptime", category: "Host & System", description: "Time powered on (script).", kind: "command", example: "3 days" },
  { key: "load", insert: "#(uptime | sed 's/.*load average: //')", label: "Load average", category: "Host & System", description: "System load (script).", kind: "command", example: "1.20 1.10 0.90" },

  // ---- Data & Hora ----
  { key: "time_hm", insert: "%H:%M", label: "Clock (hour:min)", category: "Date & Time", description: "Time in 24h format.", kind: "text", example: "14:35" },
  { key: "time_hms", insert: "%H:%M:%S", label: "Clock (with seconds)", category: "Date & Time", description: "Time with seconds.", kind: "text", example: "14:35:07" },
  { key: "date_dmy", insert: "%d/%m/%Y", label: "Date (DD/MM/YYYY)", category: "Date & Time", description: "Day-first date.", kind: "text", example: "14/07/2026" },
  { key: "date_ymd", insert: "%Y-%m-%d", label: "Date (YYYY-MM-DD)", category: "Date & Time", description: "ISO date.", kind: "text", example: "2026-07-14" },
  { key: "time_12h", insert: "%I:%M %p", label: "Clock (12h AM/PM)", category: "Date & Time", description: "Time in 12h format with AM/PM.", kind: "text", example: "02:35 PM" },
  { key: "date_long", insert: "%d de %B", label: "Long date", category: "Date & Time", description: "Day and month spelled out.", kind: "text", example: "14 de julho" },
  { key: "weekday", insert: "%A", label: "Weekday", category: "Date & Time", description: "Day name.", kind: "text", example: "segunda" },
  { key: "weekday_short", insert: "%a", label: "Weekday (short)", category: "Date & Time", description: "Day abbreviation.", kind: "text", example: "seg" },

  // ---- Git & Projeto ----
  { key: "git_branch", insert: "#(cd #{pane_current_path}; git rev-parse --abbrev-ref HEAD 2>/dev/null)", label: "git branch", category: "Git & Project", description: "Current branch of the pane's directory.", kind: "command", example: "main" },
  { key: "git_dirty", insert: "#(cd #{pane_current_path}; git status --porcelain 2>/dev/null | head -1 | sed 's/.*/±/')", label: "git dirty?", category: "Git & Project", description: "Marks ± if there are uncommitted changes.", kind: "command", example: "±" },

  // ---- Condicionais & Estado ----
  { key: "cond_generic", insert: "#{?condição,verdadeiro,falso}", label: "Conditional #{?...}", category: "Conditionals & State", description: "tmux conditional block — edit the condition and the two values.", kind: "conditional" },

  // ---- Texto & Separadores ----
  { key: "text", insert: " texto ", label: "Free text", category: "Text & Separators", description: "Literal text (edit freely).", kind: "text", example: "texto" },
  { key: "space", insert: " ", label: "Space", category: "Text & Separators", description: "A space.", kind: "text" },
  { key: "dot", insert: " · ", label: "Middle dot (·)", category: "Text & Separators", description: "Visual separator.", kind: "text", example: "·" },
  { key: "pipe", insert: " | ", label: "Pipe (|)", category: "Text & Separators", description: "Pipe separator.", kind: "text", example: "|" },
  { key: "pl_right", insert: "", label: "Powerline ", category: "Text & Separators", description: "Right powerline separator (Nerd Font).", kind: "text", example: "" },
  { key: "pl_left", insert: "", label: "Powerline ", category: "Text & Separators", description: "Left powerline separator (Nerd Font).", kind: "text", example: "" },
  { key: "pl_round_r", insert: "", label: "Powerline ", category: "Text & Separators", description: "Round separator on the right.", kind: "text", example: "" },
  { key: "pl_round_l", insert: "", label: "Powerline ", category: "Text & Separators", description: "Round separator on the left.", kind: "text", example: "" },

  // ---- Ícones (Nerd Font) — requer uma Nerd Font instalada no terminal ----
  { key: "ic_folder", insert: "", label: "Icon: folder", category: "Icons (Nerd Font)", description: "Folder icon (pairs with 'Current folder').", kind: "text", example: "" },
  { key: "ic_git", insert: "", label: "Icon: git", category: "Icons (Nerd Font)", description: "git icon (pairs with 'git branch').", kind: "text", example: "" },
  { key: "ic_branch", insert: "", label: "Icon: branch", category: "Icons (Nerd Font)", description: "Branch icon.", kind: "text", example: "" },
  { key: "ic_clock", insert: "", label: "Icon: clock", category: "Icons (Nerd Font)", description: "Clock icon (pairs with the time).", kind: "text", example: "" },
  { key: "ic_calendar", insert: "", label: "Icon: calendar", category: "Icons (Nerd Font)", description: "Calendar icon (pairs with the date).", kind: "text", example: "" },
  { key: "ic_apple", insert: "", label: "Icon: apple (macOS)", category: "Icons (Nerd Font)", description: "Apple logo.", kind: "text", example: "" },
  { key: "ic_linux", insert: "", label: "Icon: Linux", category: "Icons (Nerd Font)", description: "Linux penguin.", kind: "text", example: "" },
  { key: "ic_host", insert: "", label: "Icon: computer", category: "Icons (Nerd Font)", description: "Computer/laptop icon.", kind: "text", example: "" },
  { key: "ic_server", insert: "", label: "Icon: server", category: "Icons (Nerd Font)", description: "Server icon.", kind: "text", example: "" },
  { key: "ic_user", insert: "", label: "Icon: user", category: "Icons (Nerd Font)", description: "Person/user icon.", kind: "text", example: "" },
  { key: "ic_battery", insert: "", label: "Icon: battery", category: "Icons (Nerd Font)", description: "Battery icon (pairs with the battery widget).", kind: "text", example: "" },
  { key: "ic_cpu", insert: "", label: "Icon: CPU", category: "Icons (Nerd Font)", description: "Processor icon.", kind: "text", example: "" },
  { key: "ic_bolt", insert: "", label: "Icon: bolt", category: "Icons (Nerd Font)", description: "Bolt/power icon.", kind: "text", example: "" },
  { key: "ic_star", insert: "", label: "Icon: star", category: "Icons (Nerd Font)", description: "Star.", kind: "text", example: "" },
  { key: "ic_circle", insert: "", label: "Icon: dot", category: "Icons (Nerd Font)", description: "Filled dot (good for status).", kind: "text", example: "" },

  // ---- Widgets (scripts) ----
  { key: "battery", insert: "#(if command -v pmset >/dev/null 2>&1; then pmset -g batt | grep -Eo '[0-9]+%' | head -1; elif [ -r /sys/class/power_supply/BAT0/capacity ]; then echo \"$(cat /sys/class/power_supply/BAT0/capacity)%\"; fi)", label: "Battery (%)", category: "Widgets (scripts)", description: "Battery percentage. Works on macOS (pmset) and Linux (/sys). Empty on desktops without a battery.", kind: "command", example: "82%" },
  { key: "cpu", insert: "#(ps -A -o %cpu | awk '{s+=$1} END {printf \"%.0f%%\", s}')", label: "Total CPU", category: "Widgets (scripts)", description: "Combined CPU usage (script).", kind: "command", example: "12%" },
  { key: "memory_mac", insert: "#(if command -v memory_pressure >/dev/null 2>&1; then memory_pressure | grep -Eo '[0-9]+%' | head -1; elif [ -r /proc/meminfo ]; then awk '/MemAvailable/{a=$2} /MemTotal/{t=$2} END{printf \"%.0f%%\", a/t*100}' /proc/meminfo; fi)", label: "Free memory (%)", category: "Widgets (scripts)", description: "Available memory percentage. macOS (memory_pressure) and Linux (/proc/meminfo).", kind: "command", example: "64%" },
  { key: "volume_mac", insert: "#(command -v osascript >/dev/null 2>&1 && osascript -e 'output volume of (get volume settings)')", label: "System volume (macOS)", category: "Widgets (scripts)", description: "Current volume (macOS only — uses osascript). On Linux, leave empty or use your own script.", kind: "command", example: "50" },
  { key: "ip_local", insert: "#(if command -v ipconfig >/dev/null 2>&1; then ipconfig getifaddr en0 2>/dev/null; elif command -v hostname >/dev/null 2>&1; then hostname -I 2>/dev/null | awk '{print $1}'; fi)", label: "Local IP", category: "Widgets (scripts)", description: "Local IP address. macOS (ipconfig en0) and Linux (hostname -I).", kind: "command", example: "192.168.0.10" },
  { key: "custom_script", insert: "#(/caminho/do/script.sh)", label: "Custom script #(...)", category: "Widgets (scripts)", description: "Call any script — its output becomes the content.", kind: "command" },

  // ---- Prontos ✨ (combos legais, colam e já funcionam) ----
  { key: "ready_clock", insert: " %H:%M", label: "Clock with icon", category: "Ready-made ✨ (cool)", description: "Clock icon + time. Paste into status-right.", kind: "text", example: " 14:35" },
  { key: "ready_date_clock", insert: " %d/%m   %H:%M", label: "Date + time with icons", category: "Ready-made ✨ (cool)", description: "Calendar + date and clock + time.", kind: "text", example: " 14/07   14:35" },
  { key: "ready_git", insert: "#(cd #{pane_current_path}; b=$(git rev-parse --abbrev-ref HEAD 2>/dev/null); [ -n \"$b\" ] && echo \"  $b\")", label: "Git: icon + branch (only if present)", category: "Ready-made ✨ (cool)", description: "Shows  branch only when the folder is a git repository.", kind: "command", example: " main" },
  { key: "ready_git_dirty", insert: "#(cd #{pane_current_path}; b=$(git rev-parse --abbrev-ref HEAD 2>/dev/null); [ -n \"$b\" ] && { d=$(git status --porcelain 2>/dev/null | head -1); echo \"  $b$([ -n \"$d\" ] && echo ' ')\"; })", label: "Git: branch + dot if dirty", category: "Ready-made ✨ (cool)", description: "Branch with ● when there are uncommitted changes.", kind: "command", example: " main " },
  { key: "ready_battery_icon", insert: "#(p=$(if command -v pmset >/dev/null 2>&1; then pmset -g batt | grep -Eo '[0-9]+' | head -1; elif [ -r /sys/class/power_supply/BAT0/capacity ]; then cat /sys/class/power_supply/BAT0/capacity; fi); if [ -z \"$p\" ]; then echo ''; elif [ \"$p\" -ge 80 ]; then echo \"  $p%\"; elif [ \"$p\" -ge 40 ]; then echo \"  $p%\"; else echo \"  $p%\"; fi)", label: "Battery: icon changes with level", category: "Ready-made ✨ (cool)", description: "Full/medium/empty battery icon based on charge. macOS and Linux.", kind: "command", example: " 82%" },
  { key: "ready_battery_charging", insert: "#(p=$(if command -v pmset >/dev/null 2>&1; then pmset -g batt | grep -Eo '[0-9]+' | head -1; elif [ -r /sys/class/power_supply/BAT0/capacity ]; then cat /sys/class/power_supply/BAT0/capacity; fi); chg=$(if command -v pmset >/dev/null 2>&1; then pmset -g batt | grep -q 'AC Power' && echo 1; elif [ -r /sys/class/power_supply/AC/online ]; then [ \"$(cat /sys/class/power_supply/AC/online)\" = 1 ] && echo 1; fi); ic=$([ -n \"$chg\" ] && echo '' || echo ''); [ -n \"$p\" ] && echo \" $ic $p%\")", label: "Battery: bolt when charging", category: "Ready-made ✨ (cool)", description: "Bolt when plugged in, otherwise battery, + %. macOS and Linux.", kind: "command", example: " 82%" },
  { key: "ready_spotify", insert: " #(osascript -e 'tell application \"Spotify\" to if it is running then (get name of current track) & \" — \" & (get artist of current track)' 2>/dev/null)", label: "Spotify: now playing (macOS)", category: "Ready-made ✨ (cool)", description: "Track and artist playing in Spotify. Empty if closed.", kind: "command", example: " Song — Artist" },
  { key: "ready_weather", insert: "#(curl -s 'wttr.in/?format=%t' 2>/dev/null)", label: "Weather (temperature, wttr.in)", category: "Ready-made ✨ (cool)", description: "Current temperature for your location (via wttr.in — needs internet). Use refresh ~300s.", kind: "command", example: "+21°C" },
  { key: "ready_weather_full", insert: "#(curl -s 'wttr.in/?format=%c+%t' 2>/dev/null)", label: "Weather (icon + temperature)", category: "Ready-made ✨ (cool)", description: "Condition + temperature (wttr.in). E.g. ☀️ +21°C.", kind: "command", example: "☀️ +21°C" },
  { key: "ready_docker", insert: "#( c=$(docker ps -q 2>/dev/null | wc -l | tr -d ' '); [ \"$c\" -gt 0 ] && echo \"  $c\")", label: "Docker: running container count", category: "Ready-made ✨ (cool)", description: "Docker icon + how many containers are active (hidden if zero).", kind: "command", example: " 3" },
  { key: "ready_cpu_icon", insert: " #(ps -A -o %cpu | awk '{s+=$1} END {printf \"%.0f%%\", s}')", label: "CPU with icon", category: "Ready-made ✨ (cool)", description: "Processor icon + total CPU usage.", kind: "command", example: " 12%" },
  { key: "ready_net", insert: "#(ip=$(if command -v ipconfig >/dev/null 2>&1; then ipconfig getifaddr en0 2>/dev/null; else hostname -I 2>/dev/null | awk '{print $1}'; fi); [ -n \"$ip\" ] && echo \" $ip\")", label: "Local IP with icon", category: "Ready-made ✨ (cool)", description: "Network icon + local IP. macOS or Linux. Hidden if not found.", kind: "command", example: " 192.168.0.10" },
  { key: "ready_prefix", insert: "#{?client_prefix,#[bg=#fbbf24#,fg=#15161A#,bold] PREFIX #[default],}", label: "PREFIX active warning (colored)", category: "Ready-made ✨ (cool)", description: "Shows a yellow 'PREFIX' badge when you press the prefix (C-b).", kind: "conditional", example: " PREFIX " },

  // ---- Dev: Claude Code & Ghostty 󰚩 (funciona no seu setup: tmux + Claude Code + tmux-agent-indicator) ----
  { key: "cc_agent_tab", insert: "#(b=\"\"; for p in $(tmux list-panes -t \"#{window_index}\" -F \"##{pane_id}\" 2>/dev/null); do s=$(tmux show-environment -g \"TMUX_AGENT_PANE_${p}_STATE\" 2>/dev/null | cut -d= -f2); if [ \"$s\" = needs-input ] || [ \"$s\" = needs_input ]; then b=n; elif [ \"$s\" = running ] && [ \"$b\" != n ]; then b=r; fi; done; [ \"$b\" = r ] && printf \" \"; [ \"$b\" = n ] && printf \" \")", label: "Agent icon ON THE TAB (scans the window)", category: "Dev: Claude Code & Ghostty 󰚩", description: "For tabs: shows  (working) or  (needs you) if ANY pane in the window has an active Claude (scans all panes). Disappears WITHOUT leaving a gap when there's no agent. Paste into 'tabs (others)' and 'current tab'.", kind: "command", example: "" },
  { key: "cc_running_here", insert: "#{?#{m:*claude*,#{pane_current_command}}},󰚩,}", label: "󰚩 icon if Claude runs in this pane", category: "Dev: Claude Code & Ghostty 󰚩", description: "Shows 󰚩 only when the current pane is Claude Code (nothing otherwise).", kind: "conditional", example: "󰚩" },
  { key: "cc_agent_state", insert: "#(tmux show-environment -g \"TMUX_AGENT_PANE_#{pane_id}_STATE\" 2>/dev/null | cut -d= -f2)", label: "Agent state in this pane", category: "Dev: Claude Code & Ghostty 󰚩", description: "running / needs-input / done — read from tmux-agent-indicator for the current pane.", kind: "command", example: "running" },
  { key: "cc_agent_badge", insert: "#(s=$(tmux show-environment -g \"TMUX_AGENT_PANE_#{pane_id}_STATE\" 2>/dev/null | cut -d= -f2); if [ \"$s\" = running ]; then printf \"\"; elif [ \"$s\" = needs-input ] || [ \"$s\" = needs_input ]; then printf \"\"; elif [ -n \"$s\" ]; then printf \"\"; fi)", label: "Agent icon (icon only)", category: "Dev: Claude Code & Ghostty 󰚩", description: "Just the icon based on Claude Code's state (Nerd Font):  working ·  needs you ·  ready.", kind: "command", example: "" },
  { key: "cc_agent_count", insert: "#(tmux show-environment -g 2>/dev/null | grep -c '_STATE=running')", label: "Active Claude agents (all tabs)", category: "Dev: Claude Code & Ghostty 󰚩", description: "How many panes have a Claude Code agent working right now.", kind: "command", example: "3" },
  { key: "cc_version", insert: "󰚩 #(command -v claude >/dev/null 2>&1 && claude --version 2>/dev/null | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+')", label: "Claude Code version", category: "Dev: Claude Code & Ghostty 󰚩", description: "Icon + version of the installed Claude Code CLI.", kind: "command", example: "󰚩 2.1.210" },
  { key: "cc_any_working", insert: "#(n=$(tmux show-environment -g 2>/dev/null | grep -c '_STATE=running'); [ \"$n\" -gt 0 ] && echo \"󰚩$n\")", label: "󰚩N active agents (icon+count only)", category: "Dev: Claude Code & Ghostty 󰚩", description: "Hidden if no agent; otherwise 󰚩 + how many running (e.g. 󰚩3).", kind: "command", example: "󰚩3" },
  { key: "term_program", insert: "#{client_termname}", label: "Terminal in use (termname)", category: "Dev: Claude Code & Ghostty 󰚩", description: "Client terminal name (e.g. xterm-ghostty / tmux-256color).", kind: "format", example: "xterm-ghostty" },
  { key: "ghostty_version", insert: "👻 #(command -v ghostty >/dev/null 2>&1 && ghostty --version 2>/dev/null | head -1 | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+')", label: "Ghostty version", category: "Dev: Claude Code & Ghostty 󰚩", description: "Icon + Ghostty version (needs the ghostty binary in PATH).", kind: "command", example: "👻 1.3.1" },
];

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  "Session & Client",
  "Window & Pane",
  "Host & System",
  "Date & Time",
  "Git & Project",
  "Conditionals & State",
  "Text & Separators",
  "Icons (Nerd Font)",
  "Widgets (scripts)",
  "Ready-made ✨ (cool)",
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

// ---- i18n do catálogo: label/descrição/categoria no idioma ativo (inglês é o default) ----
import { getLang } from "./i18n.js";
import { CATALOG_PT, CATEGORY_PT } from "./catalog-i18n.js";

/** Label do item no idioma ativo (fallback: inglês do próprio catálogo). */
export function itemLabel(item: CatalogItem): string {
  if (getLang() === "pt") return CATALOG_PT[item.key]?.label ?? item.label;
  return item.label;
}
/** Descrição do item no idioma ativo. */
export function itemDescription(item: CatalogItem): string {
  if (getLang() === "pt") return CATALOG_PT[item.key]?.description ?? item.description;
  return item.description;
}
/** Nome da categoria (o catálogo guarda em inglês) traduzido para o idioma ativo. */
export function categoryLabel(category: string): string {
  if (getLang() === "pt") return CATEGORY_PT[category] ?? category;
  return category;
}
