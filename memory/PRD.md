# OmniverseOS — Product Requirements

## Problem Statement
Build a fully functional AI operating system called OmniverseOS, combining ChatGPT, Notion, Trello, Discord, Spotify, Google Calendar, YouTube, Netflix watchlists, finance management, file manager, AI image generation, voice assistant, memory system, code editor, dashboard widgets, browser tabs, task management, and analytics into one futuristic cyberpunk interface. Auth, dark mode, notifications, search, command palette, persistent storage.

## Architecture
- Backend: FastAPI + MongoDB + EMERGENT_LLM_KEY (Claude/GPT/Gemini), bcrypt+JWT auth, SSE streaming for AI chat, gpt-image-1 for image gen
- Frontend: React + Tailwind + Framer Motion + recharts. Window-manager OS shell with dock, topbar, command palette (⌘K), notification center
- Persistence: localStorage for window state + notifications; MongoDB for all user data

## Implemented Modules (18)
Dashboard · AI Chat (streaming) · Image Gen · Voice (Web Speech) · Memory · Notes · Tasks (Kanban) · Calendar · Music · Videos (YouTube) · Watchlist · Files · Code Editor · Finance · Analytics · Discord · Browser · Settings

## Test Credentials
demo@omniverse.io / omniverse123 (in /app/memory/test_credentials.md)

## Next Backlog (P1)
- Drag-resize windows
- AI image gen via Gemini Nano Banana option
- Real-time collab on notes
- Persistent music player audio
- Export/import workspace
