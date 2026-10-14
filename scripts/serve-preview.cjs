const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
};
http
  .createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
    } catch {
      response.writeHead(400).end();
      return;
    }
    let file = path.resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (!fs.existsSync(file))
      file = path.resolve(root, "." + pathname + ".html");
    if (!fs.existsSync(file)) {
      if (path.extname(pathname)) {
        response.writeHead(404).end();
        return;
      }
      const dynamicRoute = pathname.startsWith("/post/")
        ? "post"
        : pathname.startsWith("/creator/")
          ? "creator"
          : null;
      file = dynamicRoute
        ? path.join(root, dynamicRoute, "[id].html")
        : path.join(root, "index.html");
    }
    const size = fs.statSync(file).size;
    const headers = {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Accept-Ranges": "bytes",
    };
    const match = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
      if (start >= size || end < start) {
        response.writeHead(416, { "Content-Range": "bytes */" + size }).end();
        return;
      }
      response.writeHead(206, {
        ...headers,
        "Content-Range": "bytes " + start + "-" + end + "/" + size,
        "Content-Length": end - start + 1,
      });
      fs.createReadStream(file, { start, end }).pipe(response);
    } else {
      response.writeHead(200, { ...headers, "Content-Length": size });
      fs.createReadStream(file).pipe(response);
    }
  })
  .listen(8082, "127.0.0.1", () =>
    console.log("CUT production preview: http://localhost:8082"),
  );
