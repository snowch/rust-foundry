export function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function button(text, action, className = 'button secondary') {
  const node = element('button', text, className); node.type = 'button'; node.onclick = action; return node;
}
export function codeBlock(source, label) {
  const box = element('div', undefined, 'reading-code');
  if (label) box.append(element('p', label, 'code-label'));
  const pre = element('pre'); pre.append(element('code', source)); box.append(pre); return box;
}
export function download(data, name, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = element('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
