export const examples = [
  {
    id: 'hello', title: 'Hello, Rust', tag: 'Start here', concept: 'YOUR FIRST PROGRAM',
    description: 'Choose Run code to print Hello, Rust! from main.rs. Then replace Hello, Rust! inside the quotation marks with Hello, Ada! and run again. Compare the printed lines.',
    note: 'println! is a macro that writes a line to standard output. This program starts in fn main().',
    source: 'fn main() {\n    println!("Hello, Rust!");\n}\n', stdin: '', expected: 'Hello, Rust!\n',
    goal: 'Print Hello, Rust! on a single line.',
  },
  {
    id: 'input', title: 'Read & calculate', tag: 'Standard input', concept: 'MAKE IT INTERACTIVE',
    description: 'The Program input box starts with 19 23. Choose Run code and read their sum. Replace the input with 13 8, then run again. Which numbers contribute to the new total?',
    note: 'read_to_string reads the supplied input until it reaches the end of that text. split_whitespace turns the text into individual values.',
    source: 'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n\n    let total: i64 = input\n        .split_whitespace()\n        .map(|word| word.parse::<i64>().unwrap())\n        .sum();\n\n    println!("{total}");\n}\n', stdin: '19 23\n', expected: '42\n',
    goal: 'For the supplied input 19 23, print 42.',
  },
  {
    id: 'borrow', title: 'Meet the borrow checker', tag: 'Find & fix', concept: 'OWNERSHIP IN PRACTICE',
    description: 'Choose Run code and read E0382 on the Compiler tab. In main.rs, change let borrowed = message; to let borrowed = &message; and run again. Which two bindings can the print instructions now read?',
    note: 'The ampersand borrows the String so message keeps ownership and borrowed can read it.',
    source: 'fn main() {\n    let message = String::from("Ownership clicks.");\n    let borrowed = message;\n\n    println!("{message}");\n    println!("{borrowed}");\n}\n', stdin: '', expected: 'Ownership clicks.\nOwnership clicks.\n',
    goal: 'Borrow message so both println! calls work.',
  },
  {
    id: 'loop', title: 'Stop a runaway program', tag: 'Cancellation', concept: 'STAY IN CONTROL',
    description: 'Choose Run code. When the output tells you the loop is running, choose Stop. If you wait, the runner stops the program after five seconds.',
    note: 'Stop ends compilation or execution when selected. The three-minute compilation limit is separate from the five-second run limit.',
    source: 'fn main() {\n    println!("Running. Press Stop to end this program.");\n    loop {\n        std::hint::spin_loop();\n    }\n}\n', stdin: '', expected: null,
    goal: 'Start the program, then cancel execution.',
  },
];
export const matchesOutput = (actual, expected) => actual.replaceAll('\r\n', '\n').trimEnd() === expected.replaceAll('\r\n', '\n').trimEnd();
