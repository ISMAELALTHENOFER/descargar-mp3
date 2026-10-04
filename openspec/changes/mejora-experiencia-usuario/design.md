# Design: Mejora Integral de Experiencia de Usuario

## Technical Approach

Refactor integral sobre la capa de presentación React + Express existente, sin modificar la arquitectura Clean Architecture ni los contratos REST. Se añaden 8 capacidades en un solo pase sobre todos los componentes para garantizar coherencia visual y funcional desde el día 1.

## Architecture Decisions

| Decisión | Opción elegida | Alternativas descartadas | Justificación |
|----------|---------------|------------------------|---------------|
| i18n | Archivo `es.ts` con constantes exportadas | react-i18next, i18next | App monousuario en español. Librería añade 28KB + overhead de hooks sin beneficio real. Las constantes son tipadas, autocompletables y zero-cost. |
| SSE reconnect | Clase `SSEClient` (wrapper de EventSource) con backoff exponencial | reconnecting-eventsource polyfill, WebSocket | No añadir dependencia externa. EventSource nativo + lógica propia permite heartbeat personalizado y dedup de eventos por `lastEventId`. |
| Toast system | React Context + reducer action en `App.tsx` | react-hot-toast, sonner | Cero dependencias. El reducer ya es el source of truth; añadir un array `toasts: Toast[]` es natural. |
| Skeletons | Componente `<Skeleton>` con `animate-pulse` + variantes vía props | react-loading-skeleton | Una sola clase Tailwind (`skeleton` ya existe en `index.css`) + props `width/height/rounded`. Sin dependencia. |
| Glass | Solo en `<Header>` | Glass en todos los `.card` | Reduce ruido visual, mejora performance (sin backdrop-blur en N cards con playlists grandes). |
| Paleta | `#1e293b` (azul pizarra) como `surface`, `#d97706` (cobre) como `accent` | Verde actual (`#1db954`) | Verde = marca YouTube. Cobre sobre azul pizarra da identidad propia y contraste ≥7:1. |
| Concurrencia 30 | Cambiar `CONCURRENCY_LIMIT` default de 3 → 30 con `process.env` override | Valores fijos 5/10/15 | El usuario decide según su hardware. Por defecto 30 para batch de playlists; documentado y sobreescribible. |
| Límite playlist | `--playlist-end 30` en `yt-dlp --flat-playlist` | Paginación, scroll infinito | Simple, predecible, sin cambios en el contrato API. Suficiente para el 99% de playlists de YouTube. |

## Component Hierarchy

```
App (useReducer — State + dispatch)
├── ToastContainer ← nuevo (portal al final del body)
│   └── Toast[] (array en State.toasts)
├── Header ← glass solo aquí; sin cambios estructurales
├── LoadingSpinner ← nuevo (sustituye loadingMessage inline)
├── ErrorBanner ← refactorizado (ahora dismissible, con botón cerrar)
├── UrlInput
├── [SkeletonVideo] ← nuevo, espeja VideoPreview
│   └── VideoPreview (cuando video != null)
├── [SkeletonPlaylist] ← nuevo, espeja PlaylistView
│   └── PlaylistView (cuando status === 'playlist')
├── DownloadButton
├── ProgressBar
├── [SkeletonRelated] ← nuevo, espeja RelatedList
│   └── RelatedList
└── QueuePanel
```

## Data Flow — Nuevas Actions del Reducer

```typescript
// Toast (nuevo)
| { type: 'TOAST_SHOW'; toast: Toast }
| { type: 'TOAST_DISMISS'; id: string }
// SSE reconnect status
| { type: 'SSE_CONNECTING' }
| { type: 'SSE_CONNECTED' }
| { type: 'SSE_DISCONNECTED'; reason: string }
// Error dismiss
| { type: 'DISMISS_ERROR' }
```

## SSEClient API

```typescript
class SSEClient {
  constructor(
    id: string, isBatch: boolean,
    onEvent: (event: MessageEvent & { lastEventId?: string }) => void,
    onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void
  )
  connect(): void          // crea EventSource + handlers
  disconnect(): void       // cleanup + es.close()
  reconnect(): void        // disconnect → exponential backoff → connect

  // Interno:
  // - backoff: 1s, 2s, 4s, 8s, 16s, 30s (máx)
  // - heartbeat: resetea backoff al recibir evento type: 'heartbeat'
  // - dedup: Set<lastEventId> — ignora eventos ya procesados
  // - maxRetries: ∞ (siempre reconecta, el usuario decide cerrar)
}
```

**Servidor**: `SSEManager` emite `{ type: 'heartbeat' }` cada 15s vía `setInterval` sobre todos los clientes activos.

## Estructura de Archivos

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `packages/web/src/i18n/es.ts` | **Crear** | 80+ constantes tipadas en español |
| `packages/web/src/services/sse-client.ts` | **Crear** | Clase SSEClient con backoff + heartbeat |
| `packages/web/src/components/ToastContainer.tsx` | **Crear** | Portal + stack de toasts con animaciones |
| `packages/web/src/components/Skeleton.tsx` | **Crear** | Genérico: `<Skeleton variant="text" w="full" h="4" />` |
| `packages/web/src/components/ErrorBanner.tsx` | **Crear** | Banner dismissible (antes inline en App) |
| `packages/web/src/components/LoadingSpinner.tsx` | **Crear** | Spinner reutilizable con mensaje |
| `packages/web/src/components/ImageWithFallback.tsx` | **Crear** | `<img onError>` → placeholder SVG |
| `packages/web/src/App.tsx` | **Modificar** | Reducer (toasts, sseStatus), i18n, SSEClient, skeletons |
| `packages/web/src/services/api.ts` | **Modificar** | `createSSEConnection` → retorna `SSEClient` |
| `packages/web/src/index.css` | **Modificar** | Paleta, focus, toast anims, skeleton vars, transitions |
| `packages/web/tailwind.config.js` | **Modificar** | Colores `surface`, `accent` → nueva paleta |
| `packages/web/src/components/VideoPreview.tsx` | **Modificar** | `ImageWithFallback`, i18n, skeleton |
| `packages/web/src/components/PlaylistView.tsx` | **Modificar** | `ImageWithFallback`, i18n, grid hasta 30, `<label>`, `aria-label` |
| `packages/web/src/components/QueuePanel.tsx` | **Modificar** | Responsive (w-full en mobile), i18n, aria-label |
| `packages/web/src/components/RelatedList.tsx` | **Modificar** | `ImageWithFallback`, i18n, skeleton |
| `packages/web/src/components/DownloadButton.tsx` | **Modificar** | `<label>`, i18n, aria-label en SVG |
| `packages/web/src/components/ProgressBar.tsx` | **Modificar** | Estado indeterminate (cuando progress=0), i18n |
| `packages/web/src/components/UrlInput.tsx` | **Modificar** | i18n, aria-label en botón X |
| `packages/web/src/components/Header.tsx` | **Modificar** | i18n, glass (sin cambios visuales mayores) |
| `packages/server/src/infra/sse/sse-manager.ts` | **Modificar** | Heartbeat cada 15s, `lastEventId` en cada evento |
| `packages/server/src/services/queue/job-queue.ts` | **Modificar** | `CONCURRENCY_LIMIT` default 3 → 30 |
| `packages/server/src/core/downloader/yt-dlp-strategy.ts` | **Modificar** | `getPlaylistInfo` añade `--playlist-end 30` |
| `packages/server/src/api/middleware/error-handler.ts` | **Modificar** | Mensajes de error en español |
| `packages/server/src/api/middleware/validate-url.ts` | **Modificar** | Mensajes de error en español |
| `packages/server/src/api/middleware/rate-limit.ts` | **Modificar** | Mensajes de error en español |

## Paleta y Tipografía

```javascript
// tailwind.config.js — nueva paleta
colors: {
  surface: {
    DEFAULT: '#0f172a',   // antes #0a0a0f → azul pizarra más cálido
    light: '#1e293b',
    lighter: '#334155',
  },
  accent: {
    DEFAULT: '#d97706',   // antes #1db954 → cobre/ámbar
    hover: '#f59e0b',
  },
}
```

```css
/* index.css — tipografía */
.text-xs   /* 0.75rem — labels, badges */
.text-sm   /* 0.875rem — texto secundario */
.text-base /* 1rem — body, cards */
.text-lg   /* 1.125rem — headings */
```

## Jerarquía de Skeletons

| Skeleton | Espeja | Dimensiones fijas |
|----------|--------|-------------------|
| `<SkeletonVideo />` | `VideoPreview` | `w-full h-28` (max-w-2xl) |
| `<SkeletonCard />` | `RelatedList` item, `PlaylistView` item | `w-full h-32` |
| `<SkeletonPlaylist />` | `PlaylistView` completo | `w-full h-96` (grid de 6×5 cards) |
| `<SkeletonText />` | `ProgressBar` label | `w-48 h-4` |
| `<SkeletonImage />` | Thumbnail | `w-40 h-24` |
| `<Skeleton />` | Genérico (fallback) | `w-full h-4 rounded` por defecto |

## Sistema de Toasts

```typescript
interface Toast {
  id: string;              // crypto.randomUUID()
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration: number;        // ms, 0 = persistente
  dismissible: boolean;    // false para SSE status
}

// Reducer:
case 'TOAST_SHOW':
  return { ...state, toasts: [...state.toasts, action.toast].slice(-5) };
case 'TOAST_DISMISS':
  return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };

// Posicionamiento: fixed bottom-4 right-4, stack vertical
// Animación: slide-in-right (enter) + fade-out (exit, 300ms)
// Auto-dismiss: 5s para success/info, persistente para error
```

## JobQueue — Concurrencia 30

```typescript
// job-queue.ts — cambio mínimo
const CONCURRENCY = parseInt(process.env.CONCURRENCY_LIMIT || '30', 10);
```

**Consideraciones de recursos**: yt-dlp + FFmpeg en paralelo para 30 videos pueden consumir ~4GB RAM y saturar CPU en equipos modestos. Mitigación: documentar `CONCURRENCY_LIMIT` como variable de entorno configurable; valor default 30 para usuarios con hardware moderno; en el futuro añadir auto-detección de CPU cores.

## SE ELIMINAN

| Archivo | Motivo |
|---------|--------|
| `packages/web/src/services/api.ts` — función `createSSEConnection` | Sustituida por `SSEClient.connect()` en `sse-client.ts` |

## Testing Strategy

| Nivel | Qué probar | Enfoque |
|-------|-----------|---------|
| TypeScript | Compilación sin errores | `tsc --noEmit` (existente) |
| Build | Vite + Express compilan | `npm run build` (existente) |
| Visual | Paleta, skeletons, toasts, responsive | Verificación manual de todos los componentes |
| SSE | Reconexión tras caída de red | Prueba manual: desconectar WiFi → verificar reconexión |

## Migration / Rollout

No se requiere migración. Rollback: revertir commit. Sin migraciones de datos, cambios en API REST, ni lógica de descarga afectada.

## Open Questions

- [ ] ¿Se debe limitar el heartbeat solo a clientes SSE con jobs activos o a todos?
- [ ] ¿Los toasts deben persistir tras RESET del estado o limpiarse junto con todo?

## Size Forecast

- **Estimated**: ~1200 líneas (850 additions, 350 deletions)
- **400-line budget risk**: HIGH — este cambio excede el presupuesto de 400 líneas. Se recomienda PR único con excepción `size:exception` o división en 2 PRs encadenados: (1) infraestructura (SSE, i18n, paleta, skeletons) + (2) componentes (toasts, accesibilidad, playlist-30, concurrencia-30).
