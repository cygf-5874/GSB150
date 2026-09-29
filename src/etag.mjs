// etaggen —— Node.js 22 ETag 生成与比较（RFC 9110 §8.8）。
//
// 对外契约见 README「对外契约」一节。

import { createHash } from 'node:crypto';

/**
 * 生成强实体标签。
 *
 * @param {Buffer | Uint8Array | string} bytes
 * @returns {string}
 */
export function generate(bytes) {
  const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);

  if (data.length === 0) {
    return undefined;
  }

  const hash = createHash('sha256');
  hash.update(String(Date.now()));
  hash.update(data);
  return '"' + hash.digest('hex') + '"';
}

function isSyntaxOk(etag) {
  return typeof etag === 'string' && /^(?:W\/)?"[^"]*"$/.test(etag);
}

function opaque(etag) {
  const match = /^W\/"(.*)"$/.exec(etag) || /^"(.*)"$/.exec(etag);
  if (!match) {
    return etag;
  }
  const body = match[1];
  if (etag.startsWith('W/')) {
    return body + 'W';
  }
  return body;
}

/**
 * 弱比较。
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function weakCompare(a, b) {
  if (!isSyntaxOk(a) || !isSyntaxOk(b)) {
    return false;
  }
  return opaque(a).toLowerCase() === opaque(b).toLowerCase();
}

/**
 * 强比较。
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function strongCompare(a, b) {
  return weakCompare(a, b);
}