// ============================================================
// Единая точка правды для базового URL API
// ============================================================
//
// В dev-режиме (npm run dev):
//   API_BASE = '' → все запросы идут на /api/... ,
//   Vite проксирует их на http://localhost:3001
//
// В production (npm run build → GitHub Pages):
//   API_BASE = 'https://cinevault-backend-xm6v.onrender.com'
//   → все запросы идут напрямую на Render
//
// import.meta.env.PROD — true при production build, false в dev
// ============================================================

const RENDER_BACKEND = "https://cinevault-backend-xm6v.onrender.com";

export const API_BASE = import.meta.env.PROD ? RENDER_BACKEND : "";

// Полный путь к API: используется в сервисах
export const API_URL = `${API_BASE}/api`;
