# Privacy Policy — JobFit (Am I Fit?)

**Effective date:** July 18, 2026

---

## What JobFit does with your data

JobFit helps you score how well your resume matches a job description. Here is an honest, specific account of every piece of data the extension touches.

There are **two ways to score**, and they handle your data differently:

- **Free checks (no API key):** your résumé and the job text go to JobFit's scoring server, which passes them to our AI provider (OpenAI) and returns the result.
- **Your own key (BYOK):** scoring goes straight from your browser to the provider you chose (Google Gemini or Groq) and never touches JobFit's server.

Either way, JobFit never stores your résumé anywhere but your own device, and we never sell your data or train on it.

---

### Resume and LinkedIn text

When you upload a PDF resume (or an optional LinkedIn profile PDF), the extension reads the file **on your device** using the open-source `pdf.js` library. The extracted plain text is stored in your browser's `chrome.storage.local` — a private, per-extension storage area that only JobFit can access. It is sent off your device only when you run a fit score — see **Scoring requests** below.

You can remove this text at any time by clicking the **Remove** button next to your resume or LinkedIn profile in the side panel.

---

### Job description text

When you click the JobFit toolbar icon, the extension reads the page you are currently viewing to extract the job title, company name, and job description body. This extraction happens inside your browser and is never transmitted anywhere on its own — it is sent only as part of a scoring request you trigger.

Access is granted by your click and applies only to that one tab. If you navigate to a different page, JobFit cannot read it until you click the icon again.

---

### Scoring requests — when your résumé and the job text are sent

When you run a fit score, JobFit sends a single HTTPS request containing:

- Your resume text (up to 8,000 characters)
- The job description text (up to 4,000 characters)
- The job title and company name (if detected)

Where that request goes depends on whether you have added your own API key.

**Free checks (no key).** The request goes to **JobFit's scoring server**, which forwards it to our AI provider, **OpenAI**, and returns the result to you. Your résumé and the job text are **processed and dropped** — JobFit keeps none of your content: it is never stored on our server and never written to a log. To enforce the daily free limit, our server keeps only **anonymous usage counters** — one per install and one per IP address (the IP is **hashed**, never stored in the clear) — never any of your content. OpenAI processes the request under its API data policy ([Data controls in the OpenAI platform](https://developers.openai.com/api/docs/guides/your-data)); OpenAI states that data sent to its API is **not used to train its models by default** (as of March 1, 2023), and it retains API inputs **for up to 30 days for abuse monitoring**.

**Your own key (BYOK).** If you have added a Gemini or Groq API key in Settings, the request goes **straight from your browser to the provider you chose** — Google Gemini or Groq — authenticated with your own key. It **never touches JobFit's server**, and the extension developer has no access to it.

| When | Recipient | What happens to your content |
|------|-----------|------------------------------|
| Free check (no key) | JobFit's scoring server → OpenAI | Processed and dropped; not stored or logged by JobFit |
| Your own key | Google Gemini or Groq (directly) | Sent by you, straight to your chosen provider |

Please review the privacy policy of whichever provider handles your request:

- [OpenAI — Data controls in the OpenAI platform](https://developers.openai.com/api/docs/guides/your-data)
- [Google AI privacy policy](https://policies.google.com/privacy)
- [Groq privacy policy](https://groq.com/privacy-policy/)

---

### Anonymous install identifier

So the free daily limit can be enforced, JobFit generates a random, **anonymous** identifier (a UUID) the first time you use it, stores it on your device, and sends it with each **free-check** request so the scoring server can count usage per install. It is not tied to your identity, your résumé, or any account — there are no accounts — and it is used only for rate limiting. It is not sent when you use your own key.

---

### Saved checks (history)

When a fit score completes, JobFit saves the result on your device in `chrome.storage.local` so you can return to it later and so that re-checking the same job does not cost another API call or another free check. Each saved entry contains:

- The fit score, the five dimension scores, the strengths, gaps, suggestion, and action plan
- The job title and company name (if detected)
- The time of the check
- An identifier derived from your resume text and the job description text

Your resume text and the job description text themselves are **not** stored in these entries.

Saved checks are kept only on your device and are never transmitted anywhere. The most recent 200 checks are kept; older ones are removed automatically. You can view them by clicking "Past checks" in the side panel, delete any single check from that list, or remove all of them with "Clear history".

---

### Your API key

If you add your own API key, it is stored in `chrome.storage.local` on your device. It is transmitted only to the AI provider you selected (Gemini or Groq) when you run a score, and nowhere else. The extension developer never receives your API key.

You can clear your API key at any time from the Settings page.

---

### Usage counter

On **free checks**, JobFit keeps a local count on your device of how many you have run today (up to 5), stored in `chrome.storage.local` and reset daily; it is never transmitted. (The scoring server also keeps the anonymous counters described above under **Free checks**.) When you use your own key, there is no daily limit and no count is kept.

---

## What JobFit does NOT do

- Does not collect analytics or usage telemetry
- Does not track you across sites
- Does not read pages in the background or on page load
- Does not display ads
- Does not sell or share your data with anyone other than the AI provider that scores your request (OpenAI for free checks; the provider you chose for BYOK)
- Does not store your résumé, job descriptions, or scoring results on any **JobFit** server — they live only on your device
- **JobFit never trains on your data.** (Separately, OpenAI states that data sent to its API is not used to train its models by default — see its policy above — but that is OpenAI's policy, not something JobFit controls.)

---

## Clearing all your data

To remove everything JobFit has stored:

1. Open the side panel and click **Remove** next to your resume to delete stored resume text.
2. Click **Remove** next to your LinkedIn profile (if uploaded) to delete that text.
3. Click **Past checks**, then **Clear history**, to delete every saved check.
4. Open **Settings** and click the clear button to delete your API key.

To remove all extension storage at once: go to `chrome://extensions`, find JobFit, click **Details**, then **Clear Site Data**.

---

## Contact

Questions? Open an issue at the project repository or email sinhasagar01@gmail.com.
