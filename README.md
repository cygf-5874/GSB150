# etaggen

Node.js 22 的 HTTP 实体标签（ETag）生成与比较库，按 RFC 9110 §8.8 的规则处理
「强校验」与「弱校验」两种比较。

- 语言/依赖：Node.js 22，纯 ESM（`.mjs`），**只允许 `node:` 内置模块**，`package.json` 里不含任何 dependencies。
- 库代码在 `src/etag.mjs`。
- 既有用例：`tests/etag.test.mjs`（`node --test`）。
- 复现脚本：`repro.mjs`（可运行，用来观察当前行为）。
- 固定自检：`bash scripts/check.sh`（`check/` 是**固定验收入口，勿改**）。

## 用法

```js
import { generate, weakCompare, strongCompare } from './src/etag.mjs';

const tag = generate(Buffer.from('hello'));  // '"<64 位小写十六进制>"'
weakCompare('W/"abc"', '"abc"');             // true：弱比较忽略 W/
strongCompare('W/"abc"', '"abc"');           // false：强比较只要有一侧带 W/ 就不等
```

命令行自检（`-list` 列场景名，`--only <组名>` 只跑一组）：

```bash
bash scripts/check.sh
bash scripts/check.sh -list
bash scripts/check.sh --only weak
node --test
node repro.mjs
```

## 对外契约

实体标签（entity-tag）形如 `"<opaque>"`，可带弱前缀 `W/`，例如 `"abc"`、`W/"abc"`。
`generate` 产出**强**标签；`weakCompare` / `strongCompare` 按下面规则比较：

1. `generate(bytes)`：对字节内容生成**强**实体标签 `"<hex>"` —— 内层是内容 **SHA-256 的小写十六进制**
   （64 个字符），外层用双引号包住，**不带** `W/` 前缀。`bytes` 接受 `Buffer` / `Uint8Array`
   （字符串视为 UTF-8 编码）。
2. `weakCompare(a, b)`：按**弱比较** —— 忽略两侧可选的 `W/` 前缀，只比较引号内的实体标签内容，
   内容必须**逐字节相同**。
3. `strongCompare(a, b)`：按**强比较** —— 只要**任一侧**带 `W/` 前缀，结果即为 `false`；
   两侧都不带 `W/` 时，内容逐字节相同才算相等。
4. **非法实体标签抛错**：缺少外层引号（如 `abc`）、引号内出现裸 `"`（如 `"a"b"`）、
   只有一侧引号等不合法输入，`weakCompare` / `strongCompare` 必须**抛出异常**，不得静默返回 `false`。
5. **生成稳定**：同一字节串在**同一进程内**与**跨进程**都得到完全相同的标签（即结果只由输入内容决定）。
6. **大小写敏感**：`"abc"` 与 `"ABC"` **不相等**（强、弱比较都如此）。
7. **空内容合法**：`generate` 对空字节串返回对应空内容的合法标签；空标签内容 `""` 也是合法的实体标签。
8. **与系统状态无关**：生成与比较**不得**依赖系统时间、随机源或任何进程外部状态。

## 目录

```
src/etag.mjs           对外接口：generate / weakCompare / strongCompare
tests/etag.test.mjs    既有用例（node --test）
repro.mjs              复现脚本（可运行）
check/check.mjs        固定验收程序（8 个场景，勿改）
scripts/check.sh       自检入口
package.json           仅声明 type: module，无 dependencies
```