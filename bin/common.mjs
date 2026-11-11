// AXI shared helpers — TOON output, flag parsing, errors, truncation.
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';

export const HOME = homedir();

export function collapseHome(p) {
  return p.replace(HOME, '~');
}

export function list(name, fields, rows, opts = {}) {
  const lines = [];
  const n = rows.length;
  if (opts.total !== undefined && opts.total > n) {
    lines.push(`count: ${n} of ${opts.total} total`);
  }
  lines.push(`${name}[${n}]{${fields.join(',')}}:`);
  for (const r of rows) {
    lines.push('  ' + fields.map((f) => fmt(r[f])).join(','));
  }
  return lines.join('\n');
}

export function kv(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${fmt(v)}`)
    .join('\n');
}

export function fmt(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') {
    if (v.includes(',') || v.includes('\n') || v.includes(':')) {
      return `"${v.replace(/"/g, "'")}"`;
    }
    return v;
  }
  return String(v);
}

export function help(lines) {
  return lines.map((l, i) => `help[${i + 1}]: ${l}`).join('\n');
}

export function fail(message, code = 'ERROR', helpLines = []) {
  const out = [`error: ${message}`, `code: ${code}`];
  if (helpLines.length) out.push(help(helpLines));
  process.stdout.write(out.join('\n') + '\n');
  process.exit(1);
}

export function usageError(message, helpLines = []) {
  const out = [`error: ${message}`, `code: USAGE`];
  if (helpLines.length) out.push(help(helpLines));
  process.stdout.write(out.join('\n') + '\n');
  process.exit(2);
}

export function truncate(s, max = 500, fullHintCmd = null) {
  if (s === undefined || s === null) return '';
  const str = String(s);
  if (str.length <= max) return str;
  const head = str.slice(0, max);
  const note = `... (truncated, ${str.length} chars total)`;
  let out = head + '\n' + note;
  if (fullHintCmd) out += '\n' + help([`Run \`${fullHintCmd}\` for full content`]);
  return out;
}

export function parseFlags(args, spec = {}) {
  const bools = new Set(['help', ...(spec.bools || [])]);
  const values = new Set(spec.values || []);
  const flags = { help: false, _: [] };
  const valid = [...bools, ...values];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { flags._.push(...args.slice(i + 1)); break; }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const name = eq > 0 ? a.slice(2, eq) : a.slice(2);
      if (name === 'help') { flags.help = true; continue; }
      if (bools.has(name)) {
        flags[name] = true;
        continue;
      }
      if (values.has(name)) {
        if (eq > 0) {
          flags[name] = a.slice(eq + 1);
        } else {
          const v = args[i + 1];
          if (v === undefined || v.startsWith('--')) {
            usageError(`--${name} requires a value`, [`valid flags: --${valid.join(', --')} (--help always allowed)`]);
          }
          flags[name] = v;
          i++;
        }
        continue;
      }
      usageError(`unknown flag --${name}`, [`valid flags for this command: --${valid.join(', --')} (--help always allowed)`]);
    }
    if (/^-\d+$/.test(a)) { flags._.push(a); continue; }
    flags._.push(a);
  }
  return flags;
}

export function run(cmd, args, opts = {}) {
  try {
    const stdout = execFileSync(cmd, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: opts.timeout || 30000,
      env: { ...process.env, ...(opts.env || {}) },
      maxBuffer: 16 * 1024 * 1024,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: e.stdout?.toString() ?? '', stderr: e.stderr?.toString() ?? '' };
  }
}

export function ghJson(args, opts = {}) {
  const bin = process.env.GH_BIN || 'gh';
  const r = run(bin, args, opts);
  if (r.code !== 0) {
    const msg = r.stderr.trim() || r.stdout.trim() || `gh exited ${r.code}`;
    fail(`gh: ${msg}`, 'GH_ERROR', ['Ensure gh is installed and authenticated']);
  }
  try {
    return JSON.parse(r.stdout);
  } catch {
    fail('gh returned invalid JSON', 'PARSE_ERROR');
  }
}

export function ghMutate(args, opts = {}) {
  const bin = process.env.GH_AXI_BIN || 'gh-axi';
  const r = run(bin, args, opts);
  if (r.code !== 0) {
    const msg = r.stderr.trim() || r.stdout.trim() || `gh-axi exited ${r.code}`;
    fail(`gh-axi: ${msg}`, 'GH_AXI_ERROR', ['Ensure gh-axi is installed and authenticated']);
  }
  return r.stdout;
}
