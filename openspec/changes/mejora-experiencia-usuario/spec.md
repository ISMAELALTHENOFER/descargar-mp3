# Especificación: Mejora Integral de Experiencia de Usuario

## CAP-01: Reconexión Automática de SSE

**Propósito**: El frontend DEBE reconectarse automáticamente al stream SSE cuando la conexión se interrumpe, usando backoff exponencial y heartbeat del servidor.

**Comportamiento esperado**:
- El servidor DEBE enviar un heartbeat cada 15 segundos (`event: heartbeat`) a todos los clientes SSE
- El cliente DEBE detectar pérdida de conexión si no recibe heartbeat en 45 segundos (3 ciclos)
- El cliente DEBE aplicar backoff exponencial: 1s, 2s, 4s, 8s, 16s, 30s máximo
- El cliente DEBE incluir `Last-Event-ID` en la reconexión para idempotencia
- El cliente NO DEBE duplicar eventos ya procesados (dedup por ID)
- El cliente DEBE notificar al usuario con un indicador visual de reconexión en curso

**Escenarios**:
- DADO un stream SSE activo con job en progreso al 47% CUANDO la red se interrumpe por 10s ENTONCES el cliente detecta la caída, muestra indicador "Reconectando...", y al reconectar retoma eventos nuevos sin duplicar los ya recibidos
- DADO un stream SSE reconectado CUANDO el servidor ya completó el job ENTONCES el cliente recibe el evento `done` o consulta el estado via REST (`GET /jobs/:id`)
- DADO un cliente que ha intentado 5 reconexiones con backoff máximo de 30s CUANDO todas fallan ENTONCES muestra error persistente y ofrece botón "Reconectar manualmente"

**Criterios de aceptación**:
- [ ] `SSEManager.addClient()` registra el cliente y envía heartbeat cada 15s mientras la conexión está abierta
- [ ] `SSEManager.send()` incluye campo `id` secuencial en cada evento
- [ ] El frontend crea `EventSource` con lógica de backoff (clase `SSEClient` o hook `useSSE`)
- [ ] El reducer recibe acción `SSE_RECONNECTING` para mostrar indicador visual
- [ ] Dedup por `lastEventId`: el cliente ignora eventos con `id <= lastProcessedId`
- [ ] Heartbeat ausente por >45s dispara cierre proactivo y reconexión desde el cliente

---

## CAP-02: UI en Español Neutro

**Propósito**: Toda la interfaz (frontend y mensajes de error del backend) DEBE mostrarse en español neutro/profesional, sin mezcla de idiomas.

**Comportamiento esperado**:
- El archivo `src/i18n/es.ts` DEBE contener TODOS los strings de UI como constantes exportadas (sin librería i18n)
- El backend DEBE devolver mensajes de error en español en lugar de inglés
- NO DEBE existir ningún string hardcodeado en inglés visible al usuario
- Los strings DEBEN usar español neutro, evitando regionalismos

**Escenarios**:
- DADO que el usuario pega una URL inválida y presiona "Analizar" CUANDO el backend retorna error de validación ENTONCES el mensaje visible es "URL de YouTube no válida" (no "Invalid YouTube URL")
- DADO que el rate limit se alcanza CUANDO se hacen >10 peticiones en 1 minuto ENTONCES el mensaje de error es "Demasiadas solicitudes. Intenta de nuevo más tarde."
- DADO que un job no existe en el servidor CUANDO el frontend consulta `/jobs/xxx` ENTONCES el error es "Tarea no encontrada" (no "Job not found")
- DADO el renderizado inicial del header CUANDO la app carga ENTONCES el título es "Descargar MP3" y todos los labels son español

**Criterios de aceptación**:
- [ ] Archivo `packages/web/src/i18n/es.ts` creado con >50 constantes exportadas
- [ ] Todos los componentes importan strings desde `i18n/es.ts` (no strings inline)
- [ ] `error-handler.ts`: mensaje 500 traducido a "Error interno del servidor"
- [ ] `validate-url.ts`: mensajes traducidos ("URL de YouTube no válida", "Debe ser una URL de YouTube válida")
- [ ] `rate-limit.ts`: mensajes `message.error` en español
- [ ] Controladores (`download.controller.ts`): mensajes de error en español
- [ ] Code review confirma 0 strings en inglés en toda la UI y respuestas de error del backend

---

## CAP-03: Sistema de Notificaciones Toast

**Propósito**: Las notificaciones (errores, éxito, información) DEBEN mostrarse como toasts no bloqueantes con cierre manual y auto-dismiss a los 5 segundos.

**Comportamiento esperado**:
- El sistema DEBE soportar múltiples toasts simultáneos (stack vertical)
- Cada toast DEBE tener: tipo (info/success/error/warning), mensaje, botón de cierre
- Los toasts DEBEN cerrarse automáticamente tras 5 segundos (pausado en hover)
- El usuario DEBE poder cerrar manualmente cualquier toast con botón X
- Los toasts DEBEN tener animación de entrada (slide-in desde derecha) y salida (fade-out)
- El toast DEBE ser accesible: `role="alert"`, `aria-live="polite"`

**Escenarios**:
- DADO que una descarga batch de 10 videos completa con 2 errores CUANDO el último job termina ENTONCES aparecen 2 toasts: uno success ("8 descargas completadas") y uno warning ("2 fallaron"), ambos auto-dismiss a 5s
- DADO un toast de error con mensaje largo CUANDO el usuario hace hover sobre él ENTONCES el timer de auto-dismiss se pausa hasta que el mouse sale
- DADO 3 toasts visibles CUANDO el usuario hace clic en la X del segundo ENTONCES solo ese toast se cierra con fade-out, los demás permanecen

**Criterios de aceptación**:
- [ ] Componente `ToastContainer` renderiza en portal al final del body
- [ ] Context `ToastContext` con `showToast(type, message)` expuesto a toda la app
- [ ] El reducer de `App.tsx` incluye acciones `TOAST_SHOW` y `TOAST_DISMISS`
- [ ] Cada toast tiene `role="alert"` y `aria-live="polite"`
- [ ] Auto-dismiss: 5000ms, se reinicia si el mensaje cambia, se pausa en hover
- [ ] Animaciones CSS: `toast-enter` (slide-in right, 300ms), `toast-exit` (fade-out, 200ms)
- [ ] El banner de error inline actual (`state.error`) se elimina — toda notificación usa toast

---

## CAP-04: Estados Visuales de Carga y Error

**Propósito**: Todo componente que dependa de datos asíncronos DEBE mostrar skeletons durante carga, spinner cuando el tiempo es indeterminado, estado vacío con mensaje, y estado de error con acción de reintento.

**Comportamiento esperado**:
- `Skeleton` genérico DEBE tener variantes: `text`, `card`, `image`, `list`
- Las dimensiones del skeleton DEBEN coincidir con el contenido real para evitar layout shift
- El spinner DEBE usarse para operaciones sin progreso definido (análisis de URL, fetch de playlist)
- El estado vacío DEBE mostrar mensaje descriptivo contextual (no "null" o espacio en blanco)
- El estado de error DEBE incluir un botón de acción ("Reintentar", "Cerrar")
- La imagen de thumbnail DEBE mostrar un placeholder SVG cuando falle la carga (`onError`)

**Escenarios**:
- DADO que el usuario pega una URL y presiona "Analizar" CUANDO la petición está en vuelo ENTONCES `VideoPreview` y `RelatedList` muestran skeletons (card skeleton y 4 item skeletons respectivamente)
- DADO que la imagen del thumbnail de un video falla al cargar CUANDO el navegador dispara `onError` ENTONCES se muestra un placeholder SVG (ícono de música genérico)
- DADO que la playlist tiene 0 videos CUANDO el backend retorna `items: []` ENTONCES se muestra el mensaje "Esta playlist no contiene videos" en lugar de un espacio vacío
- DADO que el análisis de URL falla con error de red CUANDO el usuario ve el toast de error ENTONCES el toast incluye un botón "Reintentar" que vuelve a llamar a `handleAnalyze`

**Criterios de aceptación**:
- [ ] Componente `Skeleton` con props: `variant ('text' | 'card' | 'image' | 'list')`, `width`, `height`, `className`
- [ ] `VideoPreview.tsx`: skeleton durante `ANALYZING`, placeholder SVG en `onError` de `<img>`
- [ ] `RelatedList.tsx`: 4 skeleton items durante carga, mensaje "Sin videos relacionados" si array vacío
- [ ] `PlaylistView.tsx`: grid skeletons durante carga, mensaje "Playlist sin contenido" si 0 items
- [ ] `QueuePanel.tsx`: skeleton inicial cuando la cola está cargando
- [ ] `ProgressBar.tsx`: modo indeterminate con animación cuando el progreso es 0% y el estado es `queued`
- [ ] Los skeletons usan `animate-pulse` y dimensiones fijas (sin porcentajes que causen layout shift)
- [ ] Toast de error incluye prop `action?: { label: string; onClick: () => void }` para botón de acción

---

## CAP-05: Identidad Visual

**Propósito**: La app DEBE tener un rediseño visual completo con paleta de colores definida, escala tipográfica, espaciado consistente, glass reducido, y transiciones suaves en todas las interacciones.

**Comportamiento esperado**:
- Paleta DEBE usar azul pizarra (`#1e293b`) como fondo principal, cobre (`#d97706`) como acento
- La tipografía DEBE tener escala definida: `text-sm` para labels, `text-base` para cuerpo, `text-lg` para títulos
- El espaciado DEBE ser consistente: `gap-6` entre secciones, `p-8` en contenedores principales
- El efecto glass (`backdrop-blur`) DEBE limitarse al header — NO en cards ni paneles
- Las micro-interacciones DEBEN usar `transition-all duration-200`
- Los componentes DEBEN tener animación de salida (exit) además de entrada
- El QueuePanel DEBE ser responsive: `w-full max-w-sm` en mobile, `w-80` en desktop

**Escenarios**:
- DADO que el usuario abre la app en un viewport de 375px CUANDO el QueuePanel está visible ENTONCES ocupa `w-full` (ancho completo) en lugar de `w-96` fijo que desbordaba
- DADO que el usuario hace hover sobre una card de playlist CUANDO el cursor entra ENTONCES la card aplica `scale-[1.02]` con `transition-all duration-200` y sombra sutil
- DADO que un componente se desmonta (ej: VideoPreview al hacer reset) CUANDO se remueve del DOM ENTONCES aplica `animate-fade-out` (opacity 1→0, 200ms) antes de desaparecer

**Criterios de aceptación**:
- [ ] `tailwind.config` extendido con colores: `surface: '#1e293b'`, `accent: { DEFAULT: '#d97706', hover: '#b45309' }`
- [ ] `index.css` actualizado: `.glass` solo en header, nuevas utilidades `.card-solid` (sin blur), `.btn-primary` con nuevos colores
- [ ] Escala tipográfica documentada en CSS custom properties o `@layer base`
- [ ] QueuePanel: clases responsive (`w-full max-w-sm lg:w-80 lg:max-w-none`)
- [ ] Transiciones: `transition-all duration-200` en botones, cards, inputs
- [ ] Animación `animate-fade-out` definida en `tailwind.config`: `'fade-out': { '0%': { opacity: '1' }, '100%': { opacity: '0' } }`
- [ ] Verificación visual: header glass, resto sólido — sin blur en cards ni paneles

---

## CAP-06: Accesibilidad Básica (WCAG 2.2 AA)

**Propósito**: La app DEBE cumplir con WCAG 2.2 nivel AA en contraste de color, estados de foco visibles, labels en formularios, y atributos ARIA en elementos interactivos.

**Comportamiento esperado**:
- El texto secundario (`text-slate-300` sobre `#1e293b`) DEBE tener contraste ≥ 4.5:1 (~7:1 real)
- Todo elemento interactivo DEBE mostrar `focus-visible:ring-2` en navegación por teclado
- Todo SVG interactivo (botones ícono) DEBE tener `aria-label`
- Todo `<select>` e `<input>` DEBE tener `<label>` asociado vía `htmlFor`/`id` o wrapper
- Los checkboxes de playlist DEBEN tener `focus-visible` visible

**Escenarios**:
- DADO un usuario navegando con Tab CUANDO el foco llega al `<select>` de calidad ENTONCES se muestra un anillo de foco visible (`ring-2 ring-accent`) y el label "Calidad:" está asociado
- DADO un lector de pantalla CUANDO llega al botón de analizar (ícono lupa) ENTONCES anuncia "Analizar URL" (via `aria-label`)
- DADO un usuario con visión reducida CUANDO lee el texto "128 kbps" en el selector de calidad ENTONCES el contraste es ≥ 4.5:1 contra el fondo
- DADO un usuario navegando por checkboxes de playlist con Tab CUANDO un checkbox recibe foco ENTONCES se muestra `ring-2 ring-offset-1` visible alrededor del checkbox

**Criterios de aceptación**:
- [ ] `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface` en todos los elementos interactivos (botones, inputs, selects, checkboxes)
- [ ] `aria-label` en: botón analizar, botón download, botón reset, botón cerrar (toast), botón toggle cola, botones select-all/deselect-all
- [ ] `<label htmlFor={id}>` asociado a `<select id={id}>` en `DownloadButton.tsx`
- [ ] `<label>` wrapper o `aria-label` en `UrlInput.tsx`
- [ ] Contraste verificado: texto primario ≥ 7:1, secundario ≥ 4.5:1 sobre `#1e293b`
- [ ] `role="alert"` en toast container, `role="progressbar"` en ProgressBar, `aria-valuenow` dinámico
- [ ] `role="status"` en indicador de reconexión SSE

---

## CAP-07: Playlist hasta 30 Canciones

**Propósito**: La extracción de playlist DEBE obtener hasta 30 canciones (en lugar de ilimitado), y el frontend DEBE mostrar todas en un grid sin paginación.

**Comportamiento esperado**:
- yt-dlp DEBE ejecutarse con `--playlist-end 30` para limitar la extracción
- El backend DEBE devolver máximo 30 items en el endpoint `/playlist`
- El frontend DEBE renderizar un grid responsivo de hasta 30 cards de playlist
- Las acciones "Seleccionar todo" / "Deseleccionar todo" DEBEN estar en español
- El botón de descarga DEBE reflejar el conteo real de seleccionados: "Descargar {n} seleccionados"

**Escenarios**:
- DADO una playlist de YouTube con 150 videos CUANDO el usuario la analiza ENTONCES el backend extrae solo los primeros 30 y el frontend muestra exactamente 30 cards en grid
- DADO una playlist con solo 8 videos CUANDO el usuario la analiza ENTONCES el backend extrae los 8 (sin error) y el frontend muestra 8 cards — el límite de 30 es un máximo, no un requisito
- DADO que el usuario selecciona 5 de 30 items CUANDO hace clic en "Descargar 5 seleccionados" ENTONCES se inicia batch download con solo esos 5 URLs

**Criterios de aceptación**:
- [ ] `YtDlpStrategy.getPlaylistInfo()` agrega `--playlist-end 30` a los args de yt-dlp
- [ ] `PlaylistView.tsx`: grid con `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` para hasta 30 items
- [ ] Contador en botón: `Descargar ${n} seleccionados` (no "Download {n} Selected")
- [ ] Labels "Seleccionar todo" / "Deseleccionar todo" en español
- [ ] Scroll del grid es manejable: `max-h-[70vh] overflow-y-auto` con scrollbar estilizada

---

## CAP-08: Concurrencia de Descarga a 30

**Propósito**: La cola de trabajos DEBE permitir hasta 30 descargas simultáneas (en lugar de 3) para batch processing eficiente.

**Comportamiento esperado**:
- `JobQueue` DEBE cambiar `CONCURRENCY` de `3` a `30`
- El valor DEBE ser configurable via variable de entorno `CONCURRENCY_LIMIT` con default 30
- El SSE DEBE reflejar correctamente el progreso de múltiples jobs simultáneos
- La documentación DEBE advertir que 30 descargas simultáneas pueden saturar CPU/memoria

**Escenarios**:
- DADO un batch de 30 videos CUANDO se inicia la descarga ENTONCES los 30 jobs se procesan en simultáneo (no serializados en grupos de 3), y el frontend recibe eventos `batch-progress` para todos
- DADO `CONCURRENCY_LIMIT=10` configurado CUANDO se inicia un batch de 30 videos ENTONCES se procesan en grupos de 10 (respetando la variable de entorno)
- DADO 30 descargas simultáneas en una máquina con 4GB RAM CUANDO yt-dlp + FFmpeg se ejecutan en paralelo ENTONCES puede ocurrir alta carga — la mitigación es documentar el riesgo y recomendar un límite conservador

**Criterios de aceptación**:
- [ ] `job-queue.ts`: `CONCURRENCY` cambia de `'3'` a `'30'` como default de `process.env.CONCURRENCY_LIMIT`
- [ ] `SSEManager` mantiene performance con 30 clientes enviando eventos simultáneos (sin memory leak)
- [ ] El frontend maneja 30 eventos `batch-progress` con actualizaciones de estado sin degradación visible
- [ ] `AGENTS.md` o `README.md` documenta la variable `CONCURRENCY_LIMIT` y advierte sobre uso de recursos

---

## Requisitos No Funcionales

| Categoría | Requisito |
|-----------|-----------|
| **Rendimiento** | La UI no DEBE bloquearse durante batch de 30 descargas; React state updates DEBEN usar batching |
| **Rendimiento** | El heartbeat SSE (cada 15s) no DEBE introducir overhead de red significativo |
| **Rendimiento** | Los skeletons NO DEBEN causar layout shift (CLS = 0 para estos componentes) |
| **Accesibilidad** | Contraste ≥ 4.5:1 en TODO texto de UI (WCAG AA) |
| **Accesibilidad** | Navegación completa vía teclado (Tab, Enter, Escape, Space) en TODO el flujo principal |
| **Compatibilidad** | Funcionalidad completa en Chrome 90+, Firefox 90+, Edge 90+, Safari 15+ |
| **Compatibilidad** | `EventSource` API con polyfill o fallback para navegadores sin soporte nativo |
| **Mantenibilidad** | Los strings de UI centralizados en `i18n/es.ts` — agregar un idioma requiere solo duplicar el archivo |

---

## Dependencias entre Capacidades

```
CAP-02 (ui-espanol)
  ├── CAP-03 (toast) — los textos de toast deben ser en español
  ├── CAP-04 (ux-states) — mensajes de empty/error deben ser en español
  ├── CAP-05 (visual-identity) — labels y headers deben ser en español
  ├── CAP-07 (playlist-30) — botones y contadores deben ser en español
  └── CAP-08 (concurrency-30) — mensajes de batch deben ser en español

CAP-01 (sse-reconnect) — independiente, se integra con CAP-03 para notificar reconexión
CAP-03 (toast) — consume CAP-02 para textos, notifica eventos de CAP-01 y CAP-04
CAP-05 (visual-identity) — base CSS que CAP-04 (skeletons) y CAP-06 (focus states) extienden
CAP-06 (accessibility) — se aplica transversalmente a CAP-03, CAP-04, CAP-05, CAP-07

CAP-07 (playlist-30) + CAP-08 (concurrency-30) — cambio combinado: extrae hasta 30 y descarga hasta 30 en paralelo
```

**Orden recomendado de implementación**: CAP-05 → CAP-02 → CAP-04 → CAP-03 → CAP-06 → CAP-01 → CAP-07 → CAP-08

---

## Edge Cases

| Edge Case | Capacidad | Comportamiento esperado |
|-----------|:---------:|--------------------------|
| Red cae durante SSE y servidor completa el job antes de reconexión | CAP-01 | Cliente detecta estado `done` via REST (`GET /jobs/:id`) al reconectar |
| Usuario cierra la pestaña con SSE activo | CAP-01 | `SSEManager` detecta `res.on('close')` y limpia el cliente |
| Playlist tiene menos de 30 items (ej. 8) | CAP-07 | `--playlist-end 30` no causa error; se extraen los 8 disponibles |
| yt-dlp no está instalado o falla | CAP-07 | Error traducido: "No se pudo analizar la playlist. Verifica que yt-dlp esté instalado." |
| Rate limit alcanzado durante batch de 30 | CAP-08 | El rate-limit DEBE ajustarse para permitir 30 descargas (o se documenta como limitación) |
| FFmpeg no está en PATH | CAP-08 | Error por job, visible en QueuePanel y toast: "FFmpeg no encontrado. La conversión falló." |
| Thumbnail HTTP 404 o bloqueado por CORS | CAP-04 | Placeholder SVG inline, sin console error visible al usuario |
| Usuario con conexión lenta (2G) | CAP-01 | Backoff exponencial maneja latencia; timeout de heartbeat ajustado a 60s en conexiones lentas |
| Todos los jobs del batch fallan | CAP-03 | Toast error: "Ninguna descarga se completó. {n} errores." |
| Usuario inicia descarga sin permisos de File System Access API | CAP-04 | Toast warning: "No se pudo guardar automáticamente. Usa el enlace de descarga manual." |
