import { defineConfig, type Plugin } from 'vite';
import { handleScoresApi } from './server/scores.mjs';

function scoresApiPlugin(): Plugin {
  return {
    name: 'scores-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void (async () => {
          try {
            if (await handleScoresApi(req, res)) return;
            next();
          } catch (err) {
            next(err);
          }
        })();
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [scoresApiPlugin()],
});
