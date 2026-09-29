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

## 2. Pixera R25 (sem scripts — a nossa app faz polling direto)

O Pixera expõe uma **API TCP (JSON-RPC 2.0)** — a nossa app liga-se ao Pixera
como cliente e pergunta o countdown a cada 0,5 s. **Não é preciso nenhum script.**

### No Pixera (uma vez):
1. Abrir o separador de definições (canto superior direito) → **API**
2. Em **Input Network Adapter**, escolher o IP/NIC do Pixera
3. Escolher um dos **API Access Points** e definir:
   - **Protocolo: JSON/TCP(dl)**  (recomendado)
   - **Porta**: qualquer número (ex: **4023**)
4. Nas **cues da timeline**: marcar cada cue como **"countdown relevant"**
   (inspector da cue) — é o tempo até à próxima cue relevante que aparece no timer

### Na nossa app (Smart Timer Pro):
1. Provider: **Pixera (TCP API)**
2. **IP** do Pixera + **porta** (a mesma que escolheste, ex: 4023)
3. **Timeline name**: nome da timeline (ex: `Timeline 1`)
4. **Framing**: `JSON/TCP(dl) 0xPX` (ou `JSON/TCP pxr1` se no Pixera tiveres
   escolhido JSON/TCP em vez de TCP(dl))
5. **FOLLOW ON** + **OPEN DISPLAY** — o timer externo mostra o tempo até à próxima
   cue "countdown relevant" da timeline

Teste rápido (opcional, do PC da nossa app, com PowerShell):
```powershell
# TCP(dl): enviar JSON + "0xPX" e ler a resposta
$c = New-Object System.Net.Sockets.TcpClient("192.168.1.20", 4023)
$s = $c.GetStream()
$msg = '{"jsonrpc":"2.0","id":1,"method":"Pixera.Compound.getCurrentCountdownOfTimeline","params":{"name":"Timeline 1"}}0xPX'
$b = [System.Text.Encoding]::UTF8.GetBytes($msg)
$s.Write($b, 0, $b.Length)
Start-Sleep -Milliseconds 500
$buf = New-Object byte[] 4096
$n = $s.Read($buf, 0, 4096)
[System.Text.Encoding]::UTF8.GetString($buf, 0, $n)
$c.Close()
```
Deve devolver algo como `{"jsonrpc":"2.0","id":1,"result":900}` (900 frames até à próxima cue).

> Nota: a documentação oficial do Pixera confirma que a API Lua (Control) **não
> permite enviar OSC para outro PC**, por isso o caminho é mesmo este: a nossa app
> liga-se à API TCP do Pixera e pergunta o countdown. Se preferires HTTP, o Pixera
> não expõe o countdown por HTTP — usa a API TCP acima ou o provider HTTP genérico
> só se tiveres um servidor intermédio que exponha o tempo.

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
