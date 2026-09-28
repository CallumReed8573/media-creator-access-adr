import { infrai } from './infrai_client';
import { planCreatorAccess } from './media_delivery_policy';

const request = {
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
    widget_record_id: 'demo-widget-record-id',
    token: 'demo-captcha-token',
    ip: '203.0.113.10',
    action: 'creator_login'
  },
  device: {
    fingerprint: 'trusted-browser-device-001',
    ip: '203.0.113.10'
  }
};

planCreatorAccess(request, infrai)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
