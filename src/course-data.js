import { rustLessons as previousRust, databaseLessons as previousDatabase, ownershipSteps } from './course-v1.js';
import { foundations } from './foundations.js';
import { bridges } from './bridges.js';
import { exercise } from './lesson-data.js';
export { ownershipSteps };

const previous = new Map([...previousRust, ...previousDatabase].map(item => [item.id, item]));
function revise(id, data) {
  const old = previous.get(id);
  if (!old) throw new Error(`Unknown earlier lesson: ${id}`);
  const result = { ...old, ...data, revision: 2, practiceInstruction: data.practiceInstruction || 'Replace the todo! marker in the named function. Keep the supplied main and its checks.' };
  if (data.source && !data.solution) result.solution = data.source;
  result.checkType = /assert(?:_eq|_ne)?!/.test(result.solution) ? 'assertions' : 'output';
  return result;
}

const revised = [
  revise('moves', {
    objective: 'Trace ownership through a String parameter and returned value.', prerequisites: ['formatting'], introduces: ['move', 'ownership-transfer'],
    explain: ['The previous lessons created and changed owned text. Now follow who owns that String: a String parameter takes ownership when it receives the caller’s value.', 'In decorate(name), ownership moves from name in main into the function’s parameter. Returning the parameter moves ownership into decorated in the caller. A move does not clone the text.', 'The parameter uses mut because it appends text with the method you already know. After the call, decorated is usable and the original name binding is no longer usable.', 'The assertions and output use the new owner. To read the text without transferring ownership, we will introduce references in the next chapter.'],
    pitfall: 'Printing the original name after the call is an ownership error: that binding no longer owns the String.',
    walkthrough: ['The name binding in main initially owns the String.', 'The call moves it into the parameter; the returned value becomes owned by decorated.', 'When the new owner leaves its scope, Rust releases the owned text.'],
    experiment: 'Add println!("{name}") after the call, read the moved-value diagnostic, then remove that line.'
  }),
  revise('copy', {
    objective: 'Distinguish copying a u32 from moving an owned String.', prerequisites: ['moves', 'tuples'], introduces: ['Copy'],
    explain: ['Assigning a u32 makes another usable copy of that number. Rust calls this behaviour Copy. You can use both integer bindings after the assignment.', 'This is a property of a type, not an exception to the String ownership rule. String does not have Copy behaviour; an assignment of a String transfers its ownership.', 'The worked function returns a tuple, whose construction and destructuring you have already practised. Both elements remain usable because the integers were copied.'],
    pitfall: 'Do not infer that the same assignment copies every type. Changing u32 to String changes the ownership behaviour.',
    choices: ['u32 has Copy behaviour', 'The binding is mutable', 'Every assignment must move its value'], answer: 0,
    feedback: 'The integer is copied, so both bindings keep usable values. An owned String assignment follows the move rule instead.',
    experiment: 'Compare let second = first with a u32 and with a String. Read which original binding remains usable.'
  }),
  revise('clone', {
    objective: 'Make an explicit independent copy of owned text.', prerequisites: ['copy'], introduces: ['Clone', 'clone-method'],
    explain: ['A move transfers ownership. .clone() explicitly creates a separate owned value. For a String, that means independent text storage.', 'The function clones original into changed, then appends to changed. original keeps its contents, as the checks show.', 'The tuple returns the two independent owners together. Only changed needs mut, because only that local value is edited.'],
    pitfall: 'Cloning to silence every ownership error can add unnecessary copies. Later references let a reader access text without another owner.',
    walkthrough: ['clone creates a second String with independent owned text.', 'Changing the second String leaves the first value intact.'],
    feedback: 'String::clone copies the text into separate owned storage, so changing the clone leaves the original unchanged.',
    choices: ['Yes, both names share the same owned String', 'No, the clone owns independent text', 'Yes, cloning gives away the original owner'],
    experiment: 'Append different text to each returned String and observe that they can change independently.'
  }),
  revise('mutable', {
    objective: 'Change a caller’s integer through one exclusive reference.', prerequisites: ['references', 'mutable-values'], introduces: ['mutable-reference', 'dereference', 'exclusive-borrow'],
    explain: ['A shared reference supplies read access. &mut supplies exclusive access so a helper can change a value while the caller remains its owner.', 'The declaration fn award(score: &mut u32) accepts a mutable reference. The call uses &mut score to lend that access. The caller’s binding must itself be mut.', '*score means the integer behind the reference. *score += 5 changes that integer; it does not reassign the reference to a different integer.', 'The two calls work because their exclusive borrows do not overlap. The first call finishes before the second borrow begins.'],
    experiment: 'Call award a third time and predict the caller’s score before changing the final assertion.'
  }),
  revise('shared', {
    objective: 'Measure a borrowed text view in UTF-8 bytes.', prerequisites: ['unicode'], introduces: ['borrowed-byte-length'],
    explain: ['You have now seen shared references, &str text views, and the difference between UTF-8 bytes and characters. This exercise combines those ideas without adding a new ownership rule.', 'The helper takes &str, reads its byte length, and returns a usize. In byte_len(&name), Rust can use the borrowed String as a text view; name.as_str() is the explicit alternative you already know.', 'The call does not take ownership. The caller can therefore display name after measuring it. café occupies five bytes, so the supplied assertion expects five.'],
    experiment: 'Use an ASCII-only name, then an accented name, and compare the measured byte lengths.'
  }),
  revise('structs', {
    objective: 'Construct and read a record with named fields.', prerequisites: ['borrowed-slices', 'static-text', 'formatting'], introduces: ['struct', 'field', 'struct-construction'],
    explain: ['A tuple groups values by position. A struct groups them by named fields, making the meaning of each value clearer. Row has id, name, and score fields.', 'Each field declaration includes its type. A Row construction names each field and supplies its value. The name field owns a String, so it is created with String::from.', 'row.id reads the named id field, unlike pair.0 for a tuple position. The helper accepts &Row and formats the fields without taking ownership of the row.', 'There is no derive attribute in this first struct example. Generating trait implementations is a separate later lesson.'],
    ...exercise('struct Row { id: u32, name: String, score: u32 }\n\nfn label(row: &Row) -> String', '    format!("{} | {} | {}", row.id, row.name, row.score)', 'fn main() {\n    let row = Row { id: 1, name: String::from("Ada"), score: 90 };\n    assert_eq!(label(&row), "1 | Ada | 90");\n    println!("{}", label(&row));\n}'),
    pitfall: 'A struct with an owned String is not automatically Copy. Borrow it when a helper only needs to read it.',
    experiment: 'Construct another Row and call label on both records.'
  }),
  revise('enums', {
    objective: 'Handle each named alternative of an enum with match.', prerequisites: ['methods'], introduces: ['enum', 'variant', 'match', 'pattern', 'wildcard-pattern'],
    explain: ['An enum represents a choice between named alternatives called variants. Command::Count carries no additional data; Command::Lookup(42) carries an ID.', 'match selects the arm whose pattern matches the current variant. An arm has pattern => expression syntax. In Command::Lookup(id), the pattern binds the carried value to id.', 'The match must handle every possible variant. A pattern written _ means “anything else”, and an _ payload ignores a value you do not need. Explicit variant arms make it easier to notice a newly added case.', 'Each arm here returns an owned String, using String::from or format!. These operations are already familiar; the new idea is choosing an arm by the enum’s variant.'],
    ...exercise('enum Command { Count, Lookup(u32) }\n\nfn describe(command: Command) -> String', '    match command {\n        Command::Count => String::from("count all rows"),\n        Command::Lookup(id) => format!("lookup {id}"),\n    }', 'fn main() {\n    assert_eq!(describe(Command::Count), "count all rows");\n    assert_eq!(describe(Command::Lookup(7)), "lookup 7");\n    println!("{}", describe(Command::Lookup(42)));\n}'),
    experiment: 'Add a Delete(u32) variant and let the compiler identify the match that needs another arm.'
  }),
  revise('option', {
    objective: 'Return an optional borrowed name from a small record search.', prerequisites: ['optional-values', 'borrowed-slices'], introduces: ['optional-reference', 'borrowed-return'],
    explain: ['A search may find a record or find nothing. Option<&str> expresses those outcomes without making a second owned copy of a name.', 'The helper loops over a borrowed slice of (id, String) tuples. It compares each id and returns Some(name view) as soon as it finds a match. If the loop ends with no match, it returns None.', 'The returned view refers to data owned by rows, so it cannot outlive that owner. With one borrowed input collection, Rust can infer this relationship; the later lifetime-annotation lesson makes similar relationships explicit.', 'main uses an array, which you already know. It deliberately does not introduce a Vec or iterator closure before those topics are taught.'],
    ...exercise('fn find_name(rows: &[(u32, String)], wanted: u32) -> Option<&str>', '    for row in rows {\n        if row.0 == wanted { return Some(row.1.as_str()); }\n    }\n    None', 'fn main() {\n    let rows = [(1, String::from("Ada")), (2, String::from("Lin"))];\n    assert_eq!(find_name(&rows, 99), None);\n    assert_eq!(find_name(&rows, 2), Some("Lin"));\n    println!("{}", find_name(&rows, 1).unwrap_or("missing"));\n}'),
    walkthrough: ['The loop reads each borrowed tuple without moving its String.', 'A matching row returns a borrowed name; exhausting the loop returns None.'],
    experiment: 'Ask for a missing ID and use match to print a deliberate not-found message.'
  }),
  revise('slices', {
    chapter: 'model', objective: 'Handle an empty slice without indexing past its bounds.', prerequisites: ['option'], introduces: ['first-method', 'checked-access'],
    explain: ['Direct values[0] indexing assumes an element exists. .first() instead returns Some(reference) for the first element or None for an empty slice.', 'The helper matches that Option. Some(value) contains a reference, so *value reads the u32. The None arm supplies zero as the chosen fallback.', 'This reuses slice borrowing and enum matching. It avoids .copied() and iterator pipelines until their own lessons.'],
    ...exercise('fn first_or_zero(values: &[u32]) -> u32', '    match values.first() { Some(value) => *value, None => 0 }', 'fn main() {\n    assert_eq!(first_or_zero(&[]), 0);\n    let values = [9, 8, 7];\n    assert_eq!(first_or_zero(&values[1..]), 8);\n    println!("{}", first_or_zero(&values));\n}'),
    walkthrough: ['first returns Some(&9) for the full array view.', 'The empty view produces None, so the fallback is used.'],
    choices: ['Stop with an error', '0', 'Read a first element even though the slice is empty'],
    hints: ['Match the Option returned by values.first().', 'Return *value for Some(value), or zero for None.'], experiment: 'Pass &values[2..2] and predict which arm runs.'
  }),
  revise('result', {
    objective: 'Parse a positive numeric ID and distinguish parsing from validation.', prerequisites: ['result-basics'], introduces: ['parse', 'method-type-argument', 'match-guard', 'numeric-overflow'],
    explain: ['Parsing means interpreting text as a value. text.parse::<u32>() asks the standard parser for a u32. The ::<u32> chooses the method’s output type; angle brackets specify a type rather than a runtime input value.', 'parse returns Result because malformed text, negative numbers, or a number too large for u32 cannot produce this value. An Err(_) pattern ignores the parser’s detailed error when you want your own message.', 'Parsing is different from a domain rule: zero parses as u32, but TinyDB IDs must be positive. Ok(id) if id > 0 is a guarded match arm; the condition must also be true for that arm to match.', 'The function returns one fixed error message for every rejected input. Its &\'static str error type is the literal-text reference you have already learned.'],
    experiment: 'Add checks for surrounding whitespace and leading zeroes, then document which strings the standard parser accepts.'
  }),
  revise('question-mark', {
    objective: 'Propagate a Result error with ? instead of repeating a match.', prerequisites: ['checked-arithmetic'], introduces: ['result-question-mark', 'error-propagation'],
    explain: ['A fallible helper can pass a failure back to its caller. ? returns early when its Result is Err, or extracts the value when it is Ok.', 'The worked program includes the previous parsing pattern as a named helper, number. You are reusing that helper; the new operation is ? on each call.', 'After both parses succeed, checked_add and ok_or handle overflow as in the preceding lesson. No closure or map_err knowledge is needed here.', 'The ? operator is not a panic catcher. It handles the Result values explicitly returned by these operations.'],
    ...exercise("fn number(text: &str) -> Result<u32, &'static str> {\n    match text.parse::<u32>() { Ok(value) => Ok(value), Err(_) => Err(\"bad number\") }\n}\n\nfn add_text(a: &str, b: &str) -> Result<u32, &'static str>", '    let a = number(a)?;\n    let b = number(b)?;\n    a.checked_add(b).ok_or("overflow")', 'fn main() {\n    assert_eq!(add_text("x", "2"), Err("bad number"));\n    assert_eq!(add_text("4294967295", "1"), Err("overflow"));\n    assert_eq!(add_text("19", "23"), Ok(42));\n    println!("{}", add_text("19", "23").unwrap());\n}'),
    walkthrough: ['number(a)? stops this function immediately if the first parse fails.', 'Only after both values are available does the checked addition run.'],
    hints: ['Call the provided number helper on each input and put ? after each call.', 'Then return a.checked_add(b).ok_or("overflow").']
  }),
  revise('atomic-change', {
    objective: 'Keep a previous value intact when a replacement is rejected.', prerequisites: ['question-mark', 'mutable'], introduces: ['failure-atomicity', 'validation-before-mutation'],
    explain: ['A failed change should leave the previous valid state intact. First validate the proposed replacement; only assign it after those checks succeed.', 'This helper uses .is_empty() to ask whether the text has no bytes, and .len() to enforce the maximum byte count. || rejects the replacement if either rule fails.', 'On success, String::from(replacement) creates the new owned text and *name replaces the caller’s String through its mutable reference. On failure, the early Err occurs before that assignment.', 'Rust’s ownership checks do not automatically give your application this failure guarantee. The order of your validation and mutation matters.'],
    ...exercise("fn rename(name: &mut String, replacement: &str) -> Result<(), &'static str>", '    if replacement.is_empty() || replacement.len() > 31 { return Err("invalid name"); }\n    *name = String::from(replacement);\n    Ok(())', 'fn main() {\n    let mut name = String::from("Ada");\n    assert!(rename(&mut name, "").is_err());\n    assert_eq!(name, "Ada");\n    rename(&mut name, "Lin").unwrap();\n    assert_eq!(name, "Lin");\n    println!("{name}");\n}'),
    experiment: 'Try an overlong replacement and check that the previous name remains unchanged.'
  }),
  revise('iterators', {
    objective: 'Filter copied numbers and reduce the remaining values to a sum.', prerequisites: ['iterator-basics'], introduces: ['filter', 'sum', 'lazy-adapter'],
    explain: ['An iterator pipeline connects small operations. .iter() borrows the scores, and .copied() supplies u32 values instead of references to them.', '.filter(predicate) keeps items whose predicate returns true. It temporarily lends each candidate to the predicate, so |score| *score >= 50 reads through a reference even though the iterator supplies copied numbers.', '.sum() consumes the retained values and adds them. The helper’s u32 return type tells Rust which sum type is expected.', 'Operations such as filter are lazy: constructing them does not process the whole sequence. A consuming operation such as sum or collect drives the pipeline.'],
    experiment: 'Instead of sum, collect the retained values into a binding annotated Vec<u32>, then print that vector with debug formatting.'
  }),
  revise('vectors', {
    objective: 'Keep a vector sorted while rejecting duplicate keys.', prerequisites: ['iterators', 'result-basics'], introduces: ['sorted-invariant', 'binary-search', 'insertion-position'],
    explain: ['An invariant is a rule kept true after every operation. Here keys must remain sorted and unique. That lets binary_search search the ordered values efficiently.', 'keys.binary_search(&key) returns Ok(index) when the key exists, or Err(index) containing where a missing key belongs. This Result uses Err for a not-found position rather than a text error.', 'Vec::insert(index, value) inserts at that position and shifts later elements. Appending with push would be wrong for a key that belongs in the middle.', 'The function checks the search result before changing keys, preserving the state if the requested key is already present.'],
    experiment: 'Insert a key before the first element and after the last element, checking sorted order each time.'
  }),
  revise('maps', {
    objective: 'Count repeated text keys with a HashMap entry.', prerequisites: ['imports', 'vectors'], introduces: ['HashMap', 'key-value', 'entry', 'or-insert', 'get'],
    explain: ['A HashMap associates each key with a value. HashMap<String, u32> uses owned text as its keys and integer counts as its values. The import makes that standard type’s short name available.', '.entry(key).or_insert(0) finds the key’s current value or inserts an initial zero. It returns a mutable reference to the count, which you can increment using *count += 1.', 'The input is a slice of borrowed text views. The loop’s word is a reference to one such view, so *word gives the &str used by String::from. This creates the owned key the map needs.', '.get("rust") borrows a key to look up an optional reference to its value. As with other checked lookups, a missing key produces None. HashMap does not promise iteration order.'],
    ...exercise('use std::collections::HashMap;\n\nfn counts(words: &[&str]) -> HashMap<String, u32>', '    let mut result = HashMap::new();\n    for word in words {\n        let count = result.entry(String::from(*word)).or_insert(0);\n        *count += 1;\n    }\n    result', 'fn main() {\n    let counts = counts(&["rust", "db", "rust"]);\n    assert_eq!(counts.get("rust"), Some(&2));\n    assert_eq!(counts.get("missing"), None);\n    println!("rust: {}", counts["rust"]);\n}'),
    experiment: 'Add another rust input and predict its count without relying on map iteration order.'
  }),
  revise('traits', {
    objective: 'Define and implement a named method contract for a concrete type.', prerequisites: ['sets', 'methods'], introduces: ['trait', 'trait-implementation', 'trait-method'],
    explain: ['A trait names behaviour that a type promises to provide. trait Identified declares an id method; impl Identified for Person supplies that method for Person.', 'The method receives &self, just like the struct method you already wrote. The body returns the existing id field.', 'This first trait example uses the concrete Person type in its helper. It introduces no generic function parameters yet. The next lesson uses a trait bound to make one algorithm accept several types.', 'You have already seen Copy and Clone behaviour. Traits give such behaviour a name that other code can require.'],
    ...exercise('trait Identified { fn id(&self) -> u32; }\nstruct Person { id: u32 }\nimpl Identified for Person { fn id(&self) -> u32 { self.id } }\n\nfn same_id(left: &Person, right: &Person) -> bool', '    left.id() == right.id()', 'fn main() {\n    assert!(same_id(&Person { id: 7 }, &Person { id: 7 }));\n    assert!(!same_id(&Person { id: 7 }, &Person { id: 8 }));\n    println!("{}", same_id(&Person { id: 1 }, &Person { id: 1 }));\n}'),
    pitfall: 'A trait declaration states the required method; the implementation provides its actual body.',
    question: 'Which method does Identified require?', choices: ['id()', 'clone()', 'push_str()'], answer: 0,
    feedback: 'The trait declares the id method; each implementing type supplies its method body.',
    experiment: 'Add a second concrete type with an id field and implement Identified for it.'
  }),
  revise('generics', {
    objective: 'Write one ordered-slice algorithm for more than one element type.', prerequisites: ['traits'], introduces: ['generic-function', 'trait-bound', 'Ord', 'max'],
    explain: ['You have used type arguments in Option<u32>, Vec<u32>, and parse::<u32>(). A generic function now lets you name an unspecified type parameter yourself: <T>.', 'The bound T: Ord requires that type to support a total ordering, so the function can compare any two values of that type. Integers and string slices support this standard trait.', 'values.iter().max() returns an optional reference to the largest element. The reference stays borrowed from the input slice, and an empty slice produces None.', 'The calls choose integer or text element types. largest::<u32>(&[]) explicitly supplies the type for an empty input, where no element would otherwise reveal it.'],
    pitfall: 'The bound is part of the contract: Rust rejects a type that cannot provide the required ordering.',
    experiment: 'Use a nonempty array of text slices, then an empty typed slice, and compare the results.'
  }),
  revise('lifetimes', {
    objective: 'Explain which input references support a borrowed return value.', prerequisites: ['derive', 'static-text'], introduces: ['named-lifetime', 'lifetime-relationship'],
    explain: ['The static-text lesson returned a literal valid for the whole program. This function instead returns one of two borrowed inputs, whose owners may have shorter scopes.', 'The name \'a in <\'a> is a lifetime parameter. Writing &\'a str for both inputs and the output states a relationship: the returned reference must remain valid within a lifetime supported by both input borrows.', 'The annotation neither allocates a copy nor extends an owner’s lifetime. The comparison merely selects which already-borrowed view to return.', 'Equal lengths select the first input in this contract. The assertions check both the longer-text case and that tie rule.'],
    experiment: 'Call longer inside a nested scope containing one input owner. Check where the returned borrow can still be used.'
  }),
  revise('little-endian', {
    objective: 'Encode a u32 into four bytes in a specified byte order.', prerequisites: ['aliases', 'lifetimes', 'unicode'], introduces: ['byte-order', 'little-endian', 'hexadecimal', 'integer-codec'],
    explain: ['A file format is an agreed rule for translating values into bytes. A u32 uses four bytes, and byte order specifies which byte comes first.', 'Little-endian puts the least significant byte first. For 258, that is [2, 1, 0, 0]: two units plus one group of 256. .to_le_bytes() encodes this order, and u32::from_le_bytes(...) decodes it.', 'A numeric literal beginning 0x is hexadecimal, base sixteen. Digits A through F mean ten through fifteen. 0x12345678 is a compact way to show four distinct byte groups in the known-byte test; you do not need to calculate its decimal value.', 'The returned [u8; 4] is the fixed-size array type you learned earlier. Do not copy a Rust struct’s raw memory as a format: its internal layout and owning fields do not define portable file bytes.'],
    experiment: 'Encode 258 and a value with a zero byte in the middle, then decode those arrays back.'
  }),
  revise('decode', {
    objective: 'Check input bounds before decoding a fixed-size integer.', prerequisites: ['little-endian', 'question-mark', 'closures'], introduces: ['range-get', 'try-into', 'map-err'],
    explain: ['A decoder cannot assume the file is long enough. bytes.get(..4) asks for the first four bytes and returns Option, instead of panicking on a short input. The ..4 range means zero through the position before four.', '.ok_or("short input") converts absence into an error, and ? propagates it as you have already practised.', '.try_into() attempts to convert the checked slice into the required [u8; 4] array. It returns Result. .map_err(closure) changes only an Err value, here into our chosen fixed message; the closure’s _ ignores the original conversion error.', 'Only after those checks does from_le_bytes interpret the four bytes as a number. Invalid input returns an error without indexing beyond the available bytes.'],
    experiment: 'Require exactly four bytes by adding a length check, then test a five-byte input.'
  }),
  revise('tests', {
    objective: 'Check codec boundaries and distinguish a round-trip test from an independent fixture.', prerequisites: ['decode', 'iterator-basics'], introduces: ['invariant-test', 'round-trip', 'independent-fixture'],
    explain: ['A round trip encodes a value and decodes the result. The original and decoded values should agree. A boundary is a case where representation changes, such as 255 to 256.', 'The .all(closure) iterator method returns true only if every supplied value satisfies the comparison. An empty iterator also returns true because no item violates the rule.', 'A round-trip test can miss two functions sharing the same mistake. Compare known expected bytes too, or exchange a file with an independent implementation.', 'The assertions here run in main in the browser. A native rustc --test build is a separate way to run Rust test functions; you do not need that command to complete this browser lesson.'],
    experiment: 'Compare an encoded value with its explicitly expected byte array, as well as decoding it back.'
  }),
  revise('row-validation', {
    objective: 'Apply the table’s name rules before accepting a row.', prerequisites: ['sql-crud', 'unicode', 'iterator-basics'], introduces: ['validation-rule', 'ASCII-control', 'repeat'],
    explain: ['You have seen the people table and its columns. Its name rule allows 1–31 UTF-8 bytes and forbids ASCII control characters. A control character is a byte such as newline or zero that controls text handling rather than displaying a normal letter.', 'name.is_empty() checks for no bytes. name.bytes().any(predicate) tests whether at least one byte violates the rule. Unlike filter, any passes each byte value directly to its predicate.', 'Bytes below 32 and the DEL byte 127 are rejected. A positive id, a name meeting this rule, and a u32 score form a valid row; checking id uniqueness additionally needs access to the stored table.', 'The test helper "é".repeat(16) creates a String containing sixteen copies of that text. It occupies 32 bytes and therefore exceeds the name limit. Validation must happen before changing the database.'],
    experiment: 'In the lab, try an empty name and a duplicate ID separately. Verify that the earlier valid row remains.'
  }),
  revise('sql-strings', {
    objective: 'Decode a SQL quoted-text token without treating its contents as commands.', prerequisites: ['row-validation', 'iterator-basics'], introduces: ['token', 'lexer', 'parser', 'SQL-quote-escape', 'push-character'],
    explain: ['SQL commands contain keywords, numbers, punctuation, and quoted text. A lexer separates these into tokens; a parser checks that their order follows the supported command rules. This helper decodes just one text token.', 'SQL doubles a quote inside a quoted name: \'O\'\'Neil\' represents O\'Neil. This differs from Rust’s backslash escape for a quote in a char literal. The source uses \'\\\'\' to write one Rust quote character.', '.starts_with and .ends_with check the surrounding quotes before slicing. String::new() creates empty owned text, and .push(character) appends one char.', 'The chars iterator and while let loop use the operations you already learned. On an interior quote, the helper requires and consumes the second quote of the SQL escape pair. A complete parser must also check all remaining tokens and limits.'],
    experiment: 'Use a SQL name containing both a quote and a semicolon; verify that the semicolon stays inside the name.'
  }),
  revise('tdb1', {
    objective: 'Validate a documented header and its exact record length.', prerequisites: ['sql-strings', 'files', 'little-endian'], introduces: ['file-header', 'magic', 'version', 'record-size', 'byte-literal', 'numeric-cast'],
    explain: ['TDB1 is an exchange format shared with C Foundry. A header is the first metadata in a file. Its magic, the bytes spelling TDB1, identifies the format; its version distinguishes compatible layouts.', 'The exact eight header bytes are TDB1, version 1, row size 40, a one-byte row count, and a reserved zero byte. The count may be at most 128. After the header, each record has id (4 bytes), a zero-terminated UTF-8 name field (32 bytes), and score (4 bytes). Integer fields use little-endian order.', 'In Rust, b"TDB1" is a byte-string literal: the ASCII letter codes as bytes rather than a text slice. bytes[6] as usize converts the small count byte to the length/index type. This widening conversion is safe for u8; arbitrary narrowing casts would need their own validation.', 'The whole file must have exactly 8 + count * 40 bytes. This exercise checks only that outer contract. The full Rust decoder also validates each row and rejects duplicate IDs. .export creates a separate TDB1 file; .import accepts it after validation.'],
    experiment: 'Download exchange.tdb, reopen it in C Foundry, and compare the displayed rows.'
  }),
  revise('page-layout', {
    objective: 'Calculate a fixed page’s offset while rejecting overflow and truncation.', prerequisites: ['tdb1', 'option-propagation'], introduces: ['page', 'page-id', 'byte-offset', 'paged-file'],
    explain: ['TDB1 stores a simple sequence of records. TinyDB’s normal RDB2 format divides a file into fixed-size pages of 256 bytes, so each page ID can be translated into a byte offset.', 'Page zero contains the file header. Other pages hold rows, index branches, or reusable free space. The next lesson explains how branches and row-holding leaves form a tree.', 'Page id starts at id * 256 and ends just before start + 256. Both calculations must be checked for numeric overflow, and the entire page must fit inside the file.', 'The helper returns Some(start) for a whole valid page and None otherwise. Its ? operators propagate None as in the earlier optional-calculation lesson. TinyDB loads these bounded pages into memory; its commit writes a complete snapshot rather than implementing a disk cache.'],
    experiment: 'Compare a 300-byte file with a 512-byte file when requesting page one.'
  }),
  revise('bplus-lookup', {
    objective: 'Choose the correct child using a sorted separator list.', prerequisites: ['recursion', 'vectors', 'closures'], introduces: ['tree', 'root', 'branch', 'leaf', 'separator', 'B-plus-tree', 'range-seek', 'partition-point'],
    explain: ['A tree arranges nodes in levels. Search begins at the root. A branch directs the search to a child, while a leaf holds actual rows. A B+ tree keeps every row in sorted leaves, with branches used only for direction.', 'A separator key is the smallest key in the child to its right. With separators [10, 20], keys below ten go to child zero, ten through nineteen to child one, and twenty or more to child two.', '.partition_point(predicate) finds the boundary where a rule stops being true in sorted data. Here it counts separators <= the sought key. The closure syntax and shared-reference dereference are already familiar.', 'A point lookup follows one root-to-leaf path. A range query seeks its first key and then follows links between leaves. EXPLAIN reports the actual page path; it does not substitute a different search engine.'],
    experiment: 'Compare EXPLAIN paths for a present key, a missing key, and a bounded range in the lab.'
  }),
  revise('rebalance', {
    objective: 'Split an overflowing sorted leaf without losing its promoted key.', prerequisites: ['bplus-lookup', 'vector-basics'], introduces: ['leaf-split', 'branch-split', 'occupancy', 'redistribution', 'merge', 'root-collapse', 'split-off'],
    explain: ['TinyDB deliberately uses small capacities: four rows per leaf and five child pointers per branch. Occupancy means how many entries a node currently holds. These small limits let a short lab reveal structural changes.', 'The helper is called on a known, nonempty overflow vector. For five sorted keys, split_off(len / 2) leaves two on the left and returns three on the right. The first right key becomes the parent separator, but remains a data key in the right leaf.', 'In the full tree, the new right leaf is linked into the leaf chain and inserted into its parent. An overflowing parent splits too; a split root creates a new level.', 'Deletion needs the opposite repair: borrow an entry from a sibling with spare capacity, or merge two small nodes and free the removed page. A one-child root collapses. These are the full implementation’s invariants; .check validates them after the lab operations.'],
    experiment: 'Delete the largest two keys after the split, then compare the root, free pages, and .check output.'
  }),
  revise('staging', {
    objective: 'Keep a committed collection unchanged while editing a candidate copy.', prerequisites: ['source-primer', 'atomic-change'], introduces: ['transaction', 'staged-state', 'committed-state', 'read-own-writes', 'to-vec'],
    explain: ['A transaction groups changes into one publish decision. Committed state is the last accepted version. Staged state is a candidate version that may still be committed or discarded.', 'TinyDB begins by cloning its current database. The small helper below uses .to_vec() to make an owned copy of a borrowed slice, then changes only that copy.', 'BEGIN starts the candidate, and reads in the same session see its staged changes. The next lessons show rollback and commit. This bounded design copies state for clarity rather than providing concurrent database sessions.', 'Each browser Run starts a fresh process. BEGIN and its COMMIT or ROLLBACK must therefore appear in the same script; an open transaction rolls back when that input ends.'],
    pitfall: 'An open transaction rolls back when the browser script ends. A later Run cannot continue that same transaction.',
    experiment: 'Remove COMMIT from the lab, run it, then query again in another Run to see which version survived.'
  }),
  revise('rollback', {
    objective: 'Discard an entire staged candidate while keeping committed data.', prerequisites: ['staging', 'optional-values'], introduces: ['rollback', 'transaction-state', 'is-none'],
    explain: ['ROLLBACK abandons all staged changes in this transaction. It does not delete rows that were committed before BEGIN.', 'Option<Vec<u32>> makes this state explicit: Some(candidate) means a transaction has a staged vector, and None means no active candidate. Assigning None drops that owned candidate.', '.is_none() is a boolean check for the None variant. The test verifies both that staged state disappears and that the committed vector remains unchanged.', 'TinyDB leaves a transaction active after a statement error, preserving the previous staged state. The learner then chooses whether to inspect, commit, or roll back.'],
    experiment: 'Stage both an update and an insert, roll back, and compare all rows with the pre-BEGIN data.'
  }),
  revise('commit-generation', {
    objective: 'Advance one generation for a whole successfully committed transaction.', prerequisites: ['rollback', 'checked-arithmetic'], introduces: ['commit', 'generation', 'autocommit'],
    explain: ['COMMIT publishes a valid candidate as the next committed state. A generation is a counter identifying that published database version; it is not a row count.', 'Two successful changes inside one transaction produce one new generation. A standalone write autocommits through the same commit operation, producing its own increment.', 'checked_add prevents the counter from wrapping and making a new state look like an old version. The full commit protocol records intent before installing pages; the next chapter explains that journal.', 'A database generation and a browser workspace revision count different things. The final persistence lesson distinguishes the Rust database commit from saving a browser file snapshot.'],
    pitfall: 'Advance the generation when the whole candidate is published, not merely when another SQL line is read.',
    experiment: 'Compare .pages generation changes for two standalone inserts and two inserts in one explicit transaction.'
  }),
  revise('journal', {
    objective: 'Choose recovery behaviour based on whether a commit marker exists.', prerequisites: ['commit-generation', 'checksums', 'files'], introduces: ['journal', 'after-image', 'prepared-marker', 'commit-marker', 'redo', 'flush'],
    explain: ['A journal records the intended change before replacing committed pages. TinyDB’s RWL2 journal contains a full after-image: the complete candidate RDB2 snapshot for the next generation.', 'The ordered steps are: write a prepared journal, write its committed marker, install the main snapshot, then remove the journal. A prepared marker alone does not commit the candidate. A committed marker says recovery should redo the saved after-image.', '.crash prepare, .crash commit, and .crash install deliberately interrupt the next commit at those stages. Reopen the database in a second Run to observe the actual recovery decision.', 'These commands are teaching simulations. Native file syncing asks the operating system to flush writes, while a browser virtual filesystem has no physical fsync guarantee. The webpage saves a snapshot after the simulated exit; an actual tab kill has a different persistence boundary, covered in the final lesson.'],
    experiment: 'Run the prepare interruption, then replace the script with SELECT * FROM people; and run again.'
  }),
  revise('redo', {
    objective: 'Replay a committed after-image once and verify it safely on another recovery attempt.', prerequisites: ['journal'], introduces: ['idempotence', 'recovery-conflict', 'snapshot-identity'],
    explain: ['Idempotent means repeating an operation has the same effect as doing it once. Recovery needs this property because an interruption may happen after pages are installed but before journal cleanup.', 'A committed journal targeting generation N can install over its base generation N−1. If N is already installed, the exact snapshot bytes must match before removing the journal.', 'Matching generation numbers alone do not prove matching data. A different generation or different bytes are a conflict: report the error and retain the files rather than guessing which state to keep.', 'Checksums detect accidental byte changes, while structural validation checks the tree rules. Neither check authenticates a file against deliberate rewriting.'],
    choices: ['Yes, the generation number is enough', 'No, retain the files and report the conflict', 'Yes, discard both snapshots'],
    experiment: 'Try commit and install interruptions in different lab filenames, then reopen each one twice.'
  }),
  revise('browser-storage', {
    objective: 'Distinguish a database commit from publishing a browser workspace snapshot.', prerequisites: ['redo'], introduces: ['virtual-filesystem', 'IndexedDB', 'workspace-revision', 'compare-and-save', 'stale-tab', 'atomic-save'],
    explain: ['The Rust program runs with a private virtual filesystem: an in-memory set of filenames and bytes supplied for this Run. A normal exit returns its complete file set to the webpage.', 'The webpage stores that set in IndexedDB, a browser-provided local database separate from TinyDB itself. A workspace revision counts successful whole-file-set saves, including reads that create or recover files. It is separate from TinyDB’s committed generation.', 'Saving compares the expected revision with the current revision inside one atomic browser storage transaction: either the complete new set is saved, or none of that save is published. A stale tab keeps its unsaved candidate downloadable rather than overwriting another tab.', 'An ordinary nonzero process exit can include earlier successful commits. Stop, traps, or timeouts return no candidate snapshot and keep the previous saved files. Browser storage can be denied or evicted, so download important files.', 'This explains the recovery lab boundary: a deliberate .crash exit can save the journal plus main file together, while an actual tab termination during the Run leaves the prior IndexedDB snapshot. No JavaScript or operating-system knowledge is required to use these rules.'],
    pitfall: 'A separate check and save lets another tab change the stored files in between. Compare and save within the same atomic operation.',
    experiment: 'Open the workspace in two tabs, save in one, and observe how a stale save in the other is blocked.'
  })
];

export const chapters = [
  ['start', 'Start with a running program', 'Printing, named values, simple types, and compiler feedback.'],
  ['flow', 'Give instructions structure', 'Calculations, choices, functions, checks, and fixed sequences.'],
  ['ownership', 'Work with owned text', 'Strings, moves, copies, explicit clones, and scope.'],
  ['borrowing', 'Borrow existing values', 'Shared and exclusive access, text views, bytes, and slices.'],
  ['model', 'Model records and alternatives', 'Structs, methods, enums, optional values, and checked lookup.'],
  ['errors', 'Report and preserve failure', 'Results, numeric parsing, checked arithmetic, and propagation.'],
  ['collections', 'Work with growing collections', 'Vectors, closures, iterators, maps, and sets.'],
  ['abstraction', 'Name reusable contracts', 'Traits, generic functions, derives, lifetimes, and type aliases.'],
  ['bytes', 'Store and validate bytes', 'Portable codecs, tests, files, checked sizes, and checksums.'],
  ['database', 'Build a table and command language', 'Database vocabulary, CRUD, validation, parsing, and exchange files.'],
  ['pages', 'Organise and index pages', 'Page addresses, B+ tree lookup, splits, and source navigation.'],
  ['transactions', 'Publish changes together', 'Staged state, rollback, commit, and generations.'],
  ['recovery', 'Recover and retain work', 'Journals, idempotent replay, and browser persistence.']
].map(([id, title, summary], index) => ({ id, number: String(index + 1).padStart(2, '0'), title, summary }));

const order = [
  'first-program', 'printing', 'bindings', 'mutable-values', 'numbers', 'compiler-messages',
  'arithmetic', 'comparisons', 'branches', 'functions', 'parameters', 'return-values', 'assertions', 'loops', 'tuples', 'arrays',
  'strings', 'formatting', 'moves', 'copy', 'clone', 'scope',
  'references', 'mutable', 'text-slices', 'unicode', 'shared', 'borrowed-slices', 'static-text',
  'structs', 'methods', 'enums', 'optional-values', 'option', 'slices',
  'result-basics', 'result', 'checked-arithmetic', 'question-mark', 'atomic-change',
  'vector-basics', 'closures', 'iterator-basics', 'iterators', 'vectors', 'imports', 'maps', 'sets',
  'traits', 'generics', 'derive', 'lifetimes', 'aliases',
  'little-endian', 'decode', 'tests', 'files', 'option-propagation', 'checksums',
  'database-basics', 'sql-crud', 'row-validation', 'sql-strings', 'tdb1',
  'page-layout', 'recursion', 'bplus-lookup', 'rebalance', 'source-primer',
  'staging', 'rollback', 'commit-generation', 'journal', 'redo', 'browser-storage'
];
const candidates = new Map([...foundations, ...bridges, ...revised].map(item => [item.id, item]));
export const course = order.map(id => { const item = candidates.get(id); if (!item) throw new Error('Missing lesson ' + id); return item; });
// First-use notes are part of direct instruction, before each runnable example.
course.find(item => item.id === 'result-basics').explain.push('The if/else here is also an expression: its chosen arm produces Ok(id) or Err(message) as the function’s returned Result. Both arms produce the same Result type.');
course.find(item => item.id === 'maps').explain.push('HashMap::new() creates the empty map. The compiler infers its key and value types from the declared return type and the later entry operations.');
course.find(item => item.id === 'tdb1').explain.push('In the test setup, bytes.extend([0; 40]) appends forty zero bytes after the header. extend appends a whole sequence; [0; 40] repeats the array element using the notation from the arrays lesson.');
course.find(item => item.id === 'tdb1').explain.push('The workspace command .export exchange.tdb writes a separate exchange file. .snapshot backup.rdb instead writes a copy in TinyDB’s paged format. Use a different filename from the active database; download the resulting file from the workspace file list.');
course.find(item => item.id === 'database-basics').explain.push('In the lab, .tables lists table names, .schema describes their columns and rules, and .check validates the current database structure and reports its row/page counts. These are inspection commands, not SQL statements.');
course.find(item => item.id === 'page-layout').explain = course.find(item => item.id === 'page-layout').explain.map(text => text.replace('The next lesson explains how branches and row-holding leaves form a tree.', 'The later tree-lookup lesson explains how branches and row-holding leaves form a tree.'));
course.find(item => item.id === 'page-layout').explain.push('The lab command .pages lists actual page IDs, page types, and the keys they hold. Compare its output before and after the insert that exceeds a leaf’s capacity.');
course.find(item => item.id === 'bplus-lookup').explain.push('In the lab, .index describes the index and its height, meaning the number of levels from root to leaf. WHERE id >= 3 AND id <= 7 combines two SQL limits with AND; it selects the inclusive range from three through seven.');
course.find(item => item.id === 'journal').explain.push('Recovery happens automatically when the database file is reopened. The .recover inspection command reports the completed recovery generation; it is not required to trigger replay.');
course.find(item => item.id === 'browser-storage').explain.unshift('A process is one running copy of a program. When it finishes normally, it returns an exit code: zero for success or a nonzero number for an error. A runtime trap means execution could not continue normally, such as a failed assertion in this browser build.');
course.find(item => item.id === 'source-primer').explain.push('Some supplied code uses impl FnOnce(...) for a closure called at most once, or collect::<DbResult<Vec<_>>>() to gather successful iterator items while propagating the first error. The underscore asks Rust to infer the element type. These combine the closure, trait-bound, Result, and collection ideas already taught. Named enum-variant fields can be bound or renamed in a match, such as rows: mut target; the pattern borrows or moves the declared fields according to the same ownership rules.');
course.find(item => item.id === 'source-primer').introduces.push('closure-trait', 'fallible-collect', 'type-placeholder', 'field-pattern');
course.find(item => item.id === 'optional-values').introduces.push('if-let');
course.find(item => item.id === 'sql-crud').introduces.push('discarded-binding');
export const rustLessons = course.filter(item => !item.lab);
export const databaseLessons = course.filter(item => item.lab);
export const courseEdition = 2;

// Editorial checks use real earlier lesson IDs, not completion locks. Learners
// can revisit any prerequisite directly and experienced readers can still jump.
export function validateSequence(lessons = course) {
  const seen = new Set();
  for (const item of lessons) {
    if (seen.has(item.id)) throw new Error('Duplicate lesson ' + item.id);
    for (const required of item.prerequisites) if (!seen.has(required)) throw new Error(`${item.id} requires untaught lesson ${required}`);
    if (!item.objective || !item.introduces?.length || item.explain.length < 3) throw new Error('Incomplete learning design: ' + item.id);
    seen.add(item.id);
  }
  return true;
}
validateSequence();
