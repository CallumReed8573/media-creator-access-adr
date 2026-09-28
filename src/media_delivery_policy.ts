import { creatorIntakeSchema, type CreatorIntakeRequest } from './creator_intake_schema';
import { buildProviderAuthorizeUrl } from './social_authorize_url';

export type CaptchaVerifier = {
  captcha: {
    verify: (input: {
      widget_record_id: string;
      token: string;
      vendor: string;
      ip: string;
      action: string;
      score_threshold: number;
    }) => Promise<{ ok: true; data: unknown; metadata?: Record<string, unknown> }>;
  };
};

export type IntakeDecision = 'allow' | 'manual_review' | 'deny';

export type CreatorWorkflowResult = {
  authorizeUrl: string;
  decision: IntakeDecision;
  session: {
    status: 'pending-oauth-return' | 'not-issued';
  };
  ingestionJob: {
    jobId: string;
    profile: 'standard-hls' | 'audio-only-qc';
    state: 'queued' | 'held';
  };
  creatorDelivery: {
    assetId: string;
    audience: 'creator-review';
    releaseState: 'processing' | 'awaiting-manual-review' | 'rejected';
  };
};

function computeLocalRiskScore(input: CreatorIntakeRequest): number {
  let score = 0.1;

  if (input.asset.runtimeSeconds > 1800) score += 0.25;
  if (input.asset.declaredAudience === 'subscriber-release') score += 0.2;
  if (!input.creator.email.toLowerCase().endsWith('@studio.example')) score += 0.12;
  if (input.device.fingerprint.length < 16) score += 0.18;

  return Number(score.toFixed(2));
}

function makeJobId(assetId: string): string {
  return `job_${assetId}`;
}

export async function planCreatorAccess(
  raw: unknown,
  infrai: CaptchaVerifier
): Promise<CreatorWorkflowResult> {
  const input = creatorIntakeSchema.parse(raw);

  await infrai.captcha.verify({
    widget_record_id: input.captcha.widget_record_id,
    token: input.captcha.token,
    vendor: 'turnstile',
    ip: input.captcha.ip,
    action: input.captcha.action,
    score_threshold: 0.5
  });

  const risk = computeLocalRiskScore(input);
  const authorizeUrl = buildProviderAuthorizeUrl({
    provider: input.provider,
    returnTo: input.returnTo,
    redirectUri: input.redirectUri
  });

  if (risk >= 0.7) {
    return {
      authorizeUrl,
      decision: 'deny',
      session: { status: 'not-issued' },
      ingestionJob: {
        jobId: makeJobId(input.asset.assetId),
        profile: 'audio-only-qc',
        state: 'held'
      },
      creatorDelivery: {
        assetId: input.asset.assetId,
        audience: 'creator-review',
        releaseState: 'rejected'
      }
    };
  }

  if (risk >= 0.4) {
    return {
      authorizeUrl,
      decision: 'manual_review',
      session: { status: 'pending-oauth-return' },
      ingestionJob: {
        jobId: makeJobId(input.asset.assetId),
        profile: 'audio-only-qc',
        state: 'held'
      },
      creatorDelivery: {
        assetId: input.asset.assetId,
        audience: 'creator-review',
        releaseState: 'awaiting-manual-review'
      }
    };
  }

  return {
    authorizeUrl,
    decision: 'allow',
    session: { status: 'pending-oauth-return' },
    ingestionJob: {
      jobId: makeJobId(input.asset.assetId),
      profile: 'standard-hls',
      state: 'queued'
    },
    creatorDelivery: {
      assetId: input.asset.assetId,
      audience: 'creator-review',
      releaseState: 'processing'
    }
  };
}
