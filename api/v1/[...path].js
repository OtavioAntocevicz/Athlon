const BACKEND =
  process.env.BACKEND_URL?.replace(/\/$/, "") ||
  "https://athlonbackend-production.up.railway.app";

export const config = {
  api: {
    bodyParser: false,
  },
};

function buildTargetUrl(req) {
  const segments = req.query.path;
  const path = Array.isArray(segments) ? segments.join("/") : segments || "";
  const queryIndex = req.url?.indexOf("?") ?? -1;
  const query = queryIndex >= 0 ? req.url.slice(queryIndex) : "";
  return `${BACKEND}/api/v1/${path}${query}`;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

export default async function handler(req, res) {
  const target = buildTargetUrl(req);
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers["content-length"];

  const init = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await readBody(req);
  }

  let upstream;
  try {
    upstream = await fetch(target, init);
  } catch {
    res.status(502).json({
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message: "API indisponível. Tente novamente em instantes.",
      },
    });
    return;
  }

  res.status(upstream.status);
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "transfer-encoding" || lower === "connection") return;
    res.setHeader(key, value);
  });

  const body = Buffer.from(await upstream.arrayBuffer());
  res.end(body);
}
