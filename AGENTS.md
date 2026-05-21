# AGENTS.md — descargar-mp3

## Build / Lint / Test Commands

```bash
# Install all dependencies (monorepo)
npm install

# Run dev (server + Vite frontend simultaneously)
npm run dev

# Run server only
npm run dev -w packages/server

# Run frontend only
npm run dev -w packages/web

# TypeScript type-check server
npm run lint -w packages/server

# TypeScript type-check web
npm run lint -w packages/web

# Build both packages
npm run build

# Build web only (production Vite build)
npm run build -w packages/web

# Production start (serves web/dist via Express)
npm run start -w packages/server
```

No test framework configured yet. When added, use `npm test -w packages/server` for server tests and `npm test -w packages/web` for frontend tests.

## Code Style Guidelines

### Imports
- Use ES module syntax with `.js` extensions for relative imports (e.g., `import { foo } from './bar.js'`)
- External packages first, blank line, then internal modules
- Internal imports use full relative paths from source file
- Avoid barrel/index re-exports for internal modules (explicit paths preferred)
- Type imports should use `import type { Foo }` when only types are used

### Formatting
- No Prettier or ESLint configured — use consistent manual formatting
- 2-space indentation
- Semicolons required
- Single quotes for strings
- Trailing commas in multiline objects/arrays
- Max line length: ~100 chars (soft)
- Use parentheses around arrow function params even for single params

### TypeScript Conventions
- Strict mode enabled in both packages
- Prefer `interface` over `type` for object shapes
- Use `type` for unions, intersections, and utility types
- Avoid `any` — use `unknown` then narrow
- Async functions always return `Promise<T>`, never `Promise<void | T>`
- Use `as T` casts only when the type system cannot infer correctly (e.g., p-queue return types)
- Zod for runtime validation (see `validate-url.ts`)
- Node.js native `crypto.randomUUID()` for ID generation

### Naming Conventions
- **Files**: `kebab-case.ts` for modules (e.g., `metadata.service.ts`, `ffmpeg-converter.ts`)
- **Classes**: `PascalCase`
- **Functions/variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE` for environment-derived values, `camelCase` for module-level consts
- **Types/Interfaces**: `PascalCase`
- **Controllers**: named exports, e.g., `export async function analyze()`
- **Files that export a single class**: match filename to class name

### Error Handling
- Express async controllers: wrap in try/catch and call `next(err)` for Express error handler
- Services: throw `Error` with descriptive message (no custom error classes for MVP)
- Never expose stack traces in production; only show error details in development
- Validate input at the middleware layer (Zod schemas) before reaching controllers
- SSE errors are sent as typed events to the client

### Architecture Patterns
- **Clean Architecture layers**: `api/` (controllers, middleware, routes) → `core/` (business logic) → `services/` (infrastructure) → `infra/` (external concerns)
- **Strategy Pattern**: `downloader/` with `DownloaderFactory` selecting between `YtdlStrategy` and `YtDlpStrategy`
- **Observer Pattern**: `SSEManager` broadcasts events to SSE clients
- **Queue Pattern**: `JobQueue` wraps `p-queue` for concurrency control
- **Cache-aside**: `MetadataCache` checks cache first, falls through to ytdl-core

### State Management (Frontend)
- Use `useReducer` for complex UI state (see `App.tsx`)
- Avoid state management libraries — the app is simple enough for React built-ins
- SSE events drive state transitions
- All API calls go through `services/api.ts`

### CSS / Styling
- Tailwind CSS utility classes (no CSS modules or styled-components)
- Custom utilities defined in `@layer components` in `index.css` (`.glass`, `.btn-primary`, `.card`, etc.)
- Dark mode via `class="dark"` on `<html>` — `bg-surface` is the base background
- Animations: `animate-fade-in` for mount transitions, standard Tailwind for everything else

### File Structure
```
packages/server/src/     — Express backend
packages/web/src/        — React frontend
```

- Each controller file maps to a resource (analyze, download, playlist)
- Services are singletons exported as named consts (e.g., `export const jobQueue = new JobQueue()`)
- Never import from `../core/types.js` in `api/` — controllers import services, types come from `core/types.ts`
