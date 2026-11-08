import { lesson as L, main, exercise } from './lesson-data.js';

export const foundations = [
  L('start', 'first-program', 'Your first Rust program', {
    objective: 'Run a three-line program and change the message it displays.', prerequisites: [],
    introduces: ['program', 'main-frame', 'print-line', 'quoted-text', 'statement'],
    explain: [
      'A program is a set of instructions for a computer. The text you edit is its source code; main.rs is the Rust source filename shown here. This program has one instruction: display the message Hello, Rust! You do not need any previous programming experience for this lesson.',
      'The first line, fn main() {, marks where the program begins. fn means “function”, a named group of instructions; main is the name Rust starts with. The empty parentheses mean main takes no inputs here. The opening { and closing } enclose its instructions. Keep these outer lines as they are for now.',
      'The middle line, println!("Hello, Rust!");, displays the text between the double quotes. Write println! including its exclamation mark: it is Rust’s supplied print command. Its parentheses hold the message, and the semicolon ends the instruction. The quotes mark text in the source; they are not printed.',
      'Choose Run example below. A compiler is the tool that checks your source and translates it into a form the browser can run. Your output appears beneath the code. The first run downloads the compiler; later runs reuse it. Then change just the words inside the quotes and run again.'
    ],
    body: '    println!("Hello, Rust!");', starter: main('    println!("Change this message");'), expected: 'Hello, Rust!',
    practiceInstruction: 'Change only the text inside the quotes to Hello, Rust! Keep the quotes, parentheses, exclamation mark, and semicolon.',
    walkthrough: ['Rust starts inside main, between the braces.', 'println! displays Hello, Rust! and finishes the line.', 'There are no more instructions, so the program ends.'],
    pitfall: 'Removing a quote or changing the spelling of println! changes the program’s syntax—the punctuation and spelling Rust expects.',
    question: 'Which characters appear in the output?', choices: ['Hello, Rust!', '"Hello, Rust!"', 'println!("Hello, Rust!");'], answer: 0,
    feedback: 'println! displays the contents of the quoted text. The quotes and command punctuation stay in the source.',
    experiment: 'Change the message to your own greeting. Predict the new output before running it.',
    hints: ['Find the line beginning with println!. The message is inside its double quotes.', 'Replace Change this message with Hello, Rust!; leave the surrounding punctuation alone.'],
    notation: [['fn main()', 'The starting group of instructions; no inputs are needed here.'], ['{ and }', 'The boundaries of the group.'], ['println!("text");', 'Display the quoted text and finish the line.']]
  }),
  L('start', 'printing', 'Run instructions in order', {
    objective: 'Predict and print two lines in the order they are written.', prerequisites: ['first-program'], introduces: ['execution-order', 'newline'],
    explain: ['Rust follows the instructions in main from top to bottom. Two println! instructions produce two separate lines in that same order.', 'A newline means moving to the next output line. println! adds one after its message, so you do not need to put a line break inside the quotes.', 'Use a new source line and a semicolon for each instruction. Indentation—the spaces before each instruction—helps you see what is inside main.'],
    body: '    println!("First");\n    println!("Second");', starter: main('    println!("Second");\n    println!("First");'), expected: 'First\nSecond',
    practiceInstruction: 'Reorder the two print instructions so First appears before Second.',
    walkthrough: ['The first println! displays First and moves to the next line.', 'The second println! displays Second on that next line.'],
    pitfall: 'The computer follows the written order, even if the messages themselves say First and Second.',
    question: 'What happens if the two instructions swap places?', choices: ['The output order swaps', 'Rust sorts the messages', 'Both messages disappear'], answer: 0,
    feedback: 'Instructions execute in source order; Rust does not sort the text.', experiment: 'Add a third line, then predict the complete three-line output.',
    hints: ['Move whole println! lines, including their semicolons.', 'Put println!("First"); before println!("Second");.']
  }),
  L('start', 'bindings', 'Give values names', {
    objective: 'Store a value with let and display it by name.', prerequisites: ['printing'], introduces: ['binding', 'let', 'format-placeholder'],
    explain: ['A value is a piece of data, such as text or a number. let gives a value a name. In let message = "Hello, Rust!";, message is the name and the quoted greeting is its value.', 'The = sign here means “bind this name to this value”. The semicolon ends the instruction, just as it ends a print instruction.', 'To display the value, write println!("{message}");. The braces inside these quotes are a placeholder: Rust replaces {message} with the value named message. These are different from the outer braces that enclose main.', 'An equivalent spelling is println!("{}", message);. An empty placeholder takes the value supplied after the comma. Later examples use this form to display a calculation or function result directly.', 'This program needs only main, let, and println!. Functions that return values and borrowed text types come in later lessons.'],
    body: '    let message = "Hello, Rust!";\n    println!("{message}");', starter: main('    let message = "A different greeting";\n    println!("{message}");'), expected: 'Hello, Rust!',
    practiceInstruction: 'Change the value assigned to message so the program displays Hello, Rust! Use the existing placeholder to print it.',
    walkthrough: ['let stores the greeting under the name message.', 'The print instruction replaces {message} with that greeting.'],
    pitfall: 'println!("message"); prints the literal word message. A placeholder needs braces inside the quotes.',
    question: 'What does println!("{message}"); display?', choices: ['The value named message', 'Always the word message', 'The braces themselves'], answer: 0,
    feedback: 'A named placeholder reads the binding and inserts its value into the displayed text.', experiment: 'Rename message to greeting in both places. What happens if you rename it in only one place?',
    hints: ['The print instruction is already correct. Edit the greeting on the let line.', 'Use let message = "Hello, Rust!";.']
  }),
  L('start', 'mutable-values', 'Change a value with mut', {
    objective: 'Update a numeric binding deliberately using let mut.', prerequisites: ['bindings'], introduces: ['integer-value', 'mutability', 'assignment', 'add-assign'],
    explain: ['A whole number is another kind of value. Write let score = 10; without quotes to store the number ten. With quotes, "10" would be text instead.', 'A binding declared with let normally keeps its original value. To permit changes, add mut: let mut score = 10;. mut is short for mutable, meaning changeable.', 'After that declaration, score = 15; replaces the stored number. score += 5; is a shorter way to say score = score + 5;. The + sign adds numbers.', 'Only mark a binding mut when the program needs to change it. The worked program starts at 10 and adds 5 twice.'],
    body: '    let mut score = 10;\n    score += 5;\n    score += 5;\n    println!("{score}");', starter: main('    let mut score = 10;\n    score += 5;\n    println!("{score}");'), expected: '20',
    practiceInstruction: 'Add another score += 5; instruction before printing, so the final value is 20.',
    walkthrough: ['The mutable score begins at 10.', 'The first addition makes 15; the second makes 20. Only the final value is printed.'],
    pitfall: 'Without mut, assigning a new value to score is a compile error.',
    question: 'What does mut allow?', choices: ['Changing this binding’s stored value', 'Printing any text', 'Changing every variable in the program'], answer: 0,
    feedback: 'mut gives this binding permission to change; it does not change other bindings.', experiment: 'Remove mut, run, and find the compiler message. Restore it afterward.',
    hints: ['You need two additions of five to get from ten to twenty.', 'Repeat score += 5; before println!.']
  }),
  L('start', 'numbers', 'Say what kind of number you mean', {
    objective: 'Read and write explicit integer type annotations.', prerequisites: ['mutable-values'], introduces: ['type', 'type-annotation', 'u32', 'u8', 'usize', 'u64', 'numeric-limits'],
    explain: ['A type describes what kind of value a name can hold. Rust often infers, or works out, the type. A colon lets you state it: let score: u32 = 90;.', 'u32 means an unsigned 32-bit whole number. A bit is a storage position that holds 0 or 1; using more bits allows more possible values. Unsigned means zero or positive, never negative. u32 holds values from 0 through 4,294,967,295. You do not need to memorise this limit.', 'u8 is a smaller whole number from 0 through 255; it will represent small storage units called bytes later. u64 allows larger whole numbers. usize is Rust’s whole-number type for collection lengths and positions. Each name identifies a numeric type, not a variable.', 'Here all arithmetic uses small u32 values. A value must fit its type: a negative value cannot be stored in u32.'],
    body: '    let score: u32 = 90;\n    let bonus: u32 = 5;\n    println!("{}", score + bonus);', starter: main('    let score: u32 = 90;\n    let bonus: u32 = 0;\n    println!("{}", score + bonus);'), expected: '95',
    practiceInstruction: 'Keep both type annotations and change bonus so the result is 95.',
    walkthrough: ['The colon declares both numbers to be u32.', 'The unnamed {} placeholder displays the expression supplied after the comma: score + bonus.'],
    pitfall: 'A type name belongs after a colon in a declaration. It is not part of the numeric value itself.',
    question: 'Which value fits in u8?', choices: ['255', '256', '-1'], answer: 0,
    feedback: 'u8 holds zero through 255, including both endpoints.', experiment: 'Try let small: u8 = 256; and read the error. Restore the working program.',
    hints: ['The needed result is five more than the current score.', 'Set bonus to 5 and keep : u32.']
  }),
  L('start', 'compiler-messages', 'Read a compiler message', {
    objective: 'Locate and repair a spelling error without rewriting the program.', prerequisites: ['numbers'], introduces: ['compiler-message', 'case-sensitive', 'comment'],
    explain: ['Before running, the compiler checks whether your source follows Rust’s rules. If it finds a problem, this lesson shows Compiler messages below the same code. A compile error prevents execution; it is feedback about the source, not damage to your device.', 'A message usually names a problem and a position in main.rs, your source file. Read the first error, find the named instruction, and compare it with the working example.', 'Rust is case-sensitive: println! and printLn! are different spellings. The compiler may call println! a macro. Here that means the supplied print command; you do not need to write a macro yourself.', 'Text after // is a comment for the reader. Rust does not execute it. Use comments to explain a change without adding output.'],
    body: '    // This comment explains the next instruction.\n    println!("Fixed");', starter: main('    // Compare the command spelling with the worked program.\n    printLn!("Fixed");'), expected: 'Fixed', allowCompileErrorStarter: true,
    practiceInstruction: 'Run the starter once to read the compile error. Correct only the spelling of the print command, then run again.',
    walkthrough: ['The comment is ignored during execution.', 'The correctly spelled print command displays Fixed.'],
    pitfall: 'Changing unrelated lines can introduce more errors. Start with the first reported problem and make one small repair.',
    question: 'Which change repairs printLn!("Fixed");?', choices: ['Change printLn! to println!', 'Remove main', 'Put quotes around the whole program'], answer: 0,
    feedback: 'The L must be lowercase. The rest of this instruction is already correct.', experiment: 'Add a comment of your own. Confirm that it does not appear in output.',
    hints: ['Rust command names must match exactly, including letter case.', 'The correct spelling is println!, all lowercase.']
  }),
  L('flow', 'arithmetic', 'Calculate before printing', {
    objective: 'Evaluate simple integer arithmetic and recognise division’s remainder.', prerequisites: ['numbers'], introduces: ['arithmetic', 'integer-division', 'remainder', 'grouping'],
    explain: ['An expression produces a value. The expression 3 * 60 multiplies three by sixty. Store its result in a binding or supply it directly to a print placeholder.', 'For numbers, + adds, - subtracts, and * multiplies. / divides. With whole-number types, division keeps only the whole part: 7 / 2 is 3. The % operator gives the remainder: 7 % 2 is 1.', 'Parentheses group part of an expression so it is calculated together, such as (2 + 1) * 60. These grouping parentheses are separate from the parentheses used to call println!.'],
    body: '    let seconds = 3 * 60;\n    let whole = 7 / 2;\n    let remainder = 7 % 2;\n    println!("{seconds}");\n    println!("{whole} {remainder}");', starter: main('    let seconds = 3 + 60;\n    let whole = 7 / 2;\n    let remainder = 7 % 2;\n    println!("{seconds}");\n    println!("{whole} {remainder}");'), expected: '180\n3 1',
    practiceInstruction: 'Repair the seconds calculation by using multiplication. Keep the division and remainder examples.',
    walkthrough: ['Three times sixty produces 180.', 'Seven divided by two has a whole part of 3 and a remainder of 1.'],
    pitfall: 'Integer division does not produce a fractional result. Do not expect 7 / 2 to display 3.5.',
    question: 'What is 7 % 2?', choices: ['1', '3', '3.5'], answer: 0, feedback: '% returns what remains after dividing into whole groups.',
    experiment: 'Try 8 / 2 and 8 % 2. Predict both results first.', hints: ['Adding minutes to sixty is different from multiplying by sixty.', 'Use let seconds = 3 * 60;.']
  }),
  L('flow', 'comparisons', 'Ask a true-or-false question', {
    objective: 'Create and combine boolean comparisons.', prerequisites: ['arithmetic'], introduces: ['bool', 'comparison', 'boolean-operators'],
    explain: ['A comparison produces a bool, a value that is either true or false. score >= 50 asks whether score is greater than or equal to fifty.', '== compares for equality, != means not equal, > and < mean greater and less than, and >= and <= include equality. A single = assigns a value; it does not compare values.', '&& means both conditions must be true. || means at least one must be true. ! reverses a boolean: !true is false. These operators will let later validation functions state several rules.'],
    body: '    let score: u32 = 50;\n    let passes: bool = score >= 50;\n    let in_range = score >= 1 && score <= 100;\n    println!("{passes} {in_range}");', starter: main('    let score: u32 = 50;\n    let passes: bool = score > 50;\n    let in_range = score >= 1 && score <= 100;\n    println!("{passes} {in_range}");'), expected: 'true true',
    practiceInstruction: 'Change the passing comparison to include a score of exactly 50.',
    walkthrough: ['50 >= 50 evaluates to true.', 'Both range conditions are true, so && produces true.'], pitfall: 'Using > instead of >= changes the result exactly at the boundary.',
    question: 'What does && require?', choices: ['Both conditions are true', 'Only the first condition matters', 'Both numbers are equal'], answer: 0, feedback: '&& combines two boolean values and returns true only when both are true.',
    experiment: 'Change score to 0, then 101. Predict each range check.', hints: ['The rule says at least fifty, including fifty itself.', 'Use >= rather than > for passes.']
  }),
  L('flow', 'branches', 'Choose which instruction runs', {
    objective: 'Use if and else to choose between two instructions.', prerequisites: ['comparisons'], introduces: ['if-else'],
    explain: ['if runs a block only when its condition is true. An else block supplies the alternative when that condition is false. Exactly one of these two blocks runs.', 'The condition is a bool expression you already know how to write. Braces enclose each block just as they enclose main.', 'This example prints one of two messages directly. You do not need a function that returns text, a text-reference type, or a lifetime annotation.'],
    body: '    let score = 50;\n    if score >= 50 {\n        println!("pass");\n    } else {\n        println!("retry");\n    }', starter: main('    let score = 50;\n    if score > 50 {\n        println!("pass");\n    } else {\n        println!("retry");\n    }'), expected: 'pass',
    practiceInstruction: 'Fix the comparison so a score of 50 selects the pass block.',
    walkthrough: ['The condition compares the score with fifty.', 'It is true, so only the first block prints.'], pitfall: 'Putting a print instruction after the entire if/else makes it run regardless of the chosen branch.',
    question: 'Which block runs when the condition is false?', choices: ['else', 'Both blocks', 'The if block'], answer: 0, feedback: 'else is the alternative to the true-condition block.',
    experiment: 'Change score to 49 and predict the selected block.', hints: ['Revisit the comparison lesson if equality is confusing.', 'The condition needs score >= 50.']
  }),
  L('flow', 'functions', 'Reuse a group of instructions', {
    objective: 'Define a named function and call it twice.', prerequisites: ['branches'], introduces: ['function-definition', 'function-call'],
    explain: ['You have used main as the program’s starting function. You can define another named function to group instructions you want to reuse.', 'fn greet() { ... } defines a function named greet. greet(); calls it: execution enters that function, runs its body, then returns to the next instruction in main.', 'A definition alone does not run its body. The two calls in main produce the two greeting lines. The empty parentheses still mean no input values are supplied.'],
    source: 'fn greet() {\n    println!("Hello");\n}\n\nfn main() {\n    greet();\n    greet();\n}\n', starter: 'fn greet() {\n    println!("Hello");\n}\n\nfn main() {\n    greet();\n}\n', expected: 'Hello\nHello',
    practiceInstruction: 'Add a second greet(); call inside main. Do not duplicate the function definition.', walkthrough: ['Rust starts in main, not at the first function definition in the file.', 'Each call enters greet and prints Hello once.'],
    pitfall: 'Defining a function twice with the same name is different from calling one function twice.', question: 'What actually runs greet?', choices: ['The instruction greet();', 'Its definition merely existing', 'Its name in a comment'], answer: 0, feedback: 'A call runs the function; a definition describes what a call should do.',
    experiment: 'Put a print instruction between the two calls and predict the three output lines.', hints: ['Keep one definition above main.', 'Repeat greet(); inside main.']
  }),
  L('flow', 'parameters', 'Pass a value into a function', {
    objective: 'Call the same function with different u32 inputs.', prerequisites: ['functions', 'numbers'], introduces: ['parameter', 'argument'],
    explain: ['A parameter names an input inside a function. In fn show_score(score: u32), score is the parameter and u32 states which type it accepts.', 'An argument is the actual value supplied by a call. show_score(90); supplies ninety. The function uses that value wherever its parameter name appears.', 'Each call gets its own parameter value. The same function can display different scores without changing its definition.'],
    source: 'fn show_score(score: u32) {\n    println!("score {score}");\n}\n\nfn main() {\n    show_score(90);\n    show_score(75);\n}\n', starter: 'fn show_score(score: u32) {\n    println!("score {score}");\n}\n\nfn main() {\n    show_score(90);\n    show_score(90);\n}\n', expected: 'score 90\nscore 75',
    practiceInstruction: 'Change only the second call’s argument so it displays score 75.', walkthrough: ['The first call binds score to 90.', 'The second call binds its score parameter to 75.'], pitfall: 'The parameter name belongs in the definition. A call supplies a value, not another declaration.',
    question: 'In show_score(75), which part is the argument?', choices: ['75', 'u32', 'fn'], answer: 0, feedback: 'The argument is the concrete input value given to this call.', experiment: 'Add a third call with a different score.', hints: ['Leave the function definition alone.', 'The second call should be show_score(75);.']
  }),
  L('flow', 'return-values', 'Return a calculated value', {
    objective: 'Use a function’s return value in a later calculation.', prerequisites: ['parameters', 'arithmetic'], introduces: ['return-type', 'tail-expression', 'unit'],
    explain: ['A function can produce a value for its caller. -> u32 after the parameters means this function returns a u32. The arrow is part of the function definition, not an arithmetic operation.', 'The last expression in a function becomes its return value when it has no trailing semicolon. minutes * 60 returns the calculated number. A trailing semicolon would discard that expression’s value.', 'Functions with no return arrow, such as our printing helpers, return (), called unit. Unit means no useful result value. This is why a discarded calculation cannot satisfy -> u32.'],
    source: 'fn minutes_to_seconds(minutes: u32) -> u32 {\n    minutes * 60\n}\n\nfn main() {\n    let seconds = minutes_to_seconds(3);\n    println!("{seconds}");\n}\n', starter: 'fn minutes_to_seconds(minutes: u32) -> u32 {\n    minutes + 60\n}\n\nfn main() {\n    let seconds = minutes_to_seconds(3);\n    println!("{seconds}");\n}\n', expected: '180',
    practiceInstruction: 'Repair the returned calculation. Leave the final expression without a semicolon.', walkthrough: ['The call supplies 3 to minutes.', 'The function returns 180; main stores that returned value in seconds and prints it.'], pitfall: 'Printing a value inside the helper is not the same as returning it to the caller.',
    question: 'What does -> u32 promise?', choices: ['A u32 result for the caller', 'A new print instruction', 'A loop that runs 32 times'], answer: 0, feedback: 'The caller can use the returned whole number as a value.', experiment: 'Add a semicolon after minutes * 60, read the error, then remove it.', hints: ['Use multiplication, as in the arithmetic lesson.', 'The returned expression should be minutes * 60.']
  }),
  L('flow', 'assertions', 'Check a result with an assertion', {
    objective: 'Read an assertion failure and check a function on more than one input.', prerequisites: ['return-values'], introduces: ['assertion', 'assert-eq', 'panic', 'todo-marker'],
    explain: ['An assertion is a check written in the program. assert_eq!(actual, expected); continues only when both values are equal. It prints nothing when the check passes.', 'If the values differ, the running program stops and reports an assertion failure below the code. This is a runtime failure: the compiler accepted the source, but a check failed during execution. assert!(condition); similarly checks that a boolean is true.', 'From this lesson onward, practice starters may contain todo!("..."). That is a deliberate stop marker for an unfinished function. Replace the marker with your implementation. It is not an instruction to print the answer.', 'Keep the assertions in main. They provide additional inputs and boundary cases, so passing means more than matching one displayed example.'],
    ...exercise('fn double(value: u32) -> u32', '    value * 2', 'fn main() {\n    assert_eq!(double(0), 0);\n    assert_eq!(double(3), 6);\n    println!("checks passed");\n}'), expected: 'checks passed',
    practiceInstruction: 'Replace todo! with an expression that doubles value. Keep both assertions in main.', walkthrough: ['The zero-input check passes without output.', 'The input-three check expects six. Only after both checks pass does the message print.'], pitfall: 'Removing a failing check hides the problem. Repair the function instead.',
    question: 'What does a successful assert_eq! print?', choices: ['Nothing', 'true', 'The expected value'], answer: 0, feedback: 'Passing assertions are silent; a later println! can report completion.', experiment: 'Temporarily return value + 2. Which assertion fails first?', hints: ['Use the parameter in a multiplication expression.', 'value * 2 works for both zero and three.']
  }),
  L('flow', 'loops', 'Repeat work with a loop', {
    objective: 'Accumulate values from a small numeric range.', prerequisites: ['assertions', 'mutable-values'], introduces: ['for-loop', 'range', 'while-loop', 'break', 'early-return'],
    explain: ['for number in 1..=3 runs its block once for each whole number from one through three, including both ends. number is a fresh binding for the current value.', 'A mutable total keeps the running sum. The plain range 0..3 excludes its upper end and visits zero, one, and two. Choose the range whose boundary matches your rule.', 'while condition { ... } repeats while its condition is true; update the relevant value so it can finish. A loop { ... } repeats without a condition until break exits it. Later examples use these forms when the number of steps is not known in advance.', 'return value; immediately leaves the current function with that value, even from inside a loop or if block. Without an early return, execution continues after the block.'],
    ...exercise('fn sum_to_three() -> u32', '    let mut total = 0;\n    for number in 1..=3 { total += number; }\n    total', 'fn main() {\n    assert_eq!(sum_to_three(), 6);\n    println!("{}", sum_to_three());\n}'), expected: '6',
    practiceInstruction: 'Start total at zero, add each number in 1..=3, and return total.', walkthrough: ['The three iterations make total 1, then 3, then 6.', 'The final expression returns the accumulated result.'], pitfall: '1..3 stops before three, producing a different sum.',
    question: 'Which numbers does 1..=3 visit?', choices: ['1, 2, 3', '0, 1, 2', '1, 2'], answer: 0, feedback: 'The equals sign makes the upper boundary inclusive.', experiment: 'Change the range to 0..3 and predict the new result before updating the check.', hints: ['Declare a mutable total before the for loop.', 'Inside the loop use total += number;, then return total afterward.']
  }),
  L('flow', 'tuples', 'Return two values together', {
    objective: 'Create, unpack, and inspect a pair of values.', prerequisites: ['loops'], introduces: ['tuple', 'destructuring', 'tuple-fields', 'debug-format'],
    explain: ['A tuple groups a fixed number of values. (7, 8) is a pair. Its type can be written (u32, u32), so a function can return both numbers together.', 'let (left, right) = pair; unpacks the pair into two names. You can also read fields by position: pair.0 is the first and pair.1 is the second. Positions start at zero.', 'println!("{pair:?}"); uses debug formatting, a readable representation useful for inspecting data. The :? inside a placeholder requests this representation. Tuples, arrays, and many standard types already support it.'],
    ...exercise('fn pair(value: u32) -> (u32, u32)', '    (value, value + 1)', 'fn main() {\n    let result = pair(7);\n    let (left, right) = result;\n    assert_eq!((left, right), (7, 8));\n    println!("{result:?}");\n}'), expected: '(7, 8)',
    practiceInstruction: 'Return a pair containing value and the next whole number.', walkthrough: ['The returned pair is (7, 8).', 'Destructuring names its fields; debug formatting displays the complete pair.'], pitfall: 'The first field is .0, not .1.',
    question: 'What is (7, 8).0?', choices: ['7', '8', '0'], answer: 0, feedback: 'Tuple field numbering begins at zero.', experiment: 'Print the two unpacked names with ordinary placeholders.', hints: ['Put the two return expressions inside parentheses, separated by a comma.', 'Return (value, value + 1).']
  }),
  L('flow', 'arrays', 'Store a fixed-size sequence', {
    objective: 'Read an array by its zero-based position.', prerequisites: ['tuples'], introduces: ['array', 'index', 'length', 'array-type'],
    explain: ['An array stores several values of the same type in a fixed order. [10, 20, 30] is an array of three integers. Square brackets distinguish an array from a tuple.', 'An index is an element’s position. values[0] reads the first element and values[1] reads the second. values.len() gives the number of elements; .len() is a method, a named operation called on a value with a dot.', 'The type [u32; 3] means three u32 elements. [0; 4] is also a value expression: create four zeroes. A position equal to the length is already outside the array. An invalid index stops the program; later we will learn checked access.'],
    ...exercise('fn second(values: [u32; 3]) -> u32', '    values[1]', 'fn main() {\n    let values = [10, 20, 30];\n    assert_eq!(values.len(), 3);\n    let answer = second(values);\n    assert_eq!(answer, 20);\n    println!("{answer}");\n}'), expected: '20',
    practiceInstruction: 'Return the second element, using its zero-based index.', walkthrough: ['The three valid indices are zero, one, and two.', 'Index one reads the value twenty.'], pitfall: 'Index three is outside an array of length three.',
    question: 'Which index reads the second element?', choices: ['1', '2', '3'], answer: 0, feedback: 'Zero is first, one is second.', experiment: 'Print the complete array with {:?} and compare it with the tuple representation.', hints: ['Count positions starting at zero.', 'Use values[1].']
  })
];
