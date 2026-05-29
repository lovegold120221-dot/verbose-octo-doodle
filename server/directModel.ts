export interface DirectModelConfig {
  apiUrl: string;
  apiKey: string;
  modelName: string;
}

const ARTIFACT_SYSTEM_PROMPT = `You are Beatrice's artifact generation engine for Eburon AI.

Your job is to generate one complete, production-quality, standalone browser-previewable artifact based on the user's request.

Hard requirements:
- Return only the final artifact content.
- For documents, dashboards, forms, reports, proposals, invoices, contracts, letters, certificates, receipts, memos, purchase orders, NDAs, and meeting minutes, output one complete HTML document.
- Start with <!DOCTYPE html>.
- Include complete <html>, <head>, and <body> tags.
- Embed all CSS inside a <style> tag.
- Embed JavaScript only when useful, inside a <script> tag.
- Do not use markdown fences.
- Do not explain your work.
- Do not mention that the output is HTML.
- Do not include remote scripts, CDNs, remote fonts, or remote images.
- The artifact must be self-contained.
- The artifact must be printable when appropriate.
- Include @media print styles for business documents.
- Use professional layout, spacing, typography, and hierarchy.
- Use placeholders only when the user did not provide required details.
- Preserve the user's requested language, tone, and context.
- For legal or business documents, structure the content clearly and avoid pretending that placeholders are real facts.
- For dashboards, include useful metric cards, sections, tables, and visual indicators.
- For forms and invoices, include calculation or live-preview JavaScript when useful.
- Use the provided template references as design inspiration only. Do not blindly copy template text unless the user requested it.

Output only the finished standalone artifact.`;

export class DirectModelWorker {
  private config: DirectModelConfig;
  private _alive = false;
  private lastCheck = 0;

  constructor(config: DirectModelConfig) {
    this.config = config;
  }

  get modelName() { return this.config.modelName; }
  get isConfigured() { return !!(this.config.apiUrl && this.config.modelName); }

  async checkConnection(): Promise<boolean> {
    if (!this.isConfigured) return false;
    if (Date.now() - this.lastCheck < 30000) return this._alive;
    try {
      const res = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.config.modelName,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(10000),
      });
      this._alive = res.ok;
    } catch {
      this._alive = false;
    }
    this.lastCheck = Date.now();
    return this._alive;
  }

  async generateArtifact(title: string, prompt: string): Promise<string> {
    const userMessage = `Title: ${title}\n\nRequest: ${prompt}\n\nGenerate the complete artifact.`;

    const res = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.config.modelName,
        messages: [
          { role: 'system', content: ARTIFACT_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 8192,
        stream: false,
      }),
      signal: AbortSignal.timeout(300000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Model API returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    let content = '';

    if (data.choices?.[0]?.message?.content) {
      content = data.choices[0].message.content.trim();
    } else if (data.message?.content) {
      content = data.message.content.trim();
    } else if (data.response) {
      content = data.response.trim();
    } else {
      throw new Error('Model returned unexpected response format');
    }

    const html = extractHTML(content);
    if (!html || html.length < 50) {
      throw new Error('Generated content too short or missing HTML');
    }

    return html;
  }
}

function extractHTML(text: string): string {
  const htmlStart = text.indexOf('<!DOCTYPE html>');
  const htmlStart2 = text.indexOf('<html');
  let start = htmlStart >= 0 ? htmlStart : htmlStart2 >= 0 ? htmlStart2 : -1;

  if (start >= 0) {
    const end = text.lastIndexOf('</html>');
    return end > start ? text.slice(start, end + 7).trim() : text.slice(start).trim();
  }

  const codeBlock = text.match(/```html?\n?([\s\S]*?)```/);
  return codeBlock ? codeBlock[1].trim() : text.trim();
}
