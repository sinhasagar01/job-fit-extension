# Privacy Policy — JobFit (Am I Fit?)

**Effective date:** June 16, 2026

---

## What JobFit does with your data

JobFit helps you score how well your resume matches a job description. Here is an honest, specific account of every piece of data the extension touches.

---

### Resume and LinkedIn text

When you upload a PDF resume (or an optional LinkedIn profile PDF), the extension reads the file **on your device** using the open-source `pdf.js` library. The extracted plain text is stored in your browser's `chrome.storage.local` — a private, per-extension storage area that only JobFit can access. It is never sent to any server operated by the extension developer.

You can remove this text at any time by clicking the **Remove** button next to your resume or LinkedIn profile in the popup.

---

### Job description text

When you click "Am I Fit?", the extension reads the page you are currently viewing to extract the job title, company name, and job description body. This extraction happens inside your browser and is never transmitted anywhere on its own.

---

### Scoring requests — the only time data leaves your device

When you request a fit score, the extension sends a single HTTPS request containing:

- Your resume text (up to 8,000 characters)
- The job description text (up to 4,000 characters)
- The job title and company name (if detected)

This request goes **directly from your browser** to whichever AI provider you selected in Settings:

| Provider | Endpoint |
|----------|----------|
| Google Gemini | `https://generativelanguage.googleapis.com/` |
| Groq | `https://api.groq.com/` |

The request is authenticated with **your own API key**, which you enter in Settings. The extension developer has no access to this request or its contents. Please review your chosen provider's privacy policy to understand how they handle API requests:

- [Google AI privacy policy](https://policies.google.com/privacy)
- [Groq privacy policy](https://groq.com/privacy-policy/)

---

### Your API key

Your API key is stored in `chrome.storage.local` on your device. It is transmitted only to the AI provider endpoint listed above, and nowhere else. The extension developer never receives your API key.

You can clear your API key at any time from the Settings page.

---

### Usage counter

JobFit tracks how many fit checks you have run today (up to 5 per day on the free tier). This counter is stored locally in `chrome.storage.local` and resets at midnight. It is never transmitted anywhere.

---

## What JobFit does NOT do

- Does not operate any developer-side servers
- Does not collect analytics or usage telemetry
- Does not track you across sites
- Does not display ads
- Does not sell, share, or disclose any data to third parties (beyond what you explicitly route to your chosen AI provider)
- Does not store scoring results remotely

---

## Clearing all your data

To remove everything JobFit has stored:

1. Click **Remove** next to your resume in the popup to delete stored resume text.
2. Click **Remove** next to your LinkedIn profile (if uploaded) to delete that text.
3. Open Settings and click the clear button to delete your API key.
4. To remove all extension storage at once: go to `chrome://extensions`, find JobFit, click **Details**, then **Clear Site Data**.

---

## Contact

Questions? Open an issue at the project repository or email sinhasagar01@gmail.com.
