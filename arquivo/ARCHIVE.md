# Smart Timer Pro — Arquivo Completo do Projeto

**Autor:** Nelson Teixeira — **smartchoice**
**Repositório:** https://github.com/sharillas/Smart-Timer-Pro
**Licença:** Software proprietário (ver `LICENSE`)

---

## 1. Visão Geral

O **Smart Timer Pro** é um software de temporizador de palco/eventos para Windows, desenvolvido para a
**smartchoice**. Nasceu da adaptação do projeto open-source `stage-timer-pro` (desenhado para Raspberry Pi)
para uma aplicação desktop Windows instalável (`.exe`), construída com **Electron + Node.js**.

### Objetivos originais
- Criar um temporizador profissional instalável no Windows (`.exe`)
- Dedicado à empresa **smartchoice**
- Personalizável antes de compilar
- Sem dependências no PC de destino (tudo empacotado no instalador)

### Stack tecnológica
| Camada | Tecnologia |
|---|---|
| Desktop Shell | Electron 28 |
| Backend | Node.js + Express (porta 3000) |
| Tempo real | Socket.IO |
| Frontend | HTML/CSS/JS vanilla |
| Instalador | electron-builder (NSIS) |
| Integração | Bitfocus Companion / Stream Deck |

---

## 2. Histórico de Versões (Resumo Completo)

### v1.0.0 — Lançamento Inicial
- Countdown / Count-Up com presets (00:00, 1m, 5m, 10m, 15m, 30m, 60m, 2h)
- Modo Time of Day (relógio HH:MM:SS)
- Modo Idle/Logo com upload de imagem
- Janela de apresentação fullscreen para monitor externo/projetor
- Janela de fallback quando não há monitor externo
- Sistema de mensagens com disparo instantâneo
- Banco de mensagens rápidas (máx. 5) com adicionar/editar/remover
- Audio cues (sons de fim e aviso) com upload de ficheiros
- Settings: fonte, cores, thresholds, HH/SS toggles
- Stop at Zero (pausa automática no 00:00 no countdown)
- Endpoint `/api/companion` para Stream Deck
- PWA-ready (interface responsive)
- Branding smartchoice

### v1.1.0 — Versionamento + Módulo Companion
- Script de auto-incremento de versão (`npm run build` → bump + build)
- Módulo Bitfocus Companion com branding e presets

### v1.2.0 — Correções e Presets
- **Logo Fit Mode**: Fit (contain) / Fill (cover) / Stretch (fill)
- **Correção de bug**: os modos de exibição já não resetam/perdem o tempo do timer
  (countdown e count-up passaram a ter valores independentes — `timeLeft` e `countupTime`)
- **Custom Quick Presets**: adicionar presets em HH:MM:SS (ex: 00:33:15 → "33m15s")

### Renomeação — "Smart Timer Pro"
- Nome do software alterado de "SmartCountdownTimer Pro" para "Smart Timer Pro"
- Repositório renomeado: `SmartCountdownTimer-Pro` → `Smart-Timer-Pro`
- Footer com copyright dinâmico (versão lida do `package.json`)
- Botão START → "GO"; divs renomeadas ("Custom Quick Presets", "Controls")

### v1.3.0 — Status Indicators
- **Loading Bar**: barra de progresso com posição (X/Y) e tamanho independentes
- **Semáforo**: indicador de 3 lâmpadas (verde/âmbar/vermelho) com glow
- Botão de indicador ON/OFF nos Controls
- Posição (X/Y) e tamanho do timer ajustáveis
- Botões Loading Bar ON/OFF e Semáforo ON/OFF no módulo Companion

### v1.4.0 — Personalização Avançada
- **Quick presets default editáveis** (HH:MM:SS)
- **Botões independentes** Loading Bar / Semáforo (mutuamente exclusivos)
- **Dropdown de fontes** (Courier New, Arial, Orbitron, etc. + Custom)
- **Janela transparente** borderless/always-on-top (overlay sobre PowerPoint)
- **Tema cinza/azul** com títulos em branco (+2px)
- **Ícone moderno "STM"** (cinza/azul)
- **Cor de fundo** (color picker) + modo transparente unificado (bgMode)
- **Test pattern** por defeito no modo "Show Logo/Grid"
- Botão "Idle / Logo" → "Show Logo/Grid"
- Screenshots atualizadas no README

---

## 3. Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                 │
│  ┌──────────────┐              ┌──────────────────────┐ │
│  │ Moderator     │              │ Presenter Window     │ │
│  │ Window        │              │ (external display)   │ │
│  └──────┬───────┘              └──────────┬───────────┘ │
│         └──────────┬──────────────────────┘              │
│           http://127.0.0.1:3000                         │
│  ┌─────────────────▼──────────────────────────────────┐ │
│  │              Express + Socket.IO Server             │ │
│  │  REST API + Socket.IO events + Static files         │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Ficheiros principais
| Ficheiro | Descrição |
|---|---|
| `main.js` | Electron main (gestão de janelas, IPC) |
| `preload.js` | Bridge IPC |
| `server.js` | Backend Express + Socket.IO |
| `public/index.html` | Painel Moderador |
| `public/presenter.html` | Ecrã do apresentador (fullscreen/transparente) |
| `companion/smart-timer-pro/` | Módulo Bitfocus Companion |
| `docs/` | Documentação (API, DEVELOPMENT, COMPANION, CHANGELOG) |

---

## 4. Registo de Decisões e Discussões

1. **Electron vs outras tecnologias** — o utilizador questionou a "estabilidade" do Electron.
   Decisão: manter Electron (é o que corre VS Code, Slack, Discord, etc.). Estabilidade depende do código, não da framework.

2. **OBS Overlay** — foi implementado inicialmente e depois removido a pedido do utilizador.

3. **Start at Zero vs Stop at Zero** — o utilizador clarificou que pretendia "parar no zero" (countdown não ir negativo), não "começar no zero".

4. **Show Hours / Show Seconds** — ambos com toggle independente; HH:MM:SS por defeito.

5. **Loading Bar vs Semáforo** — foi criado um mockup HTML interativo para o utilizador escolher. Decisão: ter AMBOS, com seleção por botão.

6. **Botões de indicador** — inicialmente um botão cíclico (OFF→Bar→Semáforo→Both). Depois alterado para DOIS botões independentes mutuamente exclusivos (Bar XOR Semáforo).

7. **Janela sem second display** — devia ser borderless (sem barra de título) e, em modo transparente, mostrar só o timer sobreposto a outras apps.

8. **Fundo transparente** — o bug foi no elemento `html` (raiz da página) que mantinha o fundo preto. A solução foi definir `background: transparent` em `html`, `body` e `.stage`. Além disso, `transparent: true` é opção de criação da janela (requer fechar e reabrir a janela).

9. **Cor de fundo** — pedido de um color picker para o fundo, unificado com o modo transparente num único setting `bgMode` (color/transparent).

10. **Ícone STM** — o ícone "atómico" (default do Electron) aparecia. Solução: gerar um ICO válido (PNG-based 256x256) e apontar `win.icon` para ele.

11. **Token GitHub revogado** — o primeiro token foi revogado (provavelmente pelo secret scanning do GitHub). Foi gerado um novo token.

---

## 5. Comandos de Desenvolvimento

```powershell
# Instalar dependências
npm install

# Correr em dev (Electron)
npm start

# Correr só o servidor (browser: http://127.0.0.1:3000)
node server.js

# Build (bump de versão + compilar)
npm run build

# Compilar sem bump (manter versão)
npx electron-builder build --win --x64

# Bump manual de versão
npm run bump
```

Output: `dist/Smart Timer Pro Setup X.Y.0.exe`

---

## 6. Como fazer um Release no GitHub

1. `npm run build` (bump automático de versão + compilar)
2. Recompilar o módulo Companion:
   ```powershell
   cd companion/smart-timer-pro
   npx webpack -c node_modules/@companion-module/tools/webpack.config.cjs --env ROOT=%cd%
   node scripts/package.js
   ```
3. Criar release e fazer upload do `.exe` e do `.tgz`

---

## 7. Dados do Utilizador

Os dados (settings, mensagens, logos, áudio) são guardados em:
- Electron: `%APPDATA%/smart-timer-pro/`
- Servidor standalone: pasta do projeto

Ficheiros: `settings.json`, `messages.json`, `logo.json`, `audio_end.json`, `audio_warning.json`

---

## 8. Estado Atual (v1.4.0)

- Produto: **Smart Timer Pro**
- Repositório: https://github.com/sharillas/Smart-Timer-Pro
- Release mais recente: v1.4.0 (`.exe` + `.tgz` do Companion)
- Módulo Companion: `companion-module-smart-timer-pro-1.4.0.tgz`

---

*Documento gerado a partir da conversa completa de desenvolvimento. Para detalhes técnicos
(API, endpoints, Socket.IO), ver `docs/API.md`, `docs/DEVELOPMENT.md` e `docs/COMPANION.md`.*
