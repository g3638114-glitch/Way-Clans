# AI Development Rules - Way Clans

This document outlines the technical stack and development standards for the Way Clans Telegram MiniApp.

## 🚀 Tech Stack

- **Backend**: Node.js with Express framework for API and static file serving.
- **Database**: Supabase (PostgreSQL) for persistent storage of users, buildings, and market data.
- **Frontend**: Vanilla JavaScript (ES Modules) with a modular architecture (no heavy frameworks like React/Vue).
- **Telegram Integration**: `telegraf` for bot commands and the Telegram WebApp SDK for MiniApp features.
- **Styling**: Modular CSS with custom animations, utilizing a mobile-first responsive design.
- **Database Management**: Custom idempotent migration system in `src/database/migrations.js` for schema evolution.
- **Authentication**: Secure user identification via Telegram `initData` verification on the server.

## 🛠 Library & Architecture Rules

### Backend
- **Express**: Use for all API routing. Keep routes in `src/routes/` and business logic in `src/services/`.
- **Supabase SDK**: Use `@supabase/supabase-js` for all database interactions within services.
- **Telegraf**: Use for all Telegram Bot API interactions (commands, messages, webhooks).
- **Migrations**: Always add new database changes to `src/database/migrations.js` using idempotent SQL (`IF NOT EXISTS`).

### Frontend
- **Vanilla JS**: Do not add frontend frameworks. Use direct DOM manipulation and ES Modules.
- **State Management**: Use the global `appState` in `public/js/utils/state.js`. Never store state directly in the DOM.
- **API Communication**: All server requests must go through the `apiClient` in `public/js/api/client.js`.
- **UI Components**: Keep UI rendering logic in `public/js/ui/builders.js` and modal logic in `public/js/ui/modals/`.
- **Styling**: Add new styles to specific files in `public/css/` rather than one giant stylesheet.

### General
- **Environment Variables**: All secrets (tokens, URLs) must be stored in `.env` and accessed via `process.env`.
- **Error Handling**: Use descriptive error messages that can be displayed to the user via `tg.showAlert()`.
- **Idempotency**: Ensure all game actions (collecting, upgrading, buying) are protected against double-clicks using the `withOperationLock` utility.