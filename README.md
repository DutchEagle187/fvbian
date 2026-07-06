# fvbian — Apex Playground

Spielwiese für modernes Webdev auf [fvbian.com](https://fvbian.com).
Ein Scroll-Erlebnis durch das Auge eines Adlers — dahinter: NQ-Futures-Tape,
Apex-Trilogie (Adler · Gepard · Lemur), Shader, Canvas-Art und
Scroll-Choreografie.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Motion** (motion.dev) — Scroll-Choreografie, Springs, InView
- **Tailwind CSS v4** + Magic-UI-Komponenten (AuroraText, ShimmerButton, …)
- **Raw WebGL** Fragment-Shader (fbm-Noise-Aurora, keine three.js-Dependency)
- **Canvas 2D** — prozedurales Adlerauge (~750 Iris-Fasern), Candlestick-Sim,
  Radar/Speed/Leap-Artworks

## Struktur

```
src/
  app/                      # Layout (dark only) + Page-Komposition
  components/
    gate/                   # EagleGate (420vh Scroll-Journey) + EagleEye-Canvas
    sections/               # Manifest, NQ-Terminal, ApexGrid, Footer
    fx/                     # ShaderVeil (WebGL), Marquee
    magicui/                # Magic-UI-Ports
```

## Der Eagle-Loader

`EagleGate` spannt 420vh auf; ein sticky Viewport zeigt das prozedural
gemalte Raubvogel-Auge. Mit dem Scrollen: Erwachen → Blinzeln → Fokus
(Pupille verengt sich, Iris glüht von Gold nach Ember) → Dilatation → die
Pupille verschluckt den Viewport und gibt die Seite frei.

### Fotoreale Assets (optional, Drop-in)

Die Seite rendert komplett prozedural. Liegen folgende Dateien in `public/`,
übernehmen sie automatisch (kein Codechange):

| Datei                | Wirkung                                    |
| -------------------- | ------------------------------------------ |
| `eagle-head.webp`    | Adlerkopf-Layer hinter dem Auge im Gate    |
| `apex/eagle.webp`    | Foto-Artwork der Adler-Karte               |
| `apex/cheetah.webp`  | Foto-Artwork der Gepard-Karte              |
| `apex/lemur.webp`    | Foto-Artwork der Lemur-Karte               |

## Entwickeln & Deployen

```bash
npm install
npm run dev        # http://localhost:3000
```

Deploy: Vercel, keine Environment-Variablen nötig. Der NQ-Feed ist eine
Simulation (Momentum + Volatilitäts-Cluster) — keine echten Marktdaten.
