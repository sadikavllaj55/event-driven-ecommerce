# Marketplace Frontend

React, TypeScript, Vite, and TanStack Query. Run commands from this directory.

```bash
npm ci
npm run dev
```

`VITE_API_URL` defaults to `http://localhost:8080`. The regular dev server needs the backend services for real marketplace requests.

## Verification

```bash
npm run build
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

`npm run test:watch` runs Vitest interactively. Unit and integration tests use React Testing Library and MSW to exercise guest browsing, account switching, failed queries, resumable photo uploads, API validation, navigation guards, and saga polling.

Playwright starts an isolated Vite server on port 5179 and intercepts API requests. Login and checkout run in desktop and mobile Chromium. Backend containers are not required, but these tests do not verify the real gateway, payment processing, or RabbitMQ saga. Ensure port 5179 is available. Install Chromium once locally and in fresh CI environments.

Private query keys include the user ID and are canceled and removed on auth changes. Checkout refreshes both cart and orders. Orders poll every two seconds while any status is `pending` or `stock_reserved`, and stop at terminal states or request failures. API contracts are validated with Zod.

Protected routes share an authentication guard; admin routes additionally check the role. These guards are UI controls, not a replacement for backend authorization. Secondary pages are lazy-loaded; route errors preserve the surrounding navigation.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
