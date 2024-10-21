import { config } from 'dotenv';
import express from 'express';
import payload from 'payload';

config();

const app = express();

app.get('/', (_, res) => {
  res.redirect('/admin');
});

(async () => {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET,
    express: app,
    onInit: async () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`);
    },
  });

  app.listen(process.env.PORT, () => payload.logger.info(`Admin app started`));
})();
