// Helper to call OpenAI Images API with gpt-image-2.
// Invoked by Yuval (or manually as fallback when python is unavailable).
// Usage: node _gen.js "<prompt>" "<output_path.png>"
//
// Reads OPENAI_API_KEY from env (load via `set -a; source .env; set +a` in bash).

const https = require("node:https");
const fs = require("node:fs");

async function main() {
  const [prompt, outPath] = process.argv.slice(2);
  if (!prompt || !outPath) {
    console.error("usage: node _gen.js <prompt> <output_path>");
    process.exit(64);
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("ERROR: OPENAI_API_KEY not set in environment");
    process.exit(2);
  }

  const body = JSON.stringify({
    model: "gpt-image-2",
    prompt,
    size: "1024x1024",
    quality: "medium",
    output_format: "png",
  });

  const opts = {
    method: "POST",
    hostname: "api.openai.com",
    path: "/v1/images/generations",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
    timeout: 240_000,
  };

  const payload = await new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(new Error(`Bad JSON: ${raw.slice(0, 500)}`));
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.write(body);
    req.end();
  });

  if (!payload.data || !payload.data[0]) {
    console.error("Unexpected response:", JSON.stringify(payload).slice(0, 500));
    process.exit(5);
  }

  const item = payload.data[0];
  if (item.b64_json) {
    fs.writeFileSync(outPath, Buffer.from(item.b64_json, "base64"));
    console.log(`Saved: ${outPath}`);
    return;
  }
  if (item.url) {
    const buf = await new Promise((resolve, reject) => {
      https.get(item.url, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      });
    });
    fs.writeFileSync(outPath, buf);
    console.log(`Saved (from url): ${outPath}`);
    return;
  }
  console.error("No b64_json or url in item:", JSON.stringify(item).slice(0, 500));
  process.exit(6);
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(3);
});
