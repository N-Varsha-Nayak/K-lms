import { app } from '../src/app.js';

export default async function vercelHandler(req, res) {
  return app(req, res);
}
