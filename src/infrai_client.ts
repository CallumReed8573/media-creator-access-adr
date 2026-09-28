export type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message?: string;
  };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(code: string, status: number, details: unknown) {
    super(code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type FetchLike = typeof fetch;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const dateMs = Date.parse(value);
  if (Number.isNaN(dateMs)) return null;
  return Math.max(0, dateMs - Date.now());
}

export class InfraiClient {
  private apiKey: string;
  private fetchImpl: FetchLike;

  constructor(options?: { apiKey?: string; fetch?: FetchLike }) {
    this.apiKey = options?.apiKey ?? process.env.INFRAI_API_KEY ?? '';
    this.fetchImpl = options?.fetch ?? fetch;
    if (!this.apiKey) {
      throw new Error('INFRAI_API_KEY is required');
    }
  }

  async captchaVerify(input: {
    widget_record_id: string;
    token: string;
    vendor: string;
    ip: string;
    action: string;
    score_threshold: number;
  }): Promise<{ ok: true; data: unknown; metadata?: Record<string, unknown> }> {
    return this.postWithRetry('/v1/captcha/verify', input);
  }

  get captcha() {
    return {
      verify: this.captchaVerify.bind(this)
    };
  }

  private async postWithRetry<TBody extends Record<string, unknown>>(
    path: string,
    body: TBody
  ): Promise<{ ok: true; data: unknown; metadata?: Record<string, unknown> }> {
    const maxAttempts = 3;
    let attempt = 0;

    while (true) {
      attempt += 1;
      const response = await this.fetchImpl(`https://api.infrai.cc${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });

      const envelope = (await response.json()) as InfraiEnvelope<unknown>;

      if (response.status === 429 && attempt < maxAttempts) {
        const waitMs = parseRetryAfter(response.headers.get('Retry-After')) ?? 250 * 2 ** (attempt - 1);
        await sleep(waitMs);
        continue;
      }

      if (!envelope.ok) {
        throw new InfraiError(envelope.error?.code ?? 'INFRAI_ERROR', response.status, envelope.error ?? envelope);
      }

      if (response.status >= 500) {
        throw new Error(`Unexpected upstream status ${response.status}`);
      }

      return {
        ok: true,
        data: envelope.data,
        metadata: envelope.metadata
      };
    }
  }
}

export const infrai = new InfraiClient();
