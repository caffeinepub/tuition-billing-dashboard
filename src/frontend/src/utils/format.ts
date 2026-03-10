export function formatAmount(amount: bigint): string {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export function formatDate(nanoseconds: bigint): string {
  const ms = Number(nanoseconds) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
