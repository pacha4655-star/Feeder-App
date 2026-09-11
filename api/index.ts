let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!cachedApp) {
      const serverModule: any = await import('./server.cjs');
      cachedApp =
        serverModule?.default?.default ||
        serverModule?.default?.app ||
        serverModule?.app ||
        serverModule?.default ||
        serverModule;
    }
    return cachedApp(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Handler Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Backend Serverless Function Error',
        message: err.message || String(err),
        name: err.name,
        code: err.code,
        stack: err.stack,
      });
    }
  }
}
