# Smart Timer Pro — Guia de Sincronização (External Sync Timer)

Como ligar o **External Sync Timer** ao tempo restante de uma cue a correr em
**Resolume Arena**, **Pixera** ou **WATCHOUT**, e como usar tudo no **Companion**.

> O timer externo aparece num ecrã/janela próprio (fundo preto, fonte timecode,
> texto branco centrado). Mostra "SYNC" quando ligado e "NO SIGNAL" quando perde
> a ligação.

---

## 0. No Smart Timer Pro (a nossa app)

1. Cartão **"External Sync Timer"** na interface principal
2. Escolhe o **Provider**: Resolume / Pixera-Watchout (HTTP) / OSC
3. Configura os campos do provider (ver secções abaixo)
4. **FOLLOW ON** = segue a cue continuamente · **SYNC NOW** = captura o tempo uma vez e conta localmente
5. Escolhe o **display** (2/3/4 ou janela) e carrega **OPEN DISPLAY**
6. START/PAUSE/RESET controlam o timer externo

---

## 1. Resolume Arena 7 (REST — sem scripts)

1. Em Resolume: **Preferences → Web server → Enable** (porta default **8080**)
2. Na nossa app: Provider **Resolume**, IP do PC do Resolume, porta 8080
3. **Target**:
   - **"Selected clip (active column)"** — segue o clip selecionado da coluna ativa (recomendado quando usas colunas automáticas)
   - **Column 1–40** — segue uma coluna fixa
4. Testar manualmente: no browser do PC do Resolume abrir
   `http://127.0.0.1:8080/api/v1/composition/columns/1/transport` → deve devolver `{"position":0.42,...}`

Nota: se o webserver falhar no teu setup, liga também **Preferences → OSC output** e
usa o provider **OSC** (endereço `/composition/columns/1/clip/transport/position`).

---

## 2. Pixera R25

O Pixera expõe uma REST API (porta 8080, consola/API de controlo). Temos **dois caminhos**:

### Opção A — HTTP genérico (se a API expuser o tempo)
1. Na nossa app: Provider **Pixera / Watchout (HTTP)**
2. **URL**: `http://<ip-do-pixera>:8080/api/...` (verifica na documentação da API do teu Pixera qual o endpoint que devolve a posição da cue ativa)
3. **Path**: campo JSON do tempo (ex: `position` ou `time_remaining`) — valor 0–1 é tratado como posição × duração; valor >1 é tratado como segundos restantes
4. **Duration**: duração da cue (s) — usada quando o valor é uma posição

### Opção B — Script Lua no Pixera + OSC (recomendado, mais fiável)
Se a API não expuser diretamente o remaining, criar um **script Lua** dentro do Pixera
(menu Scripting) que envia o tempo por OSC para a nossa app a cada 0.5 s:

```lua
-- Pixera Lua: envia o remaining da cue ativa por OSC para o Smart Timer Pro
-- Ajustar: TIMER_IP e TIMER_PORT (da nossa app, default 9001)
-- Verificar na documentação do Pixera os nomes exatos das funções da API Lua
-- (GetTimeline... / GetCue...) e ajustar as linhas marcadas com TODO.

TIMER_IP = "192.168.1.55"   -- IP do PC do Smart Timer Pro
TIMER_PORT = 9001           -- porta OSC definida na app

function sendRemaining()
    -- TODO: substituir pelas funções reais do teu Pixera R25
    -- Exemplo (verificar nomes na documentação de scripting do Pixera):
    -- local position = GetActiveCuePosition()   -- 0.0 .. 1.0
    -- local duration  = GetActiveCueDuration()  -- segundos
    -- local remaining = math.max(0, duration * (1 - position))
    local remaining = 0   -- TODO: valor real
    local msg = "/sync/position"
    -- envia OSC float
    SendOSC(TIMER_IP, TIMER_PORT, msg, remaining)
end

-- correr a cada 0.5 segundos
-- TODO: usar o mecanismo de timers do Pixera (ex: SetTimer / OnTick)
```

Na nossa app: Provider **OSC**, porta **9001**, endereço **/sync/position**,
modo **Position (0-1) + duration** com a duração da cue.

> ⚠️ **Verificação necessária no local**: os nomes das funções Lua variam entre
> versões do Pixera. Abrir a documentação de Scripting do Pixera R25 e substituir
> as linhas TODO. O fluxo (ler posição/duração → enviar OSC) mantém-se igual.

---

## 3. WATCHOUT 7

### Opção A — HTTP genérico
1. Na nossa app: Provider **Pixera / Watchout (HTTP)**
2. **URL** do endpoint do WATCHOUT 7 que devolve o tempo da timeline (ver a
   documentação da API do WATCHOUT 7 — o production v7 expõe uma REST API)
3. **Path** do campo (posição 0–1 ou segundos) + **Duration** se for posição

### Opção B — OSC (se o WATCHOUT 7 tiver OSC output)
1. No WATCHOUT 7, configurar **OSC output** para o IP do Smart Timer Pro, porta **9001**
2. Enviar a posição da timeline no endereço **/sync/position** (0–1)
3. Na nossa app: Provider **OSC**, modo **Position + duration**

---

## 4. No Bitfocus Companion

Instalar o módulo `companion-module-smart-timer-pro-2.0.0.tgz` e adicionar a conexão.
No editor de botões, procurar as ações **External Sync**:

| Ação | O que faz |
|---|---|
| External Sync - Start | Inicia o countdown local do timer externo |
| External Sync - Pause | Pausa o timer externo |
| External Sync - Reset | Repõe o timer externo |
| External Sync - Follow ON/OFF | Liga/desliga o modo follow |
| External Sync - Sync Now | Captura o tempo atual da cue |

**Preset "External Sync — HH:MM:SS:MS"**: 4 botões de leitura que mostram
Horas : Minutos : Segundos : Milissegundos do timer externo.

Variáveis disponíveis: `$(smart-timer-pro:sync_hours)`, `sync_minutes`,
`sync_seconds`, `sync_ms`, `sync_source`, `sync_connected`.

---

## Troubleshooting

| Sintoma | Solução |
|---|---|
| "NO SIGNAL" permanente | Verificar IP/porta na app; firewall do Windows a bloquear 8080/9001 |
| Resolume sem resposta | Web server ligado em Preferences? Testar o URL no browser |
| Pixera sem resposta | Confirmar nomes das funções Lua/API na documentação do teu R25 |
| OSC sem dados | Porta igual na app e no servidor; endereço exatamente igual |
| Timer externo não abre | Usa o botão OPEN DISPLAY no cartão External Sync Timer |
