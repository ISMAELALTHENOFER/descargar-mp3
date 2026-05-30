# descargar-mp3

Aplicación web para descargar audio de YouTube en formato MP3. Construida con Node.js, Express, React y TypeScript en una arquitectura modular.

> **Uso personal y educativo únicamente.**

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Audio | yt-dlp (primary) + ytdl-core (fallback) + fluent-ffmpeg |
| Colas | p-queue (control de concurrencia) |
| Cache | node-cache (TTL configurable) |
| Tiempo real | SSE (Server-Sent Events) |
| Validación | Zod |

## Requisitos

- Node.js 20+
- **FFmpeg** instalado en el sistema (`ffmpeg` disponible en PATH)
- **yt-dlp** instalado en el sistema (`yt-dlp` disponible en PATH) — estrategia primaria de descarga

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

## Características

- **Descarga individual**: Analiza cualquier video de YouTube y descarga el audio en MP3
- **Playlists completas**: Detecta automáticamente URLs de playlist y permite descargar todos los videos
- **Descarga masiva (batch)**: Selecciona múltiples videos de un playlist y descárgalos simultáneamente
- **Selector de carpeta**: Usa File System Access API para elegir dónde guardar los archivos (Chrome/Edge)
- **Calidad configurable**: Elige entre 128, 192 o 320 kbps
- **Progreso en tiempo real**: SSE muestra el estado de cada descarga (analizando, descargando, convirtiendo)
- **Cola de descargas**: Panel lateral muestra el progreso de todos los jobs activos
- **Fallback automático**: Si yt-dlp falla, intenta con ytdl-core

## API

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/analyze` | Analiza una URL y devuelve metadata del video |
| POST | `/api/v1/download` | Inicia descarga asíncrona, devuelve `jobId` |
| POST | `/api/v1/batch` | Inicia descarga masiva, devuelve `batchId` y lista de jobs |
| GET | `/api/v1/jobs/:id` | Estado de un job de descarga |
| GET | `/api/v1/jobs/:id/stream` | SSE con progreso en tiempo real (single job) |
| GET | `/api/v1/batch/:id` | Estado de un batch de descargas |
| GET | `/api/v1/batch/:id/stream` | SSE con progreso en tiempo real (batch) |
| GET | `/api/v1/download/:id` | Descarga el archivo MP3 cuando el job está completo |
| POST | `/api/v1/playlist` | Analiza una playlist y devuelve todos los videos |
| GET | `/api/v1/related/:videoId` | Obtiene videos relacionados |

## Roadmap

- [x] Setup monorepo + TypeScript
- [x] Análisis de metadata de YouTube
- [x] Descarga y conversión a MP3
- [x] Streaming vía SSE con progreso
- [x] UI moderna con Tailwind + glassmorphism
- [x] Playlists completas (multi-item)
- [x] Descarga múltiple con cola visible
- [x] Selector de carpeta destino (File System Access API)
- [x] Selector de calidad (128/192/320 kbps)
- [ ] Historial de descargas
- [ ] Favoritos
- [ ] Modo oscuro toggle
- [ ] Tests unitarios e integración
