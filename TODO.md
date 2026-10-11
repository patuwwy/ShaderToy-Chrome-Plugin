# TODO / Backlog

Zadania i usprawnienia planowane do wdrożenia w ShaderToy Unofficial Plugin.

---

## 🎥 Video Recording: Wsparcie dla formatu MP4 (H.264 / AVC)

### Cel
Zastąpienie lub rozszerzenie obecnego zapisu `.webm` (VP9/VP8) o bezpośredni zapis do formatu `.mp4` (kodek H.264), który jest natywnie odtwarzany na każdym systemie (Windows, macOS, iOS, Android) oraz bezproblemowo obsługiwany przez Discord, Twitter/X, Adobe Premiere Pro i DaVinci Resolve.

### Gotowa specyfikacja techniczna i implementacja

#### 1. Biblioteka Muxera
- **Biblioteka:** [`mp4-muxer`](https://github.com/vanilagy/mp4-muxer) (autor: Vanilagy, ta sama osoba co `webm-muxer`, licencja MIT).
- **Rozmiar:** ~15 KB (minified standalone bundle `mp4-muxer.js`).
- **Plik docelowy:** `app/scripts/mp4-muxer.js`.

#### 2. Rejestracja w rozszerzeniu
- Dodać `"scripts/mp4-muxer.js"` do `web_accessible_resources` w:
  - `manifests/manifest-chrome.json`
  - `manifests/manifest-firefox.json`
  - `app/manifest.json`
- W `app/contentscript.js` wstrzykiwać `scripts/mp4-muxer.js` z flagą `script.async = false` przed `shadertoy-plugin.js`.

#### 3. Inicjalizacja i Muxowanie (Gotowy kod)
```javascript
// 1. Sprawdzenie wsparcia sprzętowego H.264:
const h264Config = {
    codec: 'avc1.4d002a', // H.264 Baseline/Main profile
    width: recordWidth,   // MUSI być liczbą parzystą!
    height: recordHeight, // MUSI być liczbą parzystą!
    bitrate: 16_000_000,
    framerate: targetFps,
    avc: { format: 'avc' }
};
const support = await VideoEncoder.isConfigSupported(h264Config);

// 2. Muxer MP4:
let muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: {
        codec: 'avc',
        width: recordWidth,
        height: recordHeight
    },
    fastStart: 'in-memory' // kluczowe: przenosi atom 'moov' na początek pliku, umożliwiając streaming i natychmiastowe odtwarzanie
});

// 3. Encoder:
let encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('VideoEncoder error:', e)
});
encoder.configure(h264Config);

// 4. Finalizacja:
await encoder.flush();
muxer.finalize();
const buffer = muxer.target.buffer;
const blob = new Blob([buffer], { type: 'video/mp4' });
// Pobranie z rozszerzeniem .mp4
```

#### 4. Istotne uwagi i pułapki (już rozwiązane)
- **Wymiar parzysty:** Enkodery H.264 rzucają błąd, jeśli szerokość lub wysokość jest nieparzysta (np. canvas 1283x721). W `app/shadertoy-plugin.js` mamy już zaimplementowane obcinanie do parzystych wymiarów przez `visibleRect: { x: 0, y: 0, width: w - (w % 2), height: h - (h % 2) }`.
- **Interfejs UI:**
  - W toolbarze obok selecta FPS (`50/60/120/144/240`) dodać select formatu: `<select class="ste-record-format-select"><option value="mp4">MP4</option><option value="webm">WebM</option></select>`.
  - Zapamiętywać preferowany format w `localStorage` lub `ToyPlugCommon.prototype.getStorageItem`.

---

## 📌 Kolejne zadania / Backlog
*(Dodawaj kolejne punkty w miarę potrzeb)*
