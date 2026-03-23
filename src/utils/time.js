export const parseDurationToMs = (raw, fallbackMs) => {
  if (!raw) return fallbackMs;
  const match = String(raw).trim().match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackMs;
  const amount = parseInt(match[1], 10);
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return amount * (multipliers[match[2].toLowerCase()] || 1);
};
