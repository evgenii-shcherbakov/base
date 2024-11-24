import express from 'express';
import payload from 'payload';
import { config } from './config';

const app = express();

app.get('/', (_, res) => {
  res.redirect('/admin');
});

(async () => {
  await payload.init({
    secret: config.secret,
    express: app,
    onInit: async () => payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`),
  });

  app.listen(config.port, () => payload.logger.info(`Admin app started`));
})();
