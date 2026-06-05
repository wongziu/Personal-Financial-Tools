export function generateBusinessId(prefix: string, year: number | undefined, sequence: number): string {
  const padded = String(sequence).padStart(3, "0");
  return year ? `${prefix}-${year}-${padded}` : `${prefix}-${padded}`;
}
