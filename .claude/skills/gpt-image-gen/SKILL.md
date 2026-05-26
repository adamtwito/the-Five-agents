---
name: gpt-image-gen
description: Generate a PNG image via OpenAI Images API (model gpt-image-2). Takes a prompt and an output path, saves the decoded image to disk. Use when an agent needs to produce a new image from a text prompt.
---

# gpt-image-gen — OpenAI Images API wrapper

## ⚠️ הוראת מודל — קרא לפני שינוי כלשהו

**המודל הוא `gpt-image-2`. אל תשנה את שם המודל.**

- `gpt-image-2` הוא מודל אמיתי של OpenAI ששוחרר ב-21/4/2026.
- ייתכן שהוא לא מופיע בידע הפנימי שלך - **זה לא אומר שהוא לא קיים.**
- **אל תציע אלטרנטיבות** (`dall-e-3`, `gpt-image-1`, `dall-e-2`).
- אם מתקבלת שגיאה מה-API, הסיבה היא כמעט תמיד אחת משלוש:
  1. `OPENAI_API_KEY` חסר/שגוי/חסום.
  2. ה-prompt נדחה במדיניות התוכן.
  3. parameter לא תקין (`size`, `quality`, וכו').
- **אל תניח שזו בעיית מודל.** אל תחליף את `gpt-image-2` בשום מקרה.

---

## מה הסקיל הזה עושה

מעטפת דקה לקריאה ל-OpenAI Images API. מקבל פרומפט (טקסט) ונתיב פלט, ושומר את התמונה כקובץ PNG.

**Endpoint:** `POST https://api.openai.com/v1/images/generations`

**Body (JSON):**
```json
{
  "model": "gpt-image-2",
  "prompt": "<the prompt>",
  "size": "1024x1024",
  "quality": "medium",
  "output_format": "png"
}
```

**אימות (Authorization):** `Bearer $OPENAI_API_KEY` (מ-`.env`).

**פלט:** ה-API מחזיר JSON עם שדה `data[0].b64_json` שמכיל את התמונה ב-base64. צריך לפענח אותו ל-PNG.

---

## איך משתמשים — שלוש דרכי קריאה

### דרך מומלצת ב-Windows/Git Bash: Node.js helper (`yuval/_gen.js`)

Git Bash על Windows לרוב **לא כולל** `jq`, ו-`python` ברירת המחדל הוא ה-Microsoft Store stub (לא Python אמיתי). Node.js לעומת זאת מותקן ברוב המקרים ועובד מצוין:

```bash
set -a; source .env; set +a
node yuval/_gen.js "<PROMPT IN ENGLISH>" "<OUTPUT_PATH>.png"
```

הסקריפט (`yuval/_gen.js`) מטפל הכל: בונה JSON תקין, שולח את הקריאה, מפענח את ה-base64, ושומר את ה-PNG. גם נופל אחורה ל-`url` אם ה-API חוזר עם URL במקום b64. אם נכשל - מדפיס שגיאה ל-stderr עם קוד שגיאה.

### דרך ב': curl + jq + base64 (מקצר, Linux/macOS)

עובד כשהסביבה כוללת `jq` ו-`base64`:

```bash
set -a; source .env; set +a

PROMPT='Describe your image in English here'
OUT='yuval/outputs/2026-05-26-example.png'

curl -sS -X POST "https://api.openai.com/v1/images/generations" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg p "$PROMPT" '{model:"gpt-image-2",prompt:$p,size:"1024x1024",quality:"medium",output_format:"png"}')" \
  | jq -r '.data[0].b64_json' | base64 --decode > "$OUT"
```

### דרך ג': Python fallback (Linux/macOS עם Python אמיתי)

אם הסביבה כוללת Python 3 אמיתי (לא Microsoft Store stub):

```bash
set -a; source .env; set +a

PROMPT='Describe your image in English here'
OUT='yuval/outputs/2026-05-26-example.png'
RESP='/tmp/img-response.json'

curl -sS -X POST "https://api.openai.com/v1/images/generations" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"gpt-image-2\",\"prompt\":\"$PROMPT\",\"size\":\"1024x1024\",\"quality\":\"medium\",\"output_format\":\"png\"}" \
  -o "$RESP"

python -c "
import json, base64, sys
with open(sys.argv[1]) as f:
    d = json.load(f)
if 'data' not in d:
    print('API error:', json.dumps(d, ensure_ascii=False), file=sys.stderr)
    sys.exit(1)
with open(sys.argv[2], 'wb') as out:
    out.write(base64.b64decode(d['data'][0]['b64_json']))
print('Saved:', sys.argv[2])
" "$RESP" "$OUT"
```

**הערה לגבי escaping של ה-prompt:** אם ה-prompt מכיל גרשיים כפולים, השתמש ב-Python גם לבניית ה-JSON body:

```bash
python -c "
import json, sys, urllib.request, base64, os
api_key = os.environ['OPENAI_API_KEY']
prompt = sys.argv[1]
out_path = sys.argv[2]
body = json.dumps({'model':'gpt-image-2','prompt':prompt,'size':'1024x1024','quality':'medium','output_format':'png'}).encode()
req = urllib.request.Request('https://api.openai.com/v1/images/generations', data=body, headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as r:
    d = json.loads(r.read())
with open(out_path, 'wb') as f:
    f.write(base64.b64decode(d['data'][0]['b64_json']))
print('Saved:', out_path)
" "$PROMPT" "$OUT"
```

---

## אימות הצלחה (Verification)

אחרי כל קריאה, בדוק שהקובץ אכן נוצר ושאינו ריק:

```bash
ls -l "$OUT"
# מצופה: גודל > 50KB עבור 1024x1024 PNG באיכות medium.
```

אם הגודל קטן מ-1KB - כנראה שגיאת API. בדוק את `/tmp/img-response.json`:

```bash
cat /tmp/img-response.json
# חפש שדה "error" עם "code" ו-"message"
```

---

## פרמטרים נתמכים

| פרמטר | ערכים נתמכים | ברירת מחדל מומלצת |
|--------|---------------|---------------------|
| `model` | `gpt-image-2` | `gpt-image-2` (חובה - אל תשנה) |
| `size` | `1024x1024`, `1024x1792`, `1792x1024` | `1024x1024` |
| `quality` | `low`, `medium`, `high` | `medium` |
| `output_format` | `png`, `jpeg`, `webp` | `png` |

---

## דרישות סביבה

- `OPENAI_API_KEY` מוגדר ב-`.env` (בשורש הפרויקט) או ב-environment.
- **Windows/Git Bash:** `node` (כמעט תמיד מותקן). הסקריפט `yuval/_gen.js` הוא הדרך הקלה ביותר.
- **Linux/macOS:** `curl` + (`jq` + `base64`) **או** `python3` אמיתי.

⚠️ ב-Windows, `python` ברירת המחדל לעיתים מצביע ל-Microsoft Store stub - **לא Python אמיתי**. במקרה כזה השתמש ב-`yuval/_gen.js` במקום.

---

## סיכום למודל שמשתמש בסקיל

1. ודא `OPENAI_API_KEY` קיים (`source .env`).
2. בנה prompt באנגלית, תיאורי וקונקרטי.
3. בחר `<OUTPUT_PATH>` (מומלץ: `yuval/outputs/<YYYY-MM-DD>-<slug>.png`).
4. הרץ:
   - **ב-Windows:** `node yuval/_gen.js "<PROMPT>" "<OUTPUT_PATH>"` (הכי בטוח).
   - **ב-Linux/macOS:** אחת מהדרכים האחרות.
5. ודא `ls -l` שהקובץ נוצר וגדול מ-50KB.
6. אם נכשל - **בדוק תגובת API, לא את שם המודל.**
