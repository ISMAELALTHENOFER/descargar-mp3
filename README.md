# descargar-mp3

Aplicación web para descargar audio de YouTube en formato MP3. Construida con Node.js, Express, React y TypeScript en una arquitectura modular.

> **Uso personal y educativo únicamente.**

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Audio | ytdl-core + fluent-ffmpeg |
| Colas | p-queue (control de concurrencia) |
| Cache | node-cache (TTL configurable) |
| Tiempo real | SSE (Server-Sent Events) |
| Validación | Zod |

## Requisitos

- Node.js 20+
- FFmpeg instalado en el sistema (`ffmpeg` disponible en PATH)
- (Opcional) yt-dlp para fallback de descarga

## Instalación

```bash
git clone <repo-url>
cd descargar-mp3
npm install
```

## Desarrollo

```bash
# Inicia servidor y frontend simultáneamente
npm run dev
```

- Server: `http://localhost:3001`
- Frontend (Vite dev server): `http://localhost:5173` (con proxy a `/api`)

## Producción

```bash
npm run build
npm start
```

Esto compila el frontend con Vite y lo sirve desde Express en el puerto `3001`.

## API

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/analyze` | Analiza una URL y devuelve metadata del video |
| POST | `/api/v1/download` | Inicia descarga asíncrona, devuelve `jobId` |
| GET | `/api/v1/jobs/:id` | Estado de un job de descarga |
| GET | `/api/v1/jobs/:id/stream` | SSE con progreso en tiempo real |
| GET | `/api/v1/download/:id` | Descarga el archivo MP3 cuando el job está completo |
| POST | `/api/v1/playlist` | Analiza una playlist |
| GET | `/api/v1/related/:videoId` | Obtiene videos relacionados |

## Roadmap

- [x] Setup monorepo + TypeScript
- [x] Análisis de metadata de YouTube
- [x] Descarga y conversión a MP3
- [x] Streaming vía SSE con progreso
- [x] UI moderna con Tailwind + glassmorphism
- [ ] Playlists completas (multi-item)
- [ ] Descarga múltiple con cola visible
- [ ] Historial de descargas
- [ ] Favoritos
- [ ] Modo oscuro toggle
- [ ] Tests unitarios e integración
