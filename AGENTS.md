# PARA App — Agent Coding Rules

> These rules apply to **every file change** made by any AI agent in this project.
> They must be followed without exception.

---

## 1. General Engineering Standards

- Always follow the **ANALYZE → PLAN → IMPLEMENT → TEST → REVIEW** cycle before marking any task done.
- Make the **smallest correct change** that satisfies the requirement. Do not rewrite unrelated code.
- Preserve all existing **comments and docstrings** unless they are directly affected by a change.
- Never expose internal errors, stack traces, or secrets to end users.
- Every user-facing operation must handle **loading, success, empty, and error** states.

---

## 2. Gradle / Android (`android/`)

- **`import` statements must always appear at the very top of any `.gradle` file**, before all `apply`, `plugins {}`, or other directives.
- Prefer **fully-qualified Groovy class names** (e.g. `new groovy.json.JsonSlurper()`) in `.gradle` files to avoid IDE false positives from lightweight Groovy language servers.
- Always wrap **file I/O operations** (e.g. reading `package.json`) in null/existence checks or try-catch blocks to prevent build crashes on missing files.
- Do not add new Gradle dependencies without checking if the functionality already exists in the current dependency tree.
- Keep `build.gradle` signing config values in `gradle.properties` or environment variables — never hard-coded in the file.

---

## 3. TypeScript / React Native

- **All new code must be TypeScript** — no plain `.js` files in `src/`.
- Use **strict typing** — avoid `any`. Prefer `unknown` and narrow with type guards.
- All types mirroring the database schema must live in `src/types/`.
- Use `react-hook-form` + `zod` for all forms. Never use uncontrolled bare `TextInput` state for form data.
- Use `zustand` stores (`src/store/`) for global state. Do not lift state into components unnecessarily.
- Use `StyleSheet.create()` or `nativewind` — never inline style objects created per-render.
- All network/async calls must handle errors and update UI state accordingly (no silent failures).
- Navigation must be role-aware: Passenger, Driver, Admin screens must never be reachable across roles.

---

## 4. Supabase

- **Never bypass Row Level Security (RLS).** All DB access from the client must respect RLS policies.
- Sensitive operations (ride matching, fare calculation, accepting/declining rides) must go through **Edge Functions**, not direct client queries.
- Always use parameterized queries or Supabase's typed client — never string-interpolate SQL.
- Realtime subscriptions must be **unsubscribed on component unmount** to avoid memory leaks.
- Do not expose `service_role` keys in client-side code. Only `anon` key is allowed in the app.
- All migration files go in `supabase/migrations/` with a timestamp prefix (e.g. `20260818000001_init.sql`).

---

## 5. Environment & Secrets

- All environment variables must be defined in `.env.example` alongside `.env`.
- Use `react-native-config` to access env vars in the app — never `process.env` directly in React Native.
- Never commit `.env` to version control (it is `.gitignore`d).
- API keys (Google Maps, Supabase) must never be hard-coded in source files.

---

## 6. Security

- Validate all user input on both client (zod) and server (Edge Function / RLS policy) sides.
- Enforce **seat capacity** checks server-side in Edge Functions — do not rely solely on client validation.
- Passwords are handled entirely by Supabase Auth — never store or log them.
- All HTTP/WS traffic uses HTTPS/WSS — no plain HTTP endpoints.

---

## 7. File & Folder Conventions

```
src/
  api/          — Supabase client calls only (no business logic)
  components/   — Reusable UI components (no direct store access in leaf components)
  hooks/        — Custom React hooks
  navigation/   — Navigator files only (no business logic)
  screens/      — Screen components (auth/, passenger/, driver/, admin/)
  store/        — Zustand stores
  types/        — TypeScript types mirroring DB schema
  utils/        — Pure utility functions (fareCalculator, distance, validators)
```

- One component per file. File name must match the exported component name.
- Screen files end in `Screen.tsx`. Navigator files end in `Navigator.tsx`.

---

## 8. Forbidden

- No `expo`, `expo-cli`, `expo-router`, or any Expo package
- No `any` type in TypeScript (except with explicit justification comment)
- No inline SQL string interpolation
- No hard-coded API keys or secrets anywhere in source
- No `service_role` Supabase key in client-side code
- No direct DB writes for ride state transitions (use Edge Functions)
- No `console.log` left in production paths (use a proper logger or remove before commit)
