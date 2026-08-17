import { createHmac, timingSafeEqual } from 'node:crypto';

export type WebhookVerificationResult =
	| { valid: true }
	| {
			valid: false;
			reason: 'invalid-secret' | 'invalid-timestamp' | 'stale' | 'invalid-signature';
	  };

export interface VerifyWebhookInput {
	secret: string;
	webhookId: string;
	webhookTimestamp: string;
	rawBody: Buffer;
	signatureHeader: string;
	nowSeconds?: number;
	toleranceSeconds?: number;
}

export function verifyParallelWebhook(input: VerifyWebhookInput): WebhookVerificationResult {
	const encodedSecret = input.secret.startsWith('whsec_') ? input.secret.slice(6) : input.secret;
	const secret = Buffer.from(encodedSecret, 'base64');
	const canonicalSecret = secret.toString('base64').replace(/=+$/, '');
	if (secret.length === 0 || canonicalSecret !== encodedSecret.replace(/=+$/, '')) {
		return { valid: false, reason: 'invalid-secret' };
	}

	const timestamp = Number(input.webhookTimestamp);
	if (!Number.isInteger(timestamp)) return { valid: false, reason: 'invalid-timestamp' };
	const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
	const tolerance = input.toleranceSeconds ?? 300;
	if (Math.abs(now - timestamp) > tolerance) return { valid: false, reason: 'stale' };

	const prefix = Buffer.from(`${input.webhookId}.${input.webhookTimestamp}.`, 'utf8');
	const payload = Buffer.concat([prefix, input.rawBody]);
	const expected = createHmac('sha256', secret).update(payload).digest();

	for (const candidate of input.signatureHeader.trim().split(/\s+/)) {
		if (!candidate.startsWith('v1,')) continue;
		const provided = Buffer.from(candidate.slice(3), 'base64');
		if (provided.length === expected.length && timingSafeEqual(expected, provided)) {
			return { valid: true };
		}
	}
	return { valid: false, reason: 'invalid-signature' };
}
