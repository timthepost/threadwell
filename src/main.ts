import { Application, send } from "oak";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import boardRouter from "./api/board.ts";

export const app = new Application();

// Logger
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
});

// Timing
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

// CORS for all routes
app.use(oakCors()); // Allows all origins by default

// API routes
app.use(boardRouter.routes());
app.use(boardRouter.allowedMethods());

// Static file serving
app.use(async (ctx) => {
  await send(ctx, ctx.request.url.pathname, {
    root: `${Deno.cwd()}/public`,
    index: "index.html",
  });
});

// Start listening only when the script is run directly
if (import.meta.main) {
  // You might want to use Deno.env.get("PORT") here for flexibility
  const port = 8000;
  console.log(`Server listening on http://localhost:${port}`);
  await app.listen({ port });
}
