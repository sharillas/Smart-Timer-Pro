# Smart Timer Pro — OBS Integration

Smart Timer Pro runs a local web server (`http://<ip>:3000`), so OBS Studio can display
the presenter view directly via a **Browser Source**. No plugins required.

## Quick Setup

1. Start Smart Timer Pro and open the **external display** window (button `EXTERNAL DISPLAY`), or keep it closed — the browser source works independently.
2. In OBS, add a new source: **Browser**
3. Set the URL to:
   - `http://127.0.0.1:3000/presenter.html` (OBS on the same PC), or
   - `http://<pc-ip>:3000/presenter.html` (OBS on another machine on the network)
4. Recommended settings:
   - Width: `1920`  Height: `1080`  FPS: `60`
   - **Shutdown source when not visible**: OFF
   - **Refresh browser when scene becomes active**: OFF (the view updates live via WebSocket)
5. Click **OK** — you will see the timer live in OBS.

## Transparent Overlay (recommended)

To overlay the timer on top of video/camera sources:

1. In Smart Timer Pro, open **SETTINGS**
2. Under **Background**, select **Transparent**
3. (Optional) Move the timer text with the X/Y position settings
4. In OBS, the browser source now has a transparent background — place it above your video layer

The **Loading Bar** and **Semáforo** indicators can also be turned on from the
Controls panel and will appear over the video.

## Tips

- The presenter view follows the **Display Mode** (Countdown, Count-Up, Time of Day,
  Logo, Agenda) selected in Smart Timer Pro.
- Messages and quick messages appear automatically in the OBS layer.
- If you stream from a different PC, make sure port `3000` is allowed through the
  Windows firewall on the machine running Smart Timer Pro.
- The source never needs to be manually refreshed: state is pushed in real time
  via Socket.IO.
