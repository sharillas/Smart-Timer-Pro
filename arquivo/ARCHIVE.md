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
| Updates | electron-updater (GitHub Releases) |
| CI/CD | GitHub Actions |
| Testes | node:test (15 testes) |
| Extras | node-forge (cert HTTPS auto-assinado) |

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
- Branding smartchoice

### v1.1.0 — Versionamento + Módulo Companion
- Script de auto-incremento de versão
- Módulo Bitfocus Companion com branding e presets

### v1.2.0 — Correções e Presets
- **Logo Fit Mode**: Fit (contain) / Fill (cover) / Stretch (fill)
- **Correção de bug**: os modos de exibição já não resetam/perdem o tempo do timer
- **Custom Quick Presets**: adicionar presets em HH:MM:SS

### Renomeação — "Smart Timer Pro"
- Nome do software alterado de "SmartCountdownTimer Pro" para "Smart Timer Pro"
- Repositório renomeado: `SmartCountdownTimer-Pro` → `Smart-Timer-Pro`

### v1.3.0 — Status Indicators
- **Loading Bar** e **Semáforo** com posição (X/Y) e tamanho independentes
- Posição e tamanho do timer ajustáveis
- Botões Loading Bar ON/OFF e Semáforo ON/OFF no módulo Companion

### v1.4.0 — Personalização Avançada
- Quick presets default editáveis (HH:MM:SS)
- Botões independentes Loading Bar / Semáforo (mutuamente exclusivos)
- Dropdown de fontes + Custom
- Janela transparente borderless/always-on-top (overlay sobre PowerPoint)
- Tema cinza/azul, ícone "STM", cor de fundo + bgMode, test pattern

### v1.4.1 — Correções
- **Bug crítico**: o logo perdia-se ao reiniciar (persistido mas não carregado para o estado)
- **Servidor passou a escutar em `0.0.0.0`** (acesso LAN para Companion/dispositivos)
- Single-instance lock + diálogo amigável de porta ocupada
- Docs corrigidos (caminhos e variáveis do módulo)

### v1.4.2 — Usabilidade
- Atalhos de teclado (Espaço, R, M)
- System tray com controlos rápidos (fechar minimiza para o tray)
- UI responsiva mobile/tablet
- Proteção CSRF (Origem estrangeira bloqueada na API)
- Renderização in-place do presenter (sem rebuild a cada segundo)
- `bump-version.js` com suporte a patch/minor/major

### v1.5.0 — Produção
- **Agenda/Rundown**: sessões com duração, auto-avanço, nome da sessão no ecrã externo
- **Perfis de evento** (export/import JSON: settings, mensagens, presets, agenda, logo)
- **Áudio de perigo** (3º slot, com fallback para warning)
- **Auto-update** via GitHub Releases
- **Guia OBS** (`docs/OBS.md`)
- **Hotkeys configuráveis** em Settings
- **Timer sem deriva** (baseado em `Date.now()`)
- **Auto-recuperação** da janela do ecrã externo
- **Banner de reconexão** nas janelas

### v1.6.0 — Segurança + Qualidade
- **PIN opcional** (Settings > Security): comandos exigem PIN, leitura aberta;
  PIN nunca sai do servidor (broadcasts, API, exports); Companion v1.6.0 com campo PIN
- **Testes automáticos** (`npm test`, 12 testes iniciais)

### v1.7.0 — Integração + Automação
- **Registo de sessões** com export CSV
- **Agenda no Companion** (ações Start/Next/Stop, preset de display, variáveis)
- **Modo Prestart** ("STARTS IN")
- **Anel de progresso** no ecrã
- **Saída OSC** para mesas de luz (`/stp/start|pause|warning|danger|end|reset`)
- **Webhooks** (POST JSON em cada evento)
- **Página remota** `/remote.html` (telemóvel/tablet)
- **Idiomas EN/PT**
- **Undo** (Ctrl+Z)
- **Timeline visual** da agenda
- **HTTPS opcional** (certificado auto-assinado gerado automaticamente)
- **CI/CD**: GitHub Actions corre testes em cada push e faz releases automáticos em tags
- Companion v1.7.0

### v1.7.1 — Update na GUI
- Settings > Updates: versão atual, botão **CHECK FOR UPDATES** e estado em direto
- Verificação automática ao arranque mantida (update in-place pelo NSIS, sem tocar em dados)

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
│           http(s)://127.0.0.1:3000                      │
│  ┌─────────────────▼──────────────────────────────────┐ │
│  │              Express + Socket.IO Server             │ │
│  │  REST API + Socket.IO events + Static files         │ │
│  │  (PIN, CSRF, OSC, Webhooks, Session Log)            │ │
│  └────────────────────────────────────────────────────┘ │
│  Tray (quick controls) · AutoUpdater (GitHub Releases) │
└─────────────────────────────────────────────────────────┘
```

### Ficheiros principais
| Ficheiro | Descrição |
|---|---|
| `main.js` | Electron main (janelas, tray, auto-update, IPC) |
| `preload.js` | Bridge IPC |
| `server.js` | Backend Express + Socket.IO + PIN/CSRF/OSC/webhooks/log |
| `public/index.html` | Painel Moderador (i18n EN/PT) |
| `public/presenter.html` | Ecrã do apresentador (anel, agenda, prestart) |
| `public/remote.html` | Página de controlo remoto mobile |
| `companion/smart-timer-pro/` | Módulo Bitfocus Companion |
| `tests/` | Testes automáticos (server + frontend) |
| `.github/workflows/ci.yml` | CI/CD |
| `docs/` | Documentação (API, DEVELOPMENT, COMPANION, OBS, OPERATOR_GUIDE, CHANGELOG) |
| `arquivo/` | Este arquivo de projeto |

---

## 4. Registo de Decisões e Discussões

1. **Electron vs outras tecnologias** — manter Electron (é o que corre VS Code, Slack, Discord, etc.).
2. **OBS Overlay** — implementado, depois removido; mais tarde readicionado como guia de browser source (`docs/OBS.md`).
3. **Start at Zero vs Stop at Zero** — parar no zero (countdown não ir negativo).
4. **Show Hours / Show Seconds** — toggles independentes.
5. **Loading Bar vs Semáforo** — ambos, com DOIS botões mutuamente exclusivos.
6. **Janela sem second display** — borderless; em modo transparente, só o timer sobreposto.
7. **Fundo transparente** — bug no elemento `html`; corrigido com `background: transparent` + `transparent: true` na janela.
8. **Ícone STM** — gerar ICO válido e apontar `win.icon`.
9. **Token GitHub revogado** — secret scanning; usar PAT guardado no credential manager.
10. **Companion 5 quebra o módulo** — módulos empacotados correm em processo isolado;
    o `main.js` tem de ser empacotado com webpack e usar `runEntrypoint` (caminho antigo, apiVersion < 2.0).
11. **Borders nos presets** — o Companion 5 só respeita borders no formato de presets **layered**; feedbacks não conseguem alterar borders (usam bgcolor).
12. **Display name do módulo** — o Companion mostra `manufacturer: product`; alterado para "Nelson Teixeira: Smart Timer Pro".
13. **Legacy ids** — `legacyIds: ["smartcountdowntimer-pro"]` para migrar ligações antigas.
14. **PIN opcional** — default vazio (tudo funciona como antes); com PIN, comandos exigem `?pin=`;
    leitura aberta; GUI pede PIN em 401; Companion tem campo PIN; PIN nunca é transmitido para clientes.
15. **HTTPS** — opcional, certificado auto-assinado gerado com node-forge (Electron ignora erros de cert quando ativo).
16. **Timer sem deriva** — tick baseado em `Date.now()` com `endTime`/`startTime`, não em `setInterval` cego.
17. **Lan 0.0.0.0 vs localhost** — servidor escuta em todas as interfaces para permitir controlo remoto; CSRF protege contra sites maliciosos.
18. **CI/CD** — testes em cada push; releases automáticos em tags (o glob de testes falhou no Node 20 do runner; usar lista explícita de ficheiros).
19. **Update in-place** — electron-updater corre o instalador NSIS em silêncio; substitui ficheiros sem desinstalar; dados ficam em `%APPDATA%`.

---

## 5. Comandos de Desenvolvimento

```powershell
# Instalar dependências
npm install

# Correr em dev (Electron)
npm start

# Correr só o servidor (browser: http://127.0.0.1:3000)
node server.js

# Testes automáticos (15)
npm test

# Bump de versão (patch / minor / major)
npm run bump:patch
npm run bump:minor
npm run bump

# Build do instalador (sem bump)
npx electron-builder --publish never

# Build do módulo Companion (bundle webpack + tgz)
cd companion/smart-timer-pro
node scripts/package.js

# Screenshots do README
node scripts/capture-screenshots.js
```

Output: `dist/Smart Timer Pro Setup X.Y.Z.exe`

---

## 6. Como fazer um Release no GitHub

1. `npm run bump:minor` (ou patch/major)
2. Atualizar `docs/CHANGELOG.md`, README e footer do `index.html`
3. `npm test`
4. Commit + push: `git push origin master`
5. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
6. O GitHub Actions faz o resto: testes + build do instalador + build do módulo
   Companion + criação do release com `.exe`, `.blockmap`, `latest.yml` e `.tgz`
   (alternativa manual: `npx electron-builder --publish never` + upload via API)

---

## 7. Dados do Utilizador

Os dados são guardados em `%APPDATA%/smart-timer-pro/` (Electron) ou na pasta do
projeto (servidor standalone, ou `STP_DATA_DIR` em testes).

Ficheiros: `settings.json`, `messages.json`, `logo.json`, `audio_end.json`,
`audio_warning.json`, `audio_danger.json`, `session_log.json`,
`https-cert.pem` + `https-key.pem` (se HTTPS ativo).

---

## 8. Estado Atual (v1.7.1)

- Produto: **Smart Timer Pro**
- Repositório: https://github.com/sharillas/Smart-Timer-Pro
- Release mais recente: **v1.7.1** (`.exe` + `.blockmap` + `latest.yml` + `.tgz`)
- Módulo Companion: `companion-module-smart-timer-pro-1.7.0.tgz`
- Testes: 15 a passar · CI/CD ativo · Auto-update ativo

---

*Documento gerado a partir da conversa completa de desenvolvimento. Para detalhes técnicos
(API, endpoints, Socket.IO), ver `docs/API.md`, `docs/DEVELOPMENT.md`, `docs/COMPANION.md`,
`docs/OBS.md` e `docs/OPERATOR_GUIDE.md`.*
