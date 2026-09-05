import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};

async function sendFile(filePath, response) {
  const info = await stat(filePath);
  if (!info.isFile()) throw new Error("Not a file");
  response.writeHead(200, { "Content-Type": types[extname(filePath)] ?? "application/octet-stream" });
  createReadStream(filePath).pipe(response);
}

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const requested = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const filePath = normalize(join(root, requested));

  if (!filePath.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    await sendFile(filePath, response);
  } catch {
    if (pathname.startsWith("/demo/") && !extname(pathname)) {
      await sendFile(join(root, "demo/index.html"), response);
      return;
    }
    response.writeHead(404).end("Not found");
  }
}).listen(port, () => {
  console.log(`product-tour-js demo: http://localhost:${port}/demo/`);
});
