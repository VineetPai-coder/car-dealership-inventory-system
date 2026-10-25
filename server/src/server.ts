/**
 * server.ts — Entry point
 *
 * The only file that calls app.listen().
 * Excluded from test coverage because there is nothing to unit-test here —
 * it just binds a port.
 *
 * To start the dev server:  npm run dev:server
 * To start in production:   npm start (after npm run build:server)
 */

import app from './app.js';

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`🚗 Car Dealership API running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});
