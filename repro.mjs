// etaggen 复现脚本：跑 `node repro.mjs` 观察当前行为。

import { generate, weakCompare, strongCompare } from './src/etag.mjs';

console.log('weakCompare("W/\\"abc\\"", "\\"abc\\"") =', weakCompare('W/"abc"', '"abc"'));
console.log('strongCompare("W/\\"abc\\"", "W/\\"abc\\"") =', strongCompare('W/"abc"', 'W/"abc"'));
console.log('weakCompare("\\"abc\\"", "\\"ABC\\"") =', weakCompare('"abc"', '"ABC"'));

const first = generate(Buffer.from('hello'));
const second = generate(Buffer.from('hello'));
console.log('generate("hello") 两次相同 =', first === second);
console.log('generate 空内容 =', generate(Buffer.alloc(0)));