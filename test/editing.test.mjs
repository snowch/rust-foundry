import test from 'node:test';
import assert from 'node:assert/strict';
import { insertCode } from '../src/editing.js';

test('touch keys insert Rust punctuation with the cursor inside the pair', () => {
  const edit = insertCode('fn main', 7, 7, '()');
  assert.equal(edit.value, 'fn main()');
  assert.equal(edit.cursor, 8);
});
test('touch keys wrap an existing selection without losing it', () => {
  const edit = insertCode('hello', 0, 5, '""');
  assert.equal(edit.value, '"hello"');
  assert.equal(edit.cursor, 6);
});
test('newline key preserves indentation and indents an opening brace', () => {
  const text = 'fn main() {\n    if true {';
  const edit = insertCode(text, text.length, text.length, 'newline');
  assert.equal(edit.value, text + '\n        ');
  assert.equal(edit.cursor, edit.value.length);
});
test('indent and punctuation replace the selection and retain surrounding code', () => {
  assert.equal(insertCode('ab', 1, 1, 'indent').value, 'a    b');
  assert.equal(insertCode('aXb', 1, 2, ';').value, 'a;b');
});
