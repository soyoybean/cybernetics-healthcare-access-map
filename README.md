# React + Vite

## Comments Backend

This app now expects a Vercel serverless comments API at `/api/comments` backed by Supabase.

Deployment notes:

- Add a Supabase project with a `comments` table.
- Set `NEXT_PUBLIC_SUPABASE_URL` in the environment.
- Set `SUPABASE_SERVICE_ROLE_KEY` in the server environment.
- Set `TURNSTILE_SECRET_KEY` in the server environment.
- Set `VITE_TURNSTILE_SITE_KEY` in the frontend environment.
- The checked-in schema is also available at `db/comments.sql`.
- Comments are stored in the current Supabase table columns: `display_name`, `stakeholder`, `specific_identity`, `note`, `email`, `created_at`, and `page_path`.
- `page_path` stores the selected graph target as `node:<id>` or `edge:<id>`.
- `specific_identity` and `email` are stored privately and are not returned to the public UI.
- The old local CSV file (`comments_db.csv`) is no longer used by the app runtime.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
