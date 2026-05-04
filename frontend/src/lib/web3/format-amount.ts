export function formatTokenAmount(
  raw: bigint,
  decimals: number,
  options: { maximumFractionDigits?: number } = {},
): string {
  const max = options.maximumFractionDigits ?? Math.min(decimals, 6);
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;

  const wholeStr = whole.toString();
  const fractionStr = fraction
    .toString()
    .padStart(decimals, "0")
    .slice(0, max)
    .replace(/0+$/, "");

  const formatted =
    fractionStr.length === 0 ? wholeStr : `${wholeStr}.${fractionStr}`;
  return negative ? `-${formatted}` : formatted;
}
