export function notFoundHandler(_req, res) {
  return res.status(404).json({ message: 'Route not found' });
}

export function errorHandler(err, _req, res, _next) {
  // eslint-disable-next-line no-console
  console.error(err);

  const status = err.statusCode ?? 500;
  return res.status(status).json({
    message: err.message ?? 'Internal server error'
  });
}
