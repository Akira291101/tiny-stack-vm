import fs from 'node:fs';
import path from 'node:path';

const STEP_LIMIT = 1_000_000;
const OUTPUT_MAX = 65_536;
const STACK_MAX = 256;
const CALLS_MAX = 64;

const imm = new Int8Array(256).fill(-1);
const pops = new Uint8Array(256);
const pushes = new Uint8Array(256);
for (const o of [
  [0x00, 0, 0, 0], [0x01, 1, 0, 1], [0x02, 4, 0, 1], [0x03, 0, 1, 0],
  [0x04, 0, 1, 2], [0x05, 0, 2, 2], [0x06, 0, 2, 3], [0x07, 0, 3, 3],
  [0x10, 0, 2, 1], [0x11, 0, 2, 1], [0x12, 0, 2, 1], [0x13, 0, 2, 1],
  [0x14, 0, 2, 1], [0x15, 0, 2, 1], [0x16, 0, 2, 1], [0x17, 0, 1, 1],
  [0x18, 0, 2, 1], [0x19, 0, 2, 1], [0x1a, 0, 2, 1], [0x1b, 0, 1, 1],
  [0x1c, 0, 2, 1], [0x1d, 0, 2, 1], [0x1e, 0, 2, 1], [0x20, 0, 2, 1],
  [0x21, 0, 2, 1], [0x22, 0, 2, 1], [0x30, 2, 0, 0], [0x31, 2, 1, 0],
  [0x32, 2, 1, 0], [0x33, 2, 0, 0], [0x34, 0, 0, 0], [0x40, 0, 1, 1],
  [0x41, 0, 2, 0], [0x50, 0, 1, 0], [0x51, 0, 1, 0], [0x52, 0, 0, 1],
  [0x53, 0, 1, 0],
]) { imm[o[0]] = o[1]; pops[o[0]] = o[2]; pushes[o[0]] = o[3]; }

function run(program: Uint8Array, input: Uint8Array) {
  const n = program.length;
  const D = new Int32Array(STACK_MAX);
  const C = new Int32Array(CALLS_MAX);
  const M = new Int32Array(256);
  const out = Buffer.alloc(OUTPUT_MAX);
  let sp: number = 0, csp: number = 0, olen: number = 0, inPos: number = 0;
  let pc: number = 0, steps: number = 0;
  const done = (exit: number) => ({ stdout: out.subarray(0, olen), exit });
  const trap = (code: number) => done(code);

  for (;;) {
    if (steps === STEP_LIMIT) return trap(10);
    if (pc < 0 || pc >= n) return trap(9);
    const op = program[pc];
    const i = imm[op];
    if (i < 0) return trap(5);
    if (pc + i >= n) return trap(9);
    steps++;
    const next = pc + 1 + i;
    if (sp < pops[op]) return trap(2);
    if (sp - pops[op] + pushes[op] > STACK_MAX) return trap(3);
    pc = next;

    switch (op) {
      case 0x00: return done(0);
      case 0x01: D[sp++] = (program[next - 1] << 24) >> 24; break;
      case 0x02:
        D[sp++] = program[next - 4] | (program[next - 3] << 8) |
          (program[next - 2] << 16) | (program[next - 1] << 24);
        break;
      case 0x03: sp--; break;
      case 0x04: D[sp] = D[sp - 1]; sp++; break;
      case 0x05: {
        const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break;
      }
      case 0x06: D[sp] = D[sp - 2]; sp++; break;
      case 0x07: {
        const a = D[sp - 3]; D[sp - 3] = D[sp - 2];
        D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break;
      }
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break;
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x30: case 0x31: case 0x32: {
        const rel = ((program[next - 2] | (program[next - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) {
          const v = D[--sp];
          take = op === 0x31 ? v === 0 : v !== 0;
        }
        if (take) pc = next + rel;
        break;
      }
      case 0x33:
        if (csp === CALLS_MAX) return trap(7);
        C[csp++] = next;
        pc = program[next - 2] | (program[next - 1] << 8);
        break;
      case 0x34:
        if (csp === 0) return trap(8);
        pc = C[--csp];
        break;
      case 0x40: {
        const addr = D[sp - 1];
        if (addr < 0 || addr >= 256) return trap(6);
        D[sp - 1] = M[addr];
        break;
      }
      case 0x41: {
        const addr = D[sp - 1], v = D[sp - 2];
        if (addr < 0 || addr >= 256) return trap(6);
        sp -= 2; M[addr] = v;
        break;
      }
      case 0x50: {
        const bytes = Buffer.from(String(D[sp - 1]), 'utf8');
        if (olen + bytes.length > OUTPUT_MAX) return trap(11);
        sp--; bytes.copy(out, olen); olen += bytes.length;
        break;
      }
      case 0x51:
        if (olen + 1 > OUTPUT_MAX) return trap(11);
        out[olen++] = D[--sp] & 255;
        break;
      case 0x52: D[sp++] = inPos < input.length ? input[inPos++] : -1; break;
      case 0x53: return done(D[--sp] & 255);
      default: {
        const b = D[sp - 1], a = D[sp - 2];
        if ((op >= 0x13 && op <= 0x16) && b === 0) return trap(4);
        let r: number;
        switch (op) {
          case 0x10: r = (a + b) | 0; break;
          case 0x11: r = (a - b) | 0; break;
          case 0x12: r = Math.imul(a, b); break;
          case 0x13: r = a === -2147483648 && b === -1 ? a : (a / b) | 0; break;
          case 0x14: r = b === -1 ? 0 : a % b | 0; break;
          case 0x15: r = Math.floor((a >>> 0) / (b >>> 0)) | 0; break;
          case 0x16: r = (a >>> 0) % (b >>> 0) | 0; break;
          case 0x18: r = a & b; break;
          case 0x19: r = a | b; break;
          case 0x1a: r = a ^ b; break;
          case 0x1c: r = a << (b & 31); break;
          case 0x1d: r = a >> (b & 31); break;
          case 0x1e: r = (a >>> (b & 31)) | 0; break;
          case 0x20: r = a === b ? 1 : 0; break;
          case 0x21: r = a < b ? 1 : 0; break;
          default: r = (a >>> 0) < (b >>> 0) ? 1 : 0; break;
        }
        sp -= 2; D[sp++] = r;
        break;
      }
    }
  }
}

const inputDir = process.env.MAKEFUN_INPUT_DIR || '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
fs.mkdirSync(outputDir, { recursive: true });
for (const id of fs.readdirSync(inputDir)) {
  const dir = path.join(inputDir, id);
  if (!fs.statSync(dir).isDirectory()) continue;
  const program = new Uint8Array(fs.readFileSync(path.join(dir, 'program.bin')));
  const input = new Uint8Array(fs.readFileSync(path.join(dir, 'input.bin')));
  const result = run(program, input);
  const dest = path.join(outputDir, id);
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, 'stdout.bin'), result.stdout);
  fs.writeFileSync(path.join(dest, 'exit.txt'), `${result.exit}\n`);
}
