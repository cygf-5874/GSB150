// etaggen 既有用例（起点全绿）。
//
// 只覆盖「两侧都不带 W/、且大小写一致」的强比较；弱比较、非法输入、生成稳定性
// 都没有既有断言。跑法：`node --test`。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { strongCompare } from '../src/etag.mjs';

test('强比较：完全相同为真', () => {
  assert.equal(strongCompare('"abc"', '"abc"'), true);
});

test('强比较：内容不同为假', () => {
  assert.equal(strongCompare('"abc"', '"xyz"'), false);
});

test('强比较：单字符标签', () => {
  assert.equal(strongCompare('"1"', '"1"'), true);
  assert.equal(strongCompare('"1"', '"2"'), false);
});