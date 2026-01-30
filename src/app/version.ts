/**
 * TICKET-24: 应用版本号（由 vite define 注入，或 dev）
 */
export const APP_VERSION = (import.meta as { env?: { VITE_APP_VERSION?: string } }).env?.VITE_APP_VERSION ?? 'dev'
