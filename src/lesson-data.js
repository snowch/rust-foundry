export function lesson(chapter, id, title, data) {
  const source = data.source || `fn main() {\n${data.body}\n}\n`;
  const solution = data.solution || source;
  return { chapter, id, title, kind: 'rust', revision: 2, ...data, source, solution,
    expected: data.expected.endsWith('\n') ? data.expected : data.expected + '\n',
    checkType: /assert(?:_eq|_ne)?!/.test(solution) ? 'assertions' : 'output' };
}
export const main = body => `fn main() {\n${body}\n}\n`;
export function exercise(signature, body, driver) {
  return { source: `${signature} {\n${body}\n}\n\n${driver}\n`,
    starter: `${signature} {\n    todo!("Implement this function using the lesson steps")\n}\n\n${driver}\n` };
}
