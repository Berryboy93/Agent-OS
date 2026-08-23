export const envView = {
  apiBaseUrl: process.env.API_URL ?? 'http://localhost:5000',
  wsUrl: process.env.WS_URL ?? 'ws://localhost:5000',
  mode: process.env.NODE_ENV ?? 'development',
};
