"""Helper to call OpenAI Images API with gpt-image-2. Invoked by Yuval."""
import json
import urllib.request
import urllib.error
import base64
import os
import sys

def main():
    if len(sys.argv) != 3:
        print("usage: _gen.py <prompt> <output_path>", file=sys.stderr)
        sys.exit(64)

    prompt, out_path = sys.argv[1], sys.argv[2]

    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not set", file=sys.stderr)
        sys.exit(2)

    body = json.dumps({
        "model": "gpt-image-2",
        "prompt": prompt,
        "size": "1024x1024",
        "quality": "medium",
        "output_format": "png",
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=240) as r:
            payload = json.loads(r.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        print(f"HTTP {e.code}: {err}", file=sys.stderr)
        sys.exit(3)
    except Exception as e:
        print(f"Exception {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(4)

    if "data" not in payload or not payload["data"]:
        print("Unexpected response (no data):", json.dumps(payload)[:500], file=sys.stderr)
        sys.exit(5)

    first = payload["data"][0]
    b64 = first.get("b64_json")
    if not b64:
        url = first.get("url")
        if url:
            with urllib.request.urlopen(url, timeout=120) as r:
                content = r.read()
            with open(out_path, "wb") as f:
                f.write(content)
            print(f"Saved (from url): {out_path}")
            return
        print("No b64_json and no url in response:", json.dumps(first)[:500], file=sys.stderr)
        sys.exit(6)

    with open(out_path, "wb") as f:
        f.write(base64.b64decode(b64))
    print(f"Saved: {out_path}")


if __name__ == "__main__":
    main()
