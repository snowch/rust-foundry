export function insertCode(value, start, end, key) {
  const selection = value.slice(start, end);
  const pairs = { '{}': ['{', '}'], '()': ['(', ')'], '[]': ['[', ']'], '""': ['"', '"'] };
  let text, cursor;
  if (pairs[key]) {
    const [open, close] = pairs[key];
    text = open + selection + close;
    cursor = start + open.length + selection.length;
  } else if (key === 'newline') {
    const line = value.slice(0, start).split('\n').at(-1);
    const indent = line.match(/^\s*/)[0];
    text = '\n' + indent + (line.trimEnd().endsWith('{') ? '    ' : '');
    cursor = start + text.length;
  } else {
    text = key === 'indent' ? '    ' : key;
    cursor = start + text.length;
  }
  return { text, cursor, value: value.slice(0, start) + text + value.slice(end) };
}
