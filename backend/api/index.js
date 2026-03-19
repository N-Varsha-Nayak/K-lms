export default async function vercelHandler(req, res) {
  try {
    const { app } = await import('../src/app.js');
    return app(req, res);
  } catch (error) {
    console.error('Backend startup failure:', error);

    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        status: 'error',
        message: 'Backend startup failed',
        error: error?.message ?? 'Unknown error'
      })
    );
  }
}
