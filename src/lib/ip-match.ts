/**
 * IP allowlist matching with CIDR support, for the edge gate in `proxy.ts`.
 *
 * The gate used to compare the client IP for exact set membership, so a range
 * could not be expressed at all and every rotated address meant another manual
 * entry (and, until someone made it, a lockout). Ranges close that for the
 * cases where rotation is NARROW — a studio uplink that moved
 * 138.84.139.166 -> .202 is one `138.84.139.0/24` entry instead of a support
 * call each time.
 *
 * Ranges are NOT a fix for mobile data or a VPN: those addresses jump between
 * unrelated networks, and covering them would mean whitelisting a whole carrier
 * or a hosting provider's pool that anyone can rent an address in.
 *
 * Addresses are held as BYTE ARRAYS (4 for IPv4, 16 for IPv6) so v4 and v6 are
 * one code path and nothing depends on BigInt — the repo's tsconfig targets
 * below ES2020, and this file has to run in the Vercel edge runtime with no
 * dependencies.
 */

export interface IpMatcher {
  /** True when this matcher has no entries at all (gate inert). */
  readonly isEmpty: boolean;
  /** True when `ip` is an exact entry or inside one of the CIDR entries. */
  test(ip: string | null | undefined): boolean;
}

interface Cidr {
  bytes: number[];
  bits: number;
}

/** IPv4 dotted quad -> 4 bytes. Null if not a valid IPv4. */
function v4Bytes(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const out: number[] = [];
  for (const p of parts) {
    // Reject "01", "+1", "" and anything non-numeric: a lenient parse would
    // let a malformed value silently become a DIFFERENT address.
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    out.push(n);
  }
  return out;
}

/** IPv6 -> 16 bytes, handling `::` compression and a trailing IPv4 tail. */
function v6Bytes(ip: string): number[] | null {
  let s = ip.trim();
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);
  // A zone id ("%eth0") is not part of the address.
  const pct = s.indexOf("%");
  if (pct !== -1) s = s.slice(0, pct);
  if (!s.includes(":")) return null;

  // "::ffff:1.2.3.4" — expand the IPv4 tail into two hextets.
  const lastColon = s.lastIndexOf(":");
  const tail = s.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = v4Bytes(tail);
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    s = `${s.slice(0, lastColon + 1)}${hi}:${lo}`;
  }

  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 ? (halves[1] ? halves[1].split(":") : []) : [];
  if (halves.length === 1 && head.length !== 8) return null;
  const fill = 8 - head.length - rest.length;
  if (fill < 0) return null;

  const groups = [...head, ...Array<string>(fill).fill("0"), ...rest];
  const out: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    const n = parseInt(g, 16);
    out.push((n >> 8) & 0xff, n & 0xff);
  }
  return out;
}

function toBytes(ip: string): number[] | null {
  return v4Bytes(ip) ?? v6Bytes(ip);
}

/** Parse "10.0.0.0/8" into a maskable range. Null if unparseable. */
function parseCidr(entry: string): Cidr | null {
  const slash = entry.indexOf("/");
  if (slash === -1) return null;
  const bytes = toBytes(entry.slice(0, slash));
  if (!bytes) return null;
  const suffix = entry.slice(slash + 1);
  if (!/^\d{1,3}$/.test(suffix)) return null;
  const bits = Number(suffix);
  if (bits > bytes.length * 8) return null;
  return { bytes, bits };
}

/** True when `addr` falls inside `range`. Both are byte arrays of equal family. */
function inRange(addr: number[], range: Cidr): boolean {
  // A v4 address can never be inside a v6 range, and vice versa.
  if (addr.length !== range.bytes.length) return false;

  const fullBytes = range.bits >> 3;
  for (let i = 0; i < fullBytes; i++) {
    if (addr[i] !== range.bytes[i]) return false;
  }
  const remainder = range.bits & 7;
  if (remainder === 0) return true;
  // Compare only the leading `remainder` bits of the next byte.
  const mask = (0xff << (8 - remainder)) & 0xff;
  return (addr[fullBytes] & mask) === (range.bytes[fullBytes] & mask);
}

/**
 * Build a matcher from allowlist entries — bare addresses, CIDR ranges, or a
 * mix.
 *
 * A bare entry is compared by STRING EQUALITY, exactly as the gate did before
 * ranges existed. Deliberately not parsed and re-serialised: that path guards
 * every existing allowlist entry, and a gap in this file's parser would turn
 * into a lockout rather than a rejected connection. A malformed bare entry
 * (`"999.1.1.1"`) is inert on its own — no real client IP can equal it.
 *
 * An unparseable CIDR entry IS dropped, since there is nothing to compare
 * against: a typo'd range fails closed for that entry alone and never becomes
 * a wildcard.
 */
export function makeIpMatcher(entries: Iterable<string>): IpMatcher {
  const exact = new Set<string>();
  const cidrs: Cidr[] = [];

  for (const raw of entries) {
    const entry = (raw || "").trim();
    if (!entry) continue;
    if (entry.includes("/")) {
      const parsed = parseCidr(entry);
      if (parsed) cidrs.push(parsed);
      continue;
    }
    exact.add(entry);
  }

  const isEmpty = exact.size === 0 && cidrs.length === 0;

  return {
    isEmpty,
    test(ip) {
      if (!ip) return false;
      // Exact match first: it is the common case and costs one hash lookup.
      if (exact.has(ip)) return true;
      if (cidrs.length === 0) return false;
      const addr = toBytes(ip);
      if (!addr) return false;
      for (const c of cidrs) {
        if (inRange(addr, c)) return true;
      }
      return false;
    },
  };
}
