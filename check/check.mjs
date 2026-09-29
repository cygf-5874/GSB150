// GSB150 etaggen 固定验收程序（勿改）。
//
// 用法：
//   node check/check.mjs              跑全部场景
//   node check/check.mjs -list        列出场景名
//   node check/check.mjs --only weak  只跑某一组
//
// 输出：逐场景 `PASS <组>/<名>` 或 `FAIL <组>/<名>  期望=… 实际=…`，
// 结尾 `结果：通过 x/N`；全过 exit 0，否则 exit 1。失败不早退。

import { createHash } from 'node:crypto';

import { generate, weakCompare, strongCompare } from '../src/etag.mjs';

class AssertionFailure extends Error {
  constructor(expected, actual) {
    super('assertion failed');
    this.expected = expected;
    this.actual = actual;
  }
}

function show(value) {
  let text;
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    text = String(value);
  }
  if (text === undefined) text = String(value);
  return text.length > 300 ? text.slice(0, 300) + '…' : text;
}

function expectSame(expected, actual) {
  if (expected !== actual) throw new AssertionFailure(show(expected), show(actual));
}

function expectTrue(ok, expected, actual) {
  if (!ok) throw new AssertionFailure(expected, show(actual));
}

function expectThrows(fn, expected = '抛出异常') {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) throw new AssertionFailure(expected, '(未抛异常)');
}

function strongTagOf(data) {
  return '"' + createHash('sha256').update(data).digest('hex') + '"';
}

const scenarios = [
  {
    group: 'generate',
    name: 'format',
    run() {
      const tag = generate(Buffer.from('hello'));
      expectSame(strongTagOf(Buffer.from('hello')), tag);
      expectTrue(/^"[0-9a-f]{64}"$/.test(tag), '强标签形如 "hex64"', tag);
      expectTrue(!tag.startsWith('W/'), '生成的是强标签', tag);
    },
  },
  {
    group: 'generate',
    name: 'empty',
    run() {
      expectSame(strongTagOf(Buffer.alloc(0)), generate(Buffer.alloc(0)));
    },
  },
  {
    group: 'weak',
    name: 'w-prefix',
    run() {
      expectSame(true, weakCompare('W/"abc"', '"abc"'));
      expectSame(true, weakCompare('"abc"', 'W/"abc"'));
      expectSame(true, weakCompare('W/"abc"', 'W/"abc"'));
      expectSame(false, weakCompare('W/"abc"', 'W/"xyz"'));
    },
  },
  {
    group: 'weak',
    name: 'case-sensitive',
    run() {
      expectSame(false, weakCompare('"abc"', '"ABC"'));
      expectSame(false, weakCompare('W/"abc"', '"ABC"'));
    },
  },
  {
    group: 'strong',
    name: 'w-prefix',
    run() {
      expectSame(true, strongCompare('"abc"', '"abc"'));
      expectSame(false, strongCompare('W/"abc"', 'W/"abc"'));
      expectSame(false, strongCompare('W/"abc"', '"abc"'));
      expectSame(false, strongCompare('"abc"', 'W/"abc"'));
    },
  },
  {
    group: 'strong',
    name: 'case-sensitive',
    run() {
      expectSame(false, strongCompare('"abc"', '"ABC"'));
      expectSame(false, strongCompare('"ABC"', '"abc"'));
    },
  },
  {
    group: 'invalid',
    name: 'throws',
    run() {
      expectThrows(() => weakCompare('abc', '"abc"'));
      expectThrows(() => weakCompare('"abc"', 'abc'));
      expectThrows(() => strongCompare('"a"b"', '"a"b"'));
      expectThrows(() => strongCompare('W/"abc', '"abc"'));
      expectSame(true, weakCompare('""', '""'));
    },
  },
  {
    group: 'stable',
    name: 'no-time-no-random',
    run() {
      const data = Buffer.from('stable');
      const realNow = Date.now;
      const realRandom = Math.random;
      try {
        Date.now = () => 1000;
        Math.random = () => 0.11;
        const first = generate(data);
        Date.now = () => 2000;
        Math.random = () => 0.99;
        const second = generate(data);
        expectSame(first, second);
        expectSame(strongTagOf(data), first);
      } finally {
        Date.now = realNow;
        Math.random = realRandom;
      }
    },
  },
];

const args = process.argv.slice(2);
let only = null;
let list = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-list' || arg === '--list') {
    list = true;
  } else if (arg === '--only') {
    if (i + 1 >= args.length) {
      process.stderr.write('--only 缺少取值\n');
      process.exit(2);
    }
    only = args[++i];
  } else if (arg.startsWith('--only=')) {
    only = arg.slice('--only='.length);
  } else {
    process.stderr.write(`无法识别的参数：${arg}\n`);
    process.exit(2);
  }
}

if (list) {
  for (const scenario of scenarios) console.log(`${scenario.group}/${scenario.name}`);
  process.exit(0);
}

let passed = 0;
let ran = 0;

for (const scenario of scenarios) {
  if (only !== null && scenario.group !== only) continue;
  ran++;
  const label = `${scenario.group}/${scenario.name}`;
  try {
    scenario.run();
    passed++;
    console.log(`PASS ${label}`);
  } catch (error) {
    const expected = error instanceof AssertionFailure ? error.expected : '(未抛断言)';
    const actual = error instanceof AssertionFailure ? error.actual : error.message;
    console.log(`FAIL ${label}  期望=${expected} 实际=${actual}`);
  }
}

console.log(`结果：通过 ${passed}/${ran}`);
process.exit(passed === ran ? 0 : 1);