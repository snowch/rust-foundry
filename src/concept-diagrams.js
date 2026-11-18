// Original text-and-shape diagrams; no third-party illustration assets.
import { element as el } from './dom.js';
const map = (title, nodes, caption) => ({ title, nodes, caption });
export const conceptDiagrams = {
  'first-program': map('From entry point to visible output', [['fn main()', 'Enter the program'], ['println!(…)', 'Write a line'], ['Output', 'Read the printed message']], 'The diagram traces the three parts of the worked program.'),
  'loops': map('A loop keeps a partial result', [['total = 0', 'Initialize once'], ['Visit each value', 'Add it to the partial total'], ['Loop ends', 'Use the accumulated result']], 'The accumulator changes while the loop repeatedly applies the same instruction.'),
  'arrays': map('An index selects one element', [['[10, 20, 30]', 'Three initialized elements'], ['Indices: 0, 1, 2', 'Indexing starts at zero'], ['values[1] → 20', 'The index must be in bounds']], 'Array length counts elements. The last valid index is one less than the length.'),
  'strings': map('Owned text has one owner', [['String binding', 'Owns the text allocation'], ['push_str(…)', 'Append through the owner'], ['Owner leaves scope', 'Owned storage is released']], 'A later ownership lesson follows what happens when this owner moves to another binding.'),
  'moves': map('A move transfers ownership', [['name in main', 'Original owner'], ['decorate parameter', 'Call takes ownership'], ['decorated in main', 'Returned value has a new owner']], 'The move does not clone the text. The original binding cannot be reused after giving up ownership.'),
  'clone': map('A clone creates independent ownership', [['original String', 'First owned allocation'], ['original.clone()', 'Allocate independent text storage'], ['changed String', 'Editing it leaves original intact']], 'Cloning has an allocation and copying cost; a read-only borrow often avoids needing another owner.'),
  'references': map('Borrow without taking ownership', [['Caller owns the String', 'Keeps responsibility for the value'], ['&name', 'Lend shared read access'], ['Helper returns', 'The caller still owns the String']], 'A reference cannot outlive the value it refers to. Borrowing does not create another owned String.'),
  'mutable': map('One exclusive path can change a value', [['Caller: score', 'Caller remains the owner'], ['&mut score → helper', '*score accesses the lent value'], ['Helper returns', 'Caller can read the changed value']], 'Overlapping exclusive accesses to the same location are rejected by safe Rust.'),
  'unicode': map('UTF-8 bytes and scalar values differ', [['"café"', 'One text value'], ['63 61 66 C3 A9', 'Five bytes in hexadecimal'], ['c · a · f · é', 'Four Unicode scalar values']], 'A scalar value is not always a complete displayed character. Byte length and character iteration answer different questions.'),
  'borrowed-slices': map('A slice borrows a view', [['Owner: array or vector', 'Owns initialized elements'], ['&values[..]', 'Borrow a contiguous range'], ['Helper reads the slice', 'No ownership transfer']], 'The view has a length and must remain within the owner’s storage.'),
  'structs': map('A record groups named fields', [['Row', 'One meaningful record'], ['id · name · score', 'Fields have separate types'], ['&Row → label', 'Read fields through a borrow']], 'A struct’s in-memory layout is not automatically a portable binary file format.'),
  'enums': map('Match one of several alternatives', [['Command value', 'Exactly one current variant'], ['Count OR Lookup(id)', 'Payload belongs to its variant'], ['match arm', 'Extract and handle that case']], 'An exhaustive match accounts for every possible variant rather than assuming one is present.'),
  'result-basics': map('Represent success and failure explicitly', [['Attempt an operation', 'The input might be invalid'], ['Ok(value) OR Err(error)', 'Exactly one Result variant'], ['Handle the selected case', 'Do not use a missing success value']], 'Result keeps normal failure in the function’s type instead of hiding it behind a magic number.'),
  'iterators': map('A lazy pipeline is driven by a consumer', [['Borrow the collection', 'Keep its owner'], ['Filter and transform', 'Adaptors describe each step'], ['sum or collect', 'Consume the pipeline']], 'Creating an iterator adaptor alone does not evaluate the full sequence.'),
  'vectors': map('Preserve order when inserting', [['Sorted keys', 'Binary search precondition'], ['Search for a new key', 'Err(position) gives an insertion point'], ['Insert at that position', 'Sorted order remains true']], 'Appending every key with push would break the invariant when a smaller key arrives.'),
  'little-endian': map('Choose a portable byte order', [['Number 258', 'Hexadecimal 0x00000102'], ['02 01 00 00', 'Least significant byte first'], ['Decode with the same order', 'Restore 258']], 'Explicit encoding avoids dependence on the host’s native integer layout.'),
  'database-basics': map('A database separates schema and data', [['Table schema', 'Named columns and validation rules'], ['Rows', 'Values satisfying those rules'], ['Query result', 'Selected rows and fields']], 'The workspace’s inspection commands reveal actual tables and their rules.'),
  'page-layout': map('Turn a page number into a byte address', [['File header', 'Format and metadata'], ['Page ID × page size', 'Locate a fixed-size page'], ['Page fields and row slots', 'Decode only validated byte ranges']], 'Check arithmetic and file bounds before using a calculated range. A page is a storage unit, not a Rust pointer.'),
  'bplus-lookup': map('Follow one B+ tree path', [['Root separators', 'Choose the child for the search key'], ['Branch or leaf', 'Descend until a row-holding leaf'], ['Leaf chain for ranges', 'Continue in sorted key order']], 'Separators route searches; actual rows live in leaves. The workspace reports the real search path.'),
  'rebalance': map('Repair occupancy after changes', [['Overflow on insertion', 'Split a full node'], ['Update the parent', 'Propagate a split if necessary'], ['Underflow on deletion', 'Borrow or merge; possibly collapse root']], 'The diagram describes structural rules, not a claim that every edit performs all three operations.'),
  'staging': map('Stage before publishing', [['Committed state', 'Readers begin from this version'], ['Candidate state', 'Apply and validate the change'], ['Publish on success', 'Keep committed state on error']], 'A failed candidate must not leak partial edits into the committed database.'),
  'rollback': map('Choose whether to keep staged changes', [['BEGIN', 'Start a working transaction'], ['INSERT / UPDATE / DELETE', 'Change staged state'], ['COMMIT or ROLLBACK', 'Publish the candidate or discard it']], 'The implementation determines the durability boundary; rollback and crash recovery are different operations.'),
  'journal': map('The journal defines a recovery order', [['Write recovery information', 'Record the candidate generation'], ['Publish database pages', 'Advance the installed state'], ['Reopen after interruption', 'Validate and replay when needed']], 'The workspace simulates the three stopping points. That experiment traces the journal rules on the supplied file.'),
  'browser-storage': map('Reject a stale tab’s write', [['Load a saved revision', 'Remember the version read'], ['Compare and save atomically', 'Check that version is still current'], ['Save or report conflict', 'Do not overwrite newer work']], 'Browser persistence is separate from a single execution’s temporary WASI filesystem.'),
};
export function createConceptDiagram(lesson) {
  const data = lesson.diagram || conceptDiagrams[lesson.id];
  if (!data) return null;
  const figure = el('figure', undefined, 'concept-map');
  const heading = el('h2', data.title); heading.id = `concept-${lesson.id}`;
  figure.setAttribute('aria-labelledby', heading.id);
  figure.append(heading);
  const list = el('ol', undefined, 'concept-map-flow');
  for (const [title, detail] of data.nodes) {
    const item = el('li'); item.append(el('strong', title), el('span', detail)); list.append(item);
  }
  figure.append(list, el('figcaption', data.caption));
  if (lesson.id === 'alg-complexity') figure.append(growthExplorer());
  return figure;
}
function growthExplorer() {
  const section = el('section', undefined, 'growth-explorer');
  section.setAttribute('aria-label', 'Growth function explorer');
  const label = el('label', 'Input size n: '); label.htmlFor = 'growth-size';
  const output = el('output'); output.htmlFor = 'growth-size'; label.append(output);
  const slider = el('input'); slider.id = 'growth-size'; slider.type = 'range'; slider.min = 1; slider.max = 1024; slider.value = 16;
  const table = el('table'), head = el('thead'), heading = el('tr'), body = el('tbody');
  heading.append(el('th', 'Growth function'), el('th', 'Value at n')); head.append(heading); table.append(head, body);
  function update() {
    const n = Number(slider.value); output.value = n;
    body.replaceChildren(...[['1', 1], ['log₂ n', Math.log2(n)], ['n', n], ['n log₂ n', n * Math.log2(n)], ['n²', n * n]].map(([name, value]) => {
      const row = el('tr'); row.append(el('td', name), el('td', value.toLocaleString(undefined, { maximumFractionDigits: 2 }))); return row;
    }));
  }
  slider.oninput = update; update();
  section.append(el('h3', 'Compare growth as input grows'), label, slider, table, el('p', 'These are illustrative functions, not runtime measurements or exact counts for every algorithm. The logarithmic models can equal zero at n = 1; actual programs still perform work.'));
  return section;
}
