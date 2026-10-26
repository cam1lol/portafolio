// Dev-server proxy (angular.json -> serve.proxyConfig). Loading this file also starts the local media
// server (scripts/media-server.mjs) inside `ng serve`, so uploads and /media/projects work however the
// dev server is launched: npm start, ng serve or the VS Code task.
import './scripts/media-server.mjs';

const target = 'http://127.0.0.1:4310';

export default {
  '/__media': { target, secure: false },
  '/media/projects': { target, secure: false },
};
