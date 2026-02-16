# Inventory Dashboard — Shopify + Remix Technical Assessment

A Remix (React Router v7) app implementing an Inventory Dashboard with streaming data, optimistic UI, and resilient error boundaries — all styled with Shopify Polaris.

## Setup

```bash
npm install
npm run dev
# Visit http://localhost:5173/dashboard
```

## Key Implementation Choices

### Task 2: Optimistic UI (Claim Stock)

Each inventory row gets its own `useFetcher` instance. This is critical — it means clicking "Claim One" on Widget A doesn't affect Widget B's UI state. The fetcher scopes both the pending state and error handling to a single row.

**How optimistic updates work:**
- When the user clicks "Claim One", the form submits via `fetcher.Form` with the item's `id` and `currentStock` as hidden fields.
- While `fetcher.state === "submitting"`, we read `fetcher.formData.get("currentStock")` and display `currentStock - 1` as the optimistic stock count.
- The button shows a loading spinner (`loading` prop) and is disabled while the fetcher is not idle, preventing double-submits.
- **Rollback on error:** If the server action returns an error (e.g. "Out of stock"), React Router automatically revalidates the loader. The real stock from `MOCK_DB` replaces the optimistic value — no manual `useState` rollback needed.

**Why `useFetcher` over `useNavigation`:**
- `useNavigation` is global — it tracks the state of all navigations/submissions. If two rows submit simultaneously, there's no way to tell which one is pending.
- `useFetcher` is per-instance — each row has isolated `state`, `formData`, and `data`. This is required for correct per-row optimistic UI.

### Task 3: Error Boundaries (Retry Logic)

The dashboard route exports an `ErrorBoundary` component that catches errors thrown by the loader (including the 20% random API failure).

**How the error boundary works:**
- When `getInventory()` throws, React Router catches it and renders the route's `ErrorBoundary` instead of the default component.
- The page layout (Polaris `Page`, `Layout`, `Card`) is re-rendered inside the error boundary, so the page shell stays visible — only the inventory table area shows the error.
- The error message is displayed in a Polaris `Banner` with `tone="critical"`.

**Retry approach — `useRevalidator()`:**
- The "Retry" button calls `revalidator.revalidate()`, which re-invokes the route loader without a full page refresh or navigation.
- While revalidating, `revalidator.state === "loading"` drives the button's loading spinner.
- If the retry succeeds (80% chance), React Router swaps the error boundary for the default component with fresh data — no manual state management needed.
- If it fails again, the error boundary stays rendered and the user can retry again.

## Architecture

```
app/
  models/
    inventory.server.ts   # Chaos backend mock (3s delay, 20% failure)
  routes/
    dashboard.tsx          # Loader + Action + Component + ErrorBoundary
  root.tsx                 # Polaris AppProvider + styles
  routes.ts                # Route configuration
```
