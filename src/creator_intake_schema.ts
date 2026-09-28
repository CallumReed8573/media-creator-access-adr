import { z } from 'zod';

export const creatorIntakeSchema = z.object({
  provider: z.enum(['google', 'github']),
  returnTo: z.string().url(),
  redirectUri: z.string().url(),
  creator: z.object({
    email: z.string().email(),
    displayName: z.string().min(1).max(120)
  }),
  asset: z.object({
    assetId: z.string().min(3).max(64),
    title: z.string().min(1).max(160),
    runtimeSeconds: z.number().int().positive().max(21600),
    sourceUrl: z.string().url(),
    declaredAudience: z.enum(['creator-review', 'subscriber-release'])
  }),
  captcha: z.object({
    widget_record_id: z.string().min(1),
    token: z.string().min(1),
    ip: z.string().min(3),
    action: z.literal('creator_login')
  }),
  device: z.object({
    fingerprint: z.string().min(8).max(128),
    ip: z.string().min(3)
  })
});

export type CreatorIntakeRequest = z.infer<typeof creatorIntakeSchema>;
