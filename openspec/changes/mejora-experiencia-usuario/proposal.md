# Propuesta: Mejora Integral de Experiencia de Usuario

## Resumen Ejecutivo

La app presenta 17 pain points de UX identificados en la exploración. El más crítico: el SSE se desconecta silenciosamente y la UI queda congelada para siempre. A esto se suma UI mayoritariamente en inglés (55+ strings vs 1 en español), ausencia de skeletons y spinners, errores no dismissibles con mensajes crudos de yt-dlp, nula accesibilidad básica, y un diseño visual sin identidad propia.

Este cambio integral aborda todo en una sola entrega —incluyendo un rediseño visual completo— porque tocar todos los componentes para el rediseño hace más eficiente un solo pase que múltiples fases. Se descarta el enfoque incremental de la exploración a favor de coherencia desde el día 1.

## Problemas Actuales

| Gravedad | Problema |
|:--------:|----------|
| **Crítico** | SSE muere sin reconexión — UI congelada para siempre |
| **Crítico** | 55+ strings en inglés, 1 en español — experiencia inconsistente |
| **Alto** | Sin skeletons/spinners — contenido "salta" al renderizar |
| **Alto** | Errores no dismissibles + mensajes crudos de yt-dlp al usuario |
| **Medio** | Sin toast system; QueuePanel fijo `w-96` no responsive; sin labels accesibles |
| **Visual** | Dark-only sin personalidad, glass overuse, tipografía plana, sin transiciones de salida |

## Alcance

### Incluye
1. **SSE Reconnect** — Reconexión automática con backoff exponencial + heartbeat del servidor
2. **Internacionalización** — UI completa a español neutro/profesional (frontend + backend)
3. **Toast system** — Notificaciones con cierre manual + auto-dismiss (5s)
4. **Estados visuales** — Skeletons, spinners, estado vacío, estado de error con acción
5. **Rediseño visual** — Paleta sobria, tipografía clara, espaciado generoso, transiciones suaves
6. **Accesibilidad básica** — Contraste WCAG AA, focus states visibles, labels en formularios
7. **Fallback de imágenes** — Placeholder SVG en thumbnails rotos
8. **Identidad visual** — Creación desde cero (sin marca previa)

7. **Lista de playlists ampliada** — Extracción y visualización de hasta 30 canciones por playlist
8. **Descarga en bloques de 30** — Concurrencia aumentada a 30 descargas simultáneas (batch processing)

### NO Incluye
- Modo claro/oscuro
- Historial persistente de descargas
- Botón de pegar desde portapapeles
- Descarga ZIP / "Download All" para playlists
- i18n multilenguaje (app monousuario en español)
- Paginación de playlist (carga completa de 30 items)

## Capabilities

### Nuevas Capacidades
- `sse-reconnect`: Reconexión automática de SSE con backoff exponencial y heartbeat
- `ui-espanol`: Internacionalización a español neutro (constantes, sin librería)
- `toast-notifications`: Sistema de notificaciones toast con cierre manual y auto-dismiss
- `ux-states`: Skeletons, spinners, estados vacío y error con acción en todos los componentes
- `visual-identity`: Rediseño visual completo con paleta, tipografía, y transiciones
- `accessibility-basics`: Contraste WCAG AA, focus states, labels y aria-label
- `playlist-30`: Extracción de hasta 30 canciones por playlist; frontend muestra grid completo
- `concurrency-30`: Concurrencia de descarga aumentada de 3 a 30 simultáneas

### Capacidades Modificadas
Ninguna — no existen specs previos en `openspec/specs/`.

## Enfoque Técnico

- **SSE**: Clase `SSEClient` en `api.ts` con backoff (1s, 2s, 4s, 8s, 16s, 30s máx); heartbeat cada 15s desde `sse-manager.ts`; IDs de evento para idempotencia.
- **i18n**: Archivo `src/i18n/es.ts` con constantes exportadas (sin librería); backend traduce errores antes de responder al cliente.
- **Toast**: Componente `ToastContainer` + React context; eventos `toast-show`/`toast-dismiss` en el reducer.
- **Skeletons**: Componente `Skeleton` genérico con `animate-pulse` de Tailwind; variantes text/card/image/list.
- **Rediseño**: Paleta azul pizarra (#1e293b) + cobre (#d97706); escala tipográfica (text-sm→text-lg); espaciado gap-6/p-8; glass reducido solo al header; `transition-all` para micro-interacciones.
- **Accesibilidad**: `text-slate-300` (contraste ~7:1); `focus-visible:ring-2` global en botones/inputs; `aria-label` en icon buttons; wrapper `<label>` en selects.
- **Imágenes**: Handler `onError` → placeholder SVG inline.
- **Playlist 30**: yt-dlp con `--playlist-end 30` para limitar extracción; frontend muestra grid con hasta 30 cards.
- **Concurrencia 30**: `JobQueue` cambia `concurrency` de 3 a 30; el backend escala procesos de yt-dlp y FFmpeg en simultáneo.

## Áreas Afectadas

| Archivo | Cambio |
|---------|--------|
| `packages/web/src/services/api.ts` | SSE reconnect logic + heartbeat handling |
| `packages/web/src/App.tsx` | Reducer para toasts, nuevos estados, i18n |
| `packages/web/src/components/*.tsx` | Todos: i18n, skeletons, accesibilidad |
| `packages/web/src/index.css` | Nueva paleta, skeletons, toasts, focus states |
| `packages/web/src/i18n/es.ts` | **Nuevo** — archivo de constantes en español |
| `packages/server/src/infra/sse/sse-manager.ts` | Heartbeat |
| `packages/server/src/core/queue/job-queue.ts` | Concurrencia 3 → 30 |
| `packages/server/src/core/metadata/playlist.service.ts` | Límite `--playlist-end 30` |
| `packages/server/src/**/*.ts` | Traducción de strings de error a español |

## Riesgos

| Riesgo | Prob. | Mitigación |
|--------|:-----:|------------|
| SSE reconnect duplica eventos | Baja | IDs de evento + dedup en frontend |
| Strings sin traducir (se cuela inglés) | Media | Code review con checklist |
| Skeletons causan layout shift | Media | Dimensiones fijas = contenido real |
| Rediseño rompe layout existente | Media | Verificación visual completa antes de merge |
| 30 descargas simultáneas saturan CPU/memoria | Alta | yt-dlp + FFmpeg en paralelo puede colapsar; documentar límite recomendado y monitorear |

## Rollback

Revertir el commit completo. Todos los cambios son UI y strings; no hay migraciones de datos, cambios en API REST, ni modificaciones en lógica de descarga.

## Criterios de Éxito

- [ ] SSE reconecta automáticamente tras caída de red sin pérdida de jobs en curso
- [ ] Cero strings en inglés en frontend y backend (100% español neutro)
- [ ] Todo error en UI es dismissible (toast o banner con botón cerrar)
- [ ] Todo componente con datos asíncronos muestra skeleton durante carga
- [ ] Contraste de texto secundario ≥ 4.5:1 (WCAG AA)
- [ ] Todo `<select>` tiene `<label>` asociado; todo SVG button tiene `aria-label`
- [ ] Focus states visibles en todos los interactive elements

## Tamaño Estimado

~1000–1500 líneas (additions + deletions): Frontend ~700–1000 (componentes, CSS, i18n, SSE), Backend ~200–300 (strings, heartbeat, concurrencia, límite playlist), CSS ~100–200 (paleta, skeletons, toasts, focus).
