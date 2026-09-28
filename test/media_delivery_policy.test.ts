import { describe, expect, it, vi } from 'vitest';
import { planCreatorAccess } from '../src/media_delivery_policy';

describe('planCreatorAccess', () => {
  it('allows a low-risk google creator and queues standard processing', async () => {
    const verify = vi.fn(async () => ({ ok: true as const, data: { accepted: true } }));
    const fakeInfrai = {
      captcha: {
        verify
      }
    };

    const input = {
      provider: 'google',
      returnTo: 'https://stream.example.app/creator/callback',
      redirectUri: 'https://stream.example.app/auth/provider-return',
      creator: {
        email: 'maker@studio.example',
        displayName: 'Asha Maker'
      },
      asset: {
        assetId: 'asset_breath_001',
        title: 'Morning breathing session',
        runtimeSeconds: 420,
        sourceUrl: 'https://cdn.example.app/uploads/asset_breath_001.mp4',
        declaredAudience: 'creator-review'
      },
      captcha: {
        widget_record_id: 'test-widget-record-id',
        token: 'captcha-pass-token',
        ip: '203.0.113.10',
        action: 'creator_login'
      },
      device: {
        fingerprint: 'trusted-browser-device-001',
        ip: '203.0.113.10'
      }
    };

    const result = await planCreatorAccess(input, fakeInfrai);

    expect(verify).toHaveBeenCalledWith(expect.objectContaining({ widget_record_id: 'test-widget-record-id' }));
    expect(result.decision).toBe('allow');
    expect(result.ingestionJob.profile).toBe('standard-hls');
    expect(result.ingestionJob.state).toBe('queued');
    expect(result.creatorDelivery.audience).toBe('creator-review');
    expect(result.session.status).toBe('pending-oauth-return');
    expect(result.authorizeUrl).toContain('/v1/auth/oauth/authorize_url');
    expect(result.authorizeUrl).toContain('provider=google');
  });
});
