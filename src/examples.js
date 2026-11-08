export const examples = [
  {
    id: 'hello', title: 'Hello, Rust', tag: 'Start here', concept: 'YOUR FIRST PROGRAM',
    description: 'A tiny program, compiled by real Rust. Run it, then change the greeting and run it again.',
    note: 'println! is a macro that writes a line to standard output. Every program begins at fn main().',
    source: 'fn main() {\n    println!("Hello, Rust!");\n}\n', stdin: '', expected: 'Hello, Rust!\n',
    goal: 'Print Hello, Rust! on a single line.',
  },
  {
    id: 'input', title: 'Read & calculate', tag: 'Standard input', concept: 'MAKE IT INTERACTIVE',
    description: 'Read two integers from standard input and print their sum. Try changing the numbers below the editor.',
    note: 'read_to_string reads the supplied input until EOF. split_whitespace turns the text into individual values.',
    source: 'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n\n    let total: i64 = input\n        .split_whitespace()\n        .map(|word| word.parse::<i64>().unwrap())\n        .sum();\n\n    println!("{total}");\n}\n', stdin: '19 23\n', expected: '42\n',
    goal: 'For the supplied input 19 23, print 42.',
  },
  {
    id: 'borrow', title: 'Meet the borrow checker', tag: 'Find & fix', concept: 'OWNERSHIP IN PRACTICE',
    description: 'This program deliberately contains an ownership error. Run it to see Rust’s diagnostic, then fix the move.',
    note: 'Hint: let borrowed = &message; borrows the String. Moving message into a second variable makes the original binding unavailable.',
    source: 'fn main() {\n    let message = String::from("Ownership clicks.");\n    let borrowed = message;\n\n    println!("{message}");\n    println!("{borrowed}");\n}\n', stdin: '', expected: 'Ownership clicks.\nOwnership clicks.\n',
    goal: 'Borrow message so both println! calls work.',
  },
  {
    id: 'loop', title: 'Stop a runaway program', tag: 'Cancellation', concept: 'STAY IN CONTROL',
    description: 'This program never finishes. Run it and press Stop, or let the five-second execution limit stop it for you.',
    note: 'Compilation has a separate three-minute limit. Stop terminates the worker tree, including compiler threads.',
    source: 'fn main() {\n    println!("Running. Press Stop to end this program.");\n    loop {\n        std::hint::spin_loop();\n    }\n}\n', stdin: '', expected: null,
    goal: 'Start the program, then cancel execution.',
  },
];
export const matchesOutput = (actual, expected) => actual.replaceAll('\r\n', '\n').trimEnd() === expected.replaceAll('\r\n', '\n').trimEnd();
