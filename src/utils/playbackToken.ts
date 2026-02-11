import crypto from 'crypto';

export interface PlaybackTokenPayload {
  videoId: string;
  prefix: string;
  exp: number; // unix seconds
  origin?: string;
}

const base64UrlEncode = (input: string | Buffer) => {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const base64UrlEncodeJson = (payload: PlaybackTokenPayload) => {
  return base64UrlEncode(JSON.stringify(payload));
};

export const signPlaybackToken = (payload: PlaybackTokenPayload, secret: string) => {
  const body = base64UrlEncodeJson(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${body}.${signature}`;
};
