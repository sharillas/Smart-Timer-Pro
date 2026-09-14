# Smart Timer Pro — Guia Rápido do Operador

Guia de 5 minutos para montar e operar um evento do zero.

## 1. Preparar a sala

1. Abrir o **Smart Timer Pro**
2. Ligar o projetor/monitor externo e carregar em **EXTERNAL DISPLAY**
   (sem monitor externo abre uma janela flutuante redimensionável)
3. Carregar em **SETTINGS** e confirmar:
   - Fonte, cores e formato do tempo (HH/SS)
   - Thresholds de aviso/perigo (default: 120s / 30s)
   - Posição e tamanho do timer no ecrã
   - Sons (fim / aviso / perigo) — opcional

## 2. Definir os tempos

- **Presets rápidos** (esquerda): carregar para arrancar com esse tempo
- Tempo à medida: escrever minutos em "Minutes..." + **SET TIME**
- Ajustes finos: **+1 MIN / -1 MIN**
- Presets personalizados (HH:MM:SS) para tempos estranhos (ex: 00:33:15)

## 3. Agenda (eventos com várias sessões)

1. Em **Agenda / Rundown**, adicionar cada sessão: nome + duração (MM:SS)
2. Manter **Auto-advance** ativo para encadear as sessões automaticamente
3. Carregar em **▶ START** — o ecrã externo mostra o nome da sessão e o tempo
4. **NEXT ⏭** salta manualmente · **STOP** termina o alinhamento
5. A barra colorida em cima do cartão mostra o progresso do alinhamento

## 4. Durante o evento

| Ação | Como |
|---|---|
| Arrancar / pausar | **Espaço** ou botão GO/PAUSE |
| Reset | **R** ou botão RESET |
| Mensagem no ecrã | Escrever + **SHOW MESSAGE** (atalho **M**) |
| Mensagens rápidas | 1 clique no banco de mensagens (edita-as antes do evento) |
| Último recurso | **Ctrl+Z** anula o último reset/mudança |
| Semáforo / barra | Botões LOADING BAR / SEMÁFORO |

O tempo fica **verde** normalmente, **âmbar** no aviso, **vermelho** no perigo
e a **piscar** quando expira.

## 5. Opcionais

- **Logótipo do evento**: UPLOAD LOGO (modo "Show Logo/Grid" mostra-o)
- **Pré-evento**: modo **Prestart** mostra "STARTS IN 05:00"
- **Anel de progresso**: Settings > Prestart & Ring
- **Stream Deck**: instalar o módulo Companion (ver `docs/COMPANION.md`)
- **Controlo remoto**: abrir `http://<ip-do-pc>:3000/remote.html` no telemóvel
  (ou carregar no botão **REMOTE** na app e copiar o endereço)
- **OBS**: browser source `http://127.0.0.1:3000/presenter.html` (ver `docs/OBS.md`)
- **Perfis**: EXPORT PROFILE no fim do evento para reutilizar a configuração
- **Relatório**: Settings > Session Log > EXPORT CSV (regista tudo o que aconteceu)

## 6. Segurança

- **PIN**: Settings > Security — se definires um PIN, os comandos passam a exigi-lo
  (as páginas pedem 1 vez; o Companion tem um campo PIN). Deixar vazio = sem PIN.
- **HTTPS**: Settings > HTTPS — ativa ligação encriptada (requer reiniciar a app;
  o browser avisa do certificado próprio — aceitar uma vez).

## 7. Encerrar

- Fechar a janela **não desliga a app** — ela fica no **system tray**
  (clique direito: GO/Pause, Reset, Quit). Usar **Quit** para sair mesmo.
- As atualizações chegam sozinhas: Settings > Updates > CHECK FOR UPDATES.
