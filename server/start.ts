// Production entry point: `npm start` (after `npm run build`). Sets NODE_ENV
// portably, then starts the server, which also serves the built frontend.
process.env.NODE_ENV ??= 'production'
await import('./index')
