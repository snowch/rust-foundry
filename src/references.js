import {element as el} from './dom.js';
import {materialSymbol} from './material-symbols.mjs';
const book=path=>'https://doc.rust-lang.org/book/'+path, std=path=>'https://doc.rust-lang.org/std/'+path;
const topics={
 main:['main and the first program',book('ch01-02-hello-world.html'),'The compiler checks main.rs before the program starts at main.'],
 print:['println! and formatting',std('macro.println.html'),'println! prints the formatted text followed by a newline.'],
 bindings:['Bindings and mutability',book('ch03-01-variables-and-mutability.html'),'A binding needs mut when the program assigns another value to it.'],
 numbers:['Numeric types and arithmetic',book('ch03-02-data-types.html'),'The type determines the range and the meaning of operations on a number.'],
 flow:['Conditions and loops',book('ch03-05-control-flow.html'),'Follow which condition selects an arm, and when a loop stops.'],
 functions:['Parameters and return values',book('ch03-03-how-functions-work.html'),'Arguments supply parameter values; a final expression can supply the return value.'],
 assertions:['assert_eq! and checks',std('macro.assert_eq.html'),'An assertion checks the values named in the source. A failed assertion is a program result, distinct from a download failure.'],
 arrays:['Arrays and tuples',book('ch03-02-data-types.html#compound-types'),'A tuple combines positions with potentially different types; an array has a fixed length and one element type.'],
 strings:['String operations',std('string/struct.String.html'),'An owned String can grow; its methods operate on UTF-8 text.'],
 ownership:['Ownership and scope',book('ch04-01-what-is-ownership.html'),'A move transfers ownership. Owned data is released when its owner leaves scope.'],
 clone:['Clone',std('clone/trait.Clone.html'),'String::clone creates independently owned text; moving a String does not clone it.'],
 borrow:['References and borrowing',book('ch04-02-references-and-borrowing.html'),'A reference permits access without transferring ownership. Mutable access has stricter sharing rules.'],
 slices:['Slices and text views',book('ch04-03-the-slice-type.html'),'A slice views existing storage. String slice boundaries must fall on UTF-8 character boundaries.'],
 structs:['Structs and methods',book('ch05-01-defining-structs.html'),'Named fields describe a record; methods operate on a receiver such as &self.'],
 enums:['Enums and match',book('ch06-01-defining-an-enum.html'),'A variant can carry data. A match must handle every alternative.'],
 option:['Option',std('option/enum.Option.html'),'Some(value) represents a present value; None represents its absence.'],
 result:['Result and ?',book('ch09-02-recoverable-errors-with-result.html'),'Result separates a value from an error. The ? operator returns an error to the caller.'],
 checked:['Checked arithmetic',std('primitive.u32.html#method.checked_add'),'Checked operations return None instead of silently producing an out-of-range result.'],
 vec:['Vec',std('vec/struct.Vec.html'),'A Vec owns a growable sequence. Check which operations borrow elements and which change its length.'],
 closure:['Closures',book('ch13-01-closures.html'),'A closure can use values from its surrounding scope. Inspect which values it borrows or moves.'],
 iterator:['Iterator',std('iter/trait.Iterator.html'),'An iterator produces one item at a time. Consumers such as collect and sum request those items.'],
 modules:['Modules and use',book('ch07-04-bringing-paths-into-scope-with-the-use-keyword.html'),'use brings a path into scope; it does not copy the referenced code into your function.'],
 map:['HashMap',std('collections/struct.HashMap.html'),'Keys identify values. Inserting an existing key replaces its previous value.'],
 set:['HashSet',std('collections/struct.HashSet.html'),'A set keeps distinct values; insertion reports whether a value was new.'],
 traits:['Traits',book('ch10-02-traits.html'),'A trait names behaviour that different types can implement.'],
 generic:['Generic types',book('ch10-01-syntax.html'),'A generic function uses type parameters, constrained by the operations it needs.'],
 derive:['Derivable traits',book('appendix-03-derivable-traits.html'),'derive generates only the named supported trait implementations.'],
 lifetime:['Reference lifetimes',book('ch10-03-lifetime-syntax.html'),'Lifetime annotations describe relationships between borrowed values; they do not extend the lifetime of owned data.'],
 alias:['Type aliases',book('ch20-03-advanced-types.html#creating-type-synonyms-with-type-aliases'),'A type alias gives an existing type another name. It does not create a distinct type.'],
 collections:['Collection operations',std('collections/index.html'),'Choose an operation by the access pattern the lesson measures, not just by the collection name.'],
 bytes:['Little-endian bytes',std('primitive.u32.html#method.from_le_bytes'),'from_le_bytes decodes exactly four bytes in the documented byte order. Validate lengths before reading fields.'],
 tests:['Rust tests',book('ch11-01-writing-tests.html'),'A test names a behaviour and checks its result. Include invalid inputs as well as ordinary cases.'],
 files:['Files and I/O results',std('fs/index.html'),'File operations return Result. A reported success and durable storage after a real crash are different guarantees.'],
 format:['TinyDB file formats','https://github.com/snowch/rust-foundry/blob/main/docs/tinydb-format.md','The format document names field widths, page kinds and validation rules used by this course’s database. The downloadable course archive includes a copy.'],
 pages:['BTreeMap and ordered ranges',std('collections/struct.BTreeMap.html'),'Compare ordered key lookup with the explicit page and tree relationships shown in the lesson.'],
 durability:['TinyDB commit and recovery contracts','https://github.com/snowch/rust-foundry/blob/main/docs/tinydb-format.md','Journal interruption commands are teaching simulations. The browser workspace has a separate atomic save boundary.']
};
const groups=[
 ['first-program compiler-messages','main'],['printing formatting','print'],['bindings mutable-values','bindings'],['numbers arithmetic comparisons','numbers'],['branches loops','flow'],['functions parameters return-values','functions'],['assertions','assertions'],['tuples arrays','arrays'],['strings unicode','strings'],['moves copy scope','ownership'],['clone','clone'],['references mutable shared borrowed-slices static-text','borrow'],['text-slices slices','slices'],['structs methods','structs'],['enums','enums'],['optional-values option option-propagation','option'],['result-basics result question-mark atomic-change','result'],['checked-arithmetic','checked'],['vector-basics vectors alg-lists alg-stacks alg-queues','vec'],['closures','closure'],['iterator-basics iterators','iterator'],['imports','modules'],['maps alg-hashes','map'],['sets','set'],['traits','traits'],['generics','generic'],['derive','derive'],['lifetimes','lifetime'],['aliases','alias'],['alg-complexity alg-search alg-sort alg-recursion alg-trees alg-graphs','collections'],['little-endian decode checksums','bytes'],['tests','tests'],['files','files'],['database-basics sql-crud row-validation sql-strings tdb1 page-layout recursion bplus-lookup rebalance source-primer','format'],['staging rollback commit-generation journal redo browser-storage','durability']
];
const lookup=new Map(groups.flatMap(([ids,key])=>ids.split(' ').map(id=>[id,[key]])));
for(const[id,key]of [['copy','clone'],['shared','slices'],['option','borrow'],['vectors','iterator'],['page-layout','bytes'],['tdb1','bytes'],['bplus-lookup','pages'],['rebalance','pages'],['commit-generation','checked'],['journal','files'],['redo','files']])lookup.get(id).push(key);
export function lessonReferences(lesson){
 const keys=lookup.get(lesson.id);if(!keys)throw Error('Missing lesson references: '+lesson.id);
 const box=el('details',undefined,'resource-row lesson-references'),summary=el('summary'),icon=el('span'),copy=el('span'),chevron=el('span',undefined,'resource-chevron');icon.innerHTML=materialSymbol('menu_book');chevron.innerHTML=materialSymbol('chevron_right');copy.append(el('strong','References'),el('small',keys.map(key=>topics[key][0]).join(' · ')));summary.append(icon,copy,chevron);box.append(summary);
 const list=el('ul');for(const key of keys){const[title,url,reminder]=topics[key],item=el('li'),link=el('a',title+' (new tab)');link.href=url;link.target='_blank';link.rel='noopener';item.append(link,el('p',reminder));list.append(item);}box.append(list);return box;
}
