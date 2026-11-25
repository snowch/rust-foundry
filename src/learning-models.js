export const learningModels = {
  "moves": {
    "title": "Ownership moves; the text is not cloned",
    "question": "Which binding owns the String at each boundary?",
    "kind": "references",
    "states": [
      {
        "label": "Before the call",
        "objects": [
          {
            "label": "Logical String value",
            "value": "Ada",
            "refs": [
              {
                "name": "name in main",
                "edge": "owns"
              }
            ]
          }
        ]
      },
      {
        "label": "Inside decorate, before push_str",
        "objects": [
          {
            "label": "Logical String value",
            "value": "Ada",
            "refs": [
              {
                "name": "name parameter",
                "edge": "owns after the move"
              }
            ]
          }
        ]
      },
      {
        "label": "After return",
        "objects": [
          {
            "label": "Returned String value",
            "value": "Ada!",
            "refs": [
              {
                "name": "decorated in main",
                "edge": "owns the result"
              }
            ]
          }
        ]
      }
    ],
    "note": "The old binding cannot be used after the move. A move does not clone the text. The later push_str may grow/reallocate storage: the boxes track the logical value, not a guaranteed fixed allocation.",
    "description": "Which binding owns the String at each boundary? Before the call: Logical String value contains Ada. name in main owns Logical String value. Inside decorate, before push_str: Logical String value contains Ada. name parameter owns after the move Logical String value. After return: Returned String value contains Ada!. decorated in main owns the result Returned String value. The old binding cannot be used after the move. A move does not clone the text. The later push_str may grow/reallocate storage: the boxes track the logical value, not a guaranteed fixed allocation."
  },
  "clone": {
    "title": "Cloning produces independently owned text",
    "question": "Why does appending Jr leave the original Ada unchanged?",
    "kind": "references",
    "states": [
      {
        "label": "Returned pair after keep_and_change",
        "objects": [
          {
            "label": "Original String",
            "value": "Ada",
            "refs": [
              {
                "name": "pair.0",
                "edge": "owns original text"
              }
            ]
          },
          {
            "label": "Cloned and edited String",
            "value": "Ada Jr",
            "refs": [
              {
                "name": "pair.1",
                "edge": "owns separate text"
              }
            ]
          }
        ]
      }
    ],
    "note": "clone copies String content into independently owned storage. The later append may grow that clone’s allocation. Moving both Strings into the returned tuple does not clone them again.",
    "description": "Why does appending Jr leave the original Ada unchanged? Returned pair after keep_and_change: Original String contains Ada. pair.0 owns original text Original String; Cloned and edited String contains Ada Jr. pair.1 owns separate text Cloned and edited String. clone copies String content into independently owned storage. The later append may grow that clone’s allocation. Moving both Strings into the returned tuple does not clone them again."
  },
  "references": {
    "title": "An owner and a reader reach the same String",
    "question": "Why can main still print name after name_length(&name)?",
    "kind": "references",
    "states": [
      {
        "label": "While name_length reads",
        "objects": [
          {
            "label": "One String",
            "value": "Ada · 3 bytes",
            "refs": [
              {
                "name": "name in main",
                "edge": "owns"
              },
              {
                "name": "name parameter",
                "edge": "shared borrow via &String"
              }
            ]
          }
        ]
      }
    ],
    "note": "The helper’s reference does not take ownership or clone the String. After the helper returns, the caller still owns name. The borrow cannot outlive the referred-to value.",
    "description": "Why can main still print name after name_length(&name)? While name_length reads: One String contains Ada · 3 bytes. name in main owns One String; name parameter shared borrow via &String One String. The helper’s reference does not take ownership or clone the String. After the helper returns, the caller still owns name. The borrow cannot outlive the referred-to value."
  },
  "mutable": {
    "title": "Sequential exclusive borrows change one value",
    "question": "Why does score progress from 10 to 15 to 20?",
    "kind": "slots",
    "rows": [
      {
        "label": "Before either call",
        "values": [
          10
        ],
        "note": "One caller-owned score.",
        "active": [],
        "muted": []
      },
      {
        "label": "After award(&mut score)",
        "values": [
          15
        ],
        "note": "The helper adds 5 through a temporary exclusive borrow.",
        "active": [
          0
        ],
        "muted": []
      },
      {
        "label": "After the second call",
        "values": [
          20
        ],
        "note": "The first borrow has ended before the second begins.",
        "active": [
          0
        ],
        "muted": []
      }
    ],
    "note": "Each row shows the same score object. The exclusive accesses are sequential; this does not depict two overlapping mutable borrows.",
    "description": "Why does score progress from 10 to 15 to 20? Before either call: index 0 = 10. One caller-owned score.. After award(&mut score): index 0 = 15. The helper adds 5 through a temporary exclusive borrow.. After the second call: index 0 = 20. The first borrow has ended before the second begins.. Each row shows the same score object. The exclusive accesses are sequential; this does not depict two overlapping mutable borrows."
  },
  "borrowed-slices": {
    "title": "The slice selects existing elements",
    "question": "Why is the subrange sum 50 while the printed full-array sum is 60?",
    "kind": "slots",
    "rows": [
      {
        "label": "values = [10,20,30]",
        "values": [
          10,
          20,
          30
        ],
        "note": "&values[1..3] borrows elements 20 and 30: the assertion checks total=50.",
        "active": [
          1,
          2
        ],
        "muted": [
          0
        ],
        "tags": {
          "1": "start",
          "2": "last included"
        }
      },
      {
        "label": "The printed call uses &values",
        "values": [
          10,
          20,
          30
        ],
        "note": "10+20+30=60. The empty-slice assertion separately checks total=0.",
        "active": [
          0,
          1,
          2
        ],
        "muted": []
      }
    ],
    "note": "Indices count u32 elements, not bytes. Start is inclusive and stop 3 exclusive. The borrowed slice has a length but does not own or copy these elements.",
    "description": "Why is the subrange sum 50 while the printed full-array sum is 60? values = [10,20,30]: index 0 = 10, index 1 = 20, index 2 = 30. &values[1..3] borrows elements 20 and 30: the assertion checks total=50.. The printed call uses &values: index 0 = 10, index 1 = 20, index 2 = 30. 10+20+30=60. The empty-slice assertion separately checks total=0.. Indices count u32 elements, not bytes. Start is inclusive and stop 3 exclusive. The borrowed slice has a length but does not own or copy these elements."
  },
  "unicode": {
    "title": "UTF-8 bytes align with scalar values",
    "question": "Which two bytes encode the final é?",
    "kind": "bytes",
    "label": "Worked text: café",
    "values": [
      "63",
      "61",
      "66",
      "C3",
      "A9"
    ],
    "groups": [
      {
        "label": "c",
        "size": 1
      },
      {
        "label": "a",
        "size": 1
      },
      {
        "label": "f",
        "size": 1
      },
      {
        "label": "é",
        "size": 2
      }
    ],
    "note": "text.len() prints 5 bytes; chars() visits four Unicode scalar values. A scalar value is not always an entire grapheme cluster or user-perceived character.",
    "description": "Which two bytes encode the final é? Worked text: café. c uses byte offsets 0: 63; a uses byte offsets 1: 61; f uses byte offsets 2: 66; é uses byte offsets 3 through 4: C3, A9. text.len() prints 5 bytes; chars() visits four Unicode scalar values. A scalar value is not always an entire grapheme cluster or user-perceived character."
  },
  "little-endian": {
    "title": "The least significant byte is stored first",
    "question": "How do four chosen bytes reconstruct 258?",
    "kind": "bytes",
    "label": "258 = hexadecimal 0x00000102",
    "values": [
      "02",
      "01",
      "00",
      "00"
    ],
    "groups": [
      {
        "label": "low byte",
        "size": 1
      },
      {
        "label": "next byte",
        "size": 1
      },
      {
        "label": "high bytes",
        "size": 2
      }
    ],
    "note": "This is the chosen little-endian file encoding, not an assumption about the host’s native layout. 2 + 1×256 = 258.",
    "description": "How do four chosen bytes reconstruct 258? 258 = hexadecimal 0x00000102. low byte uses byte offsets 0: 02; next byte uses byte offsets 1: 01; high bytes uses byte offsets 2 through 3: 00, 00. This is the chosen little-endian file encoding, not an assumption about the host’s native layout. 2 + 1×256 = 258."
  },
  "enums": {
    "title": "Exactly one command variant is active",
    "question": "Which payload can the selected match arm read?",
    "kind": "branch",
    "root": "Command value",
    "paths": [
      {
        "when": "Count",
        "result": "count all rows",
        "detail": "No ID payload belongs to this variant."
      },
      {
        "when": "Lookup(id)",
        "result": "lookup the supplied ID",
        "detail": "The printed call uses Lookup(42), so it prints lookup 42."
      }
    ],
    "note": "The assertions also exercise Count and Lookup(7). Match handles alternatives; the program does not hold both variants in the same Command at once.",
    "description": "Which payload can the selected match arm read? Command value. Count. count all rows. No ID payload belongs to this variant.; Lookup(id). lookup the supplied ID. The printed call uses Lookup(42), so it prints lookup 42.. The assertions also exercise Count and Lookup(7). Match handles alternatives; the program does not hold both variants in the same Command at once."
  },
  "result-basics": {
    "title": "Success and failure carry different payloads",
    "question": "Why must the zero-ID case not be used as a successful ID?",
    "kind": "branch",
    "root": "positive(id)",
    "paths": [
      {
        "when": "id == 0",
        "result": "Err(id must be positive)",
        "detail": "The assertion checks this failure."
      },
      {
        "when": "id > 0 · printed case id=7",
        "result": "Ok(7)",
        "detail": "The successful value is unwrapped and printed."
      }
    ],
    "note": "Result contains exactly one selected variant. Err does not contain the success value, and unwrap is safe here only because this particular call succeeds.",
    "description": "Why must the zero-ID case not be used as a successful ID? positive(id). id == 0. Err(id must be positive). The assertion checks this failure.; id > 0 · printed case id=7. Ok(7). The successful value is unwrapped and printed.. Result contains exactly one selected variant. Err does not contain the success value, and unwrap is safe here only because this particular call succeeds."
  },
  "alg-search": {
    "title": "Keep original indices while the candidates shrink",
    "question": "Why is 23 found at the original index 5?",
    "kind": "slots",
    "rows": [
      {
        "label": "First comparison",
        "values": [
          2,
          5,
          8,
          12,
          16,
          23,
          38,
          56
        ],
        "note": "16 < 23: keep indices 5..8.",
        "active": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "muted": [],
        "tags": {
          "4": "mid"
        }
      },
      {
        "label": "Second comparison",
        "values": [
          2,
          5,
          8,
          12,
          16,
          23,
          38,
          56
        ],
        "note": "38 > 23: keep [5,6).",
        "active": [
          5,
          6,
          7
        ],
        "muted": [
          0,
          1,
          2,
          3,
          4
        ],
        "tags": {
          "6": "mid"
        }
      },
      {
        "label": "Third comparison",
        "values": [
          2,
          5,
          8,
          12,
          16,
          23,
          38,
          56
        ],
        "note": "23 matches at original index 5.",
        "active": [
          5
        ],
        "muted": [
          0,
          1,
          2,
          3,
          4,
          6,
          7
        ],
        "tags": {
          "5": "mid"
        }
      }
    ],
    "note": "The sorted input stays fixed; only the half-open candidate bounds change. Discarded values are still present in the slice.",
    "description": "Why is 23 found at the original index 5? First comparison: index 0 = 2, index 1 = 5, index 2 = 8, index 3 = 12, index 4 = 16, index 5 = 23, index 6 = 38, index 7 = 56. 16 < 23: keep indices 5..8.. Second comparison: index 0 = 2, index 1 = 5, index 2 = 8, index 3 = 12, index 4 = 16, index 5 = 23, index 6 = 38, index 7 = 56. 38 > 23: keep [5,6).. Third comparison: index 0 = 2, index 1 = 5, index 2 = 8, index 3 = 12, index 4 = 16, index 5 = 23, index 6 = 38, index 7 = 56. 23 matches at original index 5.. The sorted input stays fixed; only the half-open candidate bounds change. Discarded values are still present in the slice."
  },
  "alg-sort": {
    "title": "The saved key survives temporary duplicate values",
    "question": "Where is key 5 while 9 and 7 shift right?",
    "kind": "slots",
    "rows": [
      {
        "label": "Before the last insertion",
        "values": [
          1,
          2,
          7,
          9,
          5
        ],
        "note": "The prefix is sorted; save key=5 separately.",
        "active": [
          4
        ],
        "muted": []
      },
      {
        "label": "After shifting 9",
        "values": [
          1,
          2,
          7,
          9,
          9
        ],
        "note": "key=5 is still held in the local variable.",
        "active": [
          4
        ],
        "muted": []
      },
      {
        "label": "After shifting 7",
        "values": [
          1,
          2,
          7,
          7,
          9
        ],
        "note": "The overwritten source value is safe because key was saved.",
        "active": [
          3
        ],
        "muted": []
      },
      {
        "label": "Place key at index 2",
        "values": [
          1,
          2,
          5,
          7,
          9
        ],
        "note": "All five elements are now sorted.",
        "active": [
          2
        ],
        "muted": []
      }
    ],
    "note": "These are actual intermediate values for sorting the starter [9,2,7,1,5]. No element becomes an uninitialized hole.",
    "description": "Where is key 5 while 9 and 7 shift right? Before the last insertion: index 0 = 1, index 1 = 2, index 2 = 7, index 3 = 9, index 4 = 5. The prefix is sorted; save key=5 separately.. After shifting 9: index 0 = 1, index 1 = 2, index 2 = 7, index 3 = 9, index 4 = 9. key=5 is still held in the local variable.. After shifting 7: index 0 = 1, index 1 = 2, index 2 = 7, index 3 = 7, index 4 = 9. The overwritten source value is safe because key was saved.. Place key at index 2: index 0 = 1, index 1 = 2, index 2 = 5, index 3 = 7, index 4 = 9. All five elements are now sorted.. These are actual intermediate values for sorting the starter [9,2,7,1,5]. No element becomes an uninitialized hole."
  },
  "alg-trees": {
    "title": "The same ancestor rule applies to every descendant",
    "question": "Why does in-order traversal return [1,2,3,5,7]?",
    "kind": "graph",
    "nodes": [
      {
        "id": "5",
        "label": "5",
        "x": 58,
        "y": 12
      },
      {
        "id": "2",
        "label": "2",
        "x": 30,
        "y": 46
      },
      {
        "id": "7",
        "label": "7",
        "x": 84,
        "y": 46
      },
      {
        "id": "1",
        "label": "1",
        "x": 14,
        "y": 85
      },
      {
        "id": "3",
        "label": "3",
        "x": 45,
        "y": 85
      }
    ],
    "edges": [
      {
        "from": "5",
        "to": "2",
        "label": "< 5"
      },
      {
        "from": "5",
        "to": "7",
        "label": "> 5"
      },
      {
        "from": "2",
        "to": "1",
        "label": "< 2"
      },
      {
        "from": "2",
        "to": "3",
        "label": "> 2"
      }
    ],
    "legend": "Visit left subtree → current key → right subtree. Inserting 7 again leaves this unique-key tree unchanged.",
    "height": 350,
    "note": "Ordering alone does not guarantee logarithmic height. The boxes show logical nodes and owning links, not adjacent physical storage.",
    "description": "Why does in-order traversal return [1,2,3,5,7]? Nodes: 5, 2, 7, 1, 3. Connections: 5 leads to 2 (< 5); 5 leads to 7 (> 5); 2 leads to 1 (< 2); 2 leads to 3 (> 2). Visit left subtree → current key → right subtree. Inserting 7 again leaves this unique-key tree unchanged.. Ordering alone does not guarantee logarithmic height. The boxes show logical nodes and owning links, not adjacent physical storage."
  },
  "alg-graphs": {
    "title": "BFS discovers distance layers",
    "question": "Why is vertex 4 two edges away from vertex 0?",
    "kind": "graph",
    "nodes": [
      {
        "id": "0",
        "label": "0",
        "x": 50,
        "y": 12
      },
      {
        "id": "1",
        "label": "1",
        "x": 22,
        "y": 48
      },
      {
        "id": "3",
        "label": "3",
        "x": 78,
        "y": 48
      },
      {
        "id": "2",
        "label": "2",
        "x": 22,
        "y": 86
      },
      {
        "id": "4",
        "label": "4",
        "x": 78,
        "y": 86
      }
    ],
    "edges": [
      {
        "from": "0",
        "to": "1",
        "label": "",
        "directed": false
      },
      {
        "from": "0",
        "to": "3",
        "label": "",
        "directed": false
      },
      {
        "from": "1",
        "to": "2",
        "label": "",
        "directed": false
      },
      {
        "from": "3",
        "to": "4",
        "label": "",
        "directed": false
      }
    ],
    "legend": "Distance 0: vertex 0. Distance 1: vertices 1,3. Distance 2: vertices 2,4. The FIFO queue processes discoveries in layer order.",
    "height": 340,
    "note": "The starter traverses the reachable graph before returning distance[target]; it does not stop as soon as target is first seen. Equal-cost edges are required for this shortest-distance rule.",
    "description": "Why is vertex 4 two edges away from vertex 0? Nodes: 0, 1, 3, 2, 4. Connections: 0 connects to 1; 0 connects to 3; 1 connects to 2; 3 connects to 4. Distance 0: vertex 0. Distance 1: vertices 1,3. Distance 2: vertices 2,4. The FIFO queue processes discoveries in layer order.. The starter traverses the reachable graph before returning distance[target]; it does not stop as soon as target is first seen. Equal-cost edges are required for this shortest-distance rule."
  },
  "alg-lists": {
    "title": "The new owning link takes the old head",
    "question": "Which nodes are reused when 3 is prepended?",
    "kind": "panels",
    "panels": [
      {
        "label": "Before prepend(3)",
        "model": {
          "kind": "graph",
          "nodes": [
            {
              "id": "h",
              "label": "head",
              "x": 12,
              "y": 50
            },
            {
              "id": "2",
              "label": "2",
              "x": 44,
              "y": 50
            },
            {
              "id": "1",
              "label": "1",
              "x": 76,
              "y": 50
            }
          ],
          "edges": [
            {
              "from": "h",
              "to": "2",
              "label": ""
            },
            {
              "from": "2",
              "to": "1",
              "label": "owns next"
            }
          ],
          "legend": "Node 1.next is None.",
          "height": 160
        }
      },
      {
        "label": "After prepend(3)",
        "model": {
          "kind": "graph",
          "nodes": [
            {
              "id": "h",
              "label": "head",
              "x": 9,
              "y": 50
            },
            {
              "id": "3",
              "label": "3",
              "x": 34,
              "y": 50
            },
            {
              "id": "2",
              "label": "2",
              "x": 59,
              "y": 50
            },
            {
              "id": "1",
              "label": "1",
              "x": 84,
              "y": 50
            }
          ],
          "edges": [
            {
              "from": "h",
              "to": "3",
              "label": ""
            },
            {
              "from": "3",
              "to": "2",
              "label": "next"
            },
            {
              "from": "2",
              "to": "1",
              "label": "next"
            }
          ],
          "legend": "head.take transfers the old owning link; nodes 2 and 1 are not copied.",
          "height": 160
        }
      }
    ],
    "note": "Box links own nodes; the values traversal borrows references. Positions preserve logical identity and do not claim physical adjacency.",
    "description": "Which nodes are reused when 3 is prepended? Before prepend(3). Nodes: head, 2, 1. Connections: head leads to 2; 2 leads to 1 (owns next). Node 1.next is None.; After prepend(3). Nodes: head, 3, 2, 1. Connections: head leads to 3; 3 leads to 2 (next); 2 leads to 1 (next). head.take transfers the old owning link; nodes 2 and 1 are not copied.. Box links own nodes; the values traversal borrows references. Positions preserve logical identity and do not claim physical adjacency."
  },
  "alg-stacks": {
    "title": "Close the most recent unmatched delimiter",
    "question": "Why does { [ ( ) ] } finish with an empty stack?",
    "kind": "table",
    "headings": [
      "Token",
      "Stack after token · bottom → top",
      "Action"
    ],
    "rows": [
      [
        "{",
        "{",
        "push"
      ],
      [
        "[",
        "{ [",
        "push"
      ],
      [
        "(",
        "{ [ (",
        "push"
      ],
      [
        ")",
        "{ [",
        "pop and compare ("
      ],
      [
        "]",
        "{",
        "pop and compare ["
      ],
      [
        "}",
        "empty",
        "pop and compare {"
      ]
    ],
    "label": "",
    "links": [],
    "note": "This is the printed starter case {[()]}. The separate assertion ([)] fails on mismatched ordering even though the counts match.",
    "description": "Why does { [ ( ) ] } finish with an empty stack? Token; Stack after token · bottom → top; Action. {; {; push; [; { [; push; (; { [ (; push; ); { [; pop and compare (; ]; {; pop and compare [; }; empty; pop and compare {. . . This is the printed starter case {[()]}. The separate assertion ([)] fails on mismatched ordering even though the counts match."
  },
  "alg-queues": {
    "title": "The front follows arrival order",
    "question": "Why must 20 leave before the newly added 30?",
    "kind": "table",
    "headings": [
      "Operation",
      "Logical queue · front → back",
      "Returned value"
    ],
    "rows": [
      [
        "push 10, push 20",
        "10 → 20",
        "—"
      ],
      [
        "serve",
        "20",
        "Some(10)"
      ],
      [
        "push 30",
        "20 → 30",
        "—"
      ],
      [
        "serve",
        "30",
        "Some(20)"
      ],
      [
        "serve",
        "empty",
        "Some(30)"
      ],
      [
        "serve empty",
        "empty",
        "None"
      ]
    ],
    "label": "",
    "links": [],
    "note": "VecDeque uses its own storage representation; this is logical FIFO order, not an assumed internal array arrangement.",
    "description": "Why must 20 leave before the newly added 30? Operation; Logical queue · front → back; Returned value. push 10, push 20; 10 → 20; —; serve; 20; Some(10); push 30; 20 → 30; —; serve; 30; Some(20); serve; empty; Some(30); serve empty; empty; None. . . VecDeque uses its own storage representation; this is logical FIFO order, not an assumed internal array arrangement."
  },
  "rebalance": {
    "title": "A leaf split creates two key ranges",
    "question": "Where does the copied separator 5 belong?",
    "kind": "panels",
    "panels": [
      {
        "label": "Before split_keys",
        "model": {
          "kind": "slots",
          "rows": [
            {
              "label": "Five supplied keys",
              "values": [
                1,
                3,
                5,
                7,
                9
              ],
              "note": "split_off(5/2) moves the suffix starting at index 2.",
              "active": [],
              "muted": []
            }
          ]
        }
      },
      {
        "label": "Returned split",
        "model": {
          "kind": "graph",
          "nodes": [
            {
              "id": "s",
              "label": "5",
              "x": 50,
              "y": 18
            },
            {
              "id": "l",
              "label": "[1,3]",
              "x": 22,
              "y": 80
            },
            {
              "id": "r",
              "label": "[5,7,9]",
              "x": 78,
              "y": 80
            }
          ],
          "edges": [
            {
              "from": "s",
              "to": "l",
              "label": "< 5"
            },
            {
              "from": "s",
              "to": "r",
              "label": "≥ 5"
            }
          ],
          "legend": "left=[1,3]; right=[5,7,9]; separator=5.",
          "height": 300
        }
      }
    ],
    "note": "This inline program demonstrates the split only; the parent is a conceptual routing view. Underflow on deletion is a different operation, not the next step of every insertion.",
    "description": "Where does the copied separator 5 belong? Before split_keys. Five supplied keys: index 0 = 1, index 1 = 3, index 2 = 5, index 3 = 7, index 4 = 9. split_off(5/2) moves the suffix starting at index 2.; Returned split. Nodes: 5, [1,3], [5,7,9]. Connections: 5 leads to [1,3] (< 5); 5 leads to [5,7,9] (≥ 5). left=[1,3]; right=[5,7,9]; separator=5.. This inline program demonstrates the split only; the parent is a conceptual routing view. Underflow on deletion is a different operation, not the next step of every insertion."
  },
  "staging": {
    "title": "A candidate is separate from committed state",
    "question": "Why does stage(&committed,3) leave committed as [1,2]?",
    "kind": "references",
    "states": [
      {
        "label": "After staging",
        "objects": [
          {
            "label": "Committed vector",
            "value": "[1,2]",
            "refs": [
              {
                "name": "committed",
                "edge": "owns original"
              }
            ]
          },
          {
            "label": "Candidate vector",
            "value": "[1,2,3]",
            "refs": [
              {
                "name": "candidate",
                "edge": "owns copied and extended values"
              }
            ]
          }
        ]
      }
    ],
    "note": "The stage helper copies then appends. This program does not publish the candidate or claim atomic/durable storage; the old vector is unchanged.",
    "description": "Why does stage(&committed,3) leave committed as [1,2]? After staging: Committed vector contains [1,2]. committed owns original Committed vector; Candidate vector contains [1,2,3]. candidate owns copied and extended values Candidate vector. The stage helper copies then appends. This program does not publish the candidate or claim atomic/durable storage; the old vector is unchanged."
  },
  "rollback": {
    "title": "Rollback discards the staged owner",
    "question": "Why does committed remain [1] after rollback?",
    "kind": "references",
    "states": [
      {
        "label": "Before rollback",
        "objects": [
          {
            "label": "Committed vector",
            "value": "[1]",
            "refs": [
              {
                "name": "committed",
                "edge": "unchanged"
              }
            ]
          },
          {
            "label": "Optional staged vector",
            "value": "Some([1,2,3])",
            "refs": [
              {
                "name": "staged",
                "edge": "owns candidate"
              }
            ]
          }
        ]
      },
      {
        "label": "After rollback",
        "objects": [
          {
            "label": "Same committed vector",
            "value": "[1]",
            "refs": [
              {
                "name": "committed",
                "edge": "still owns original"
              }
            ]
          },
          {
            "label": "staged variable",
            "value": "None · candidate dropped",
            "refs": []
          }
        ]
      }
    ],
    "note": "Assigning None drops the staged Vec owner. Ordinary rollback is not journal replay, and committed is not replaced by the candidate.",
    "description": "Why does committed remain [1] after rollback? Before rollback: Committed vector contains [1]. committed unchanged Committed vector; Optional staged vector contains Some([1,2,3]). staged owns candidate Optional staged vector. After rollback: Same committed vector contains [1]. committed still owns original Same committed vector; staged variable contains None · candidate dropped. . Assigning None drops the staged Vec owner. Ordinary rollback is not journal replay, and committed is not replaced by the candidate."
  },
  "journal": {
    "title": "Recovery follows the committed decision",
    "question": "Why is prepared discarded while committed is redone?",
    "kind": "branch",
    "root": "Was a commit decision recorded?",
    "paths": [
      {
        "when": "No · committed=false",
        "result": "discard",
        "detail": "Prepared work does not become a committed update."
      },
      {
        "when": "Yes · committed=true",
        "result": "redo",
        "detail": "Recovery may install the committed work."
      }
    ],
    "note": "The inline program tests this decision function; it does not itself write a journal. The TinyDB workspace’s interruption experiments exercise file recovery separately.",
    "description": "Why is prepared discarded while committed is redone? Was a commit decision recorded?. No · committed=false. discard. Prepared work does not become a committed update.; Yes · committed=true. redo. Recovery may install the committed work.. The inline program tests this decision function; it does not itself write a journal. The TinyDB workspace’s interruption experiments exercise file recovery separately."
  },
  "browser-storage": {
    "title": "Compare the revision before accepting a save",
    "question": "Why does expected=3/current=4 reject the update?",
    "kind": "branch",
    "root": "compare_revision(expected,current)",
    "paths": [
      {
        "when": "3 == 3",
        "result": "Ok(4)",
        "detail": "Accept the next bounded revision."
      },
      {
        "when": "3 != 4",
        "result": "Err(stale workspace)",
        "detail": "The expected state is older than the saved state."
      },
      {
        "when": "MAX == MAX",
        "result": "Err(revision overflow)",
        "detail": "checked_add rejects the unrepresentable next revision."
      }
    ],
    "note": "The helper tests the revision rule. Actual workspace persistence must perform the compare-and-save atomically; this inline function alone is not an atomic storage transaction.",
    "description": "Why does expected=3/current=4 reject the update? compare_revision(expected,current). 3 == 3. Ok(4). Accept the next bounded revision.; 3 != 4. Err(stale workspace). The expected state is older than the saved state.; MAX == MAX. Err(revision overflow). checked_add rejects the unrepresentable next revision.. The helper tests the revision rule. Actual workspace persistence must perform the compare-and-save atomically; this inline function alone is not an atomic storage transaction."
  },
  "page-layout": {
    "title": "A valid page occupies a complete checked range",
    "question": "Why is page 1 accepted while page 2 is outside a 512-byte file?",
    "kind": "table",
    "headings": [
      "Page ID",
      "start = ID × 256",
      "end = start + 256",
      "Within file?"
    ],
    "rows": [
      [
        "0",
        "0",
        "256",
        "Yes: [0,256)"
      ],
      [
        "1",
        "256",
        "512",
        "Yes: [256,512)"
      ],
      [
        "2",
        "512",
        "768",
        "No: end > 512"
      ],
      [
        "usize::MAX",
        "checked multiply",
        "not evaluated on failure",
        "No: overflow"
      ]
    ],
    "label": "",
    "links": [],
    "note": "This fixture has no header offset: page 0 starts at byte 0. Checked arithmetic and the complete end boundary are both necessary. A page ID is not a Rust pointer.",
    "description": "Why is page 1 accepted while page 2 is outside a 512-byte file? Page ID; start = ID × 256; end = start + 256; Within file?. 0; 0; 256; Yes: [0,256); 1; 256; 512; Yes: [256,512); 2; 512; 768; No: end > 512; usize::MAX; checked multiply; not evaluated on failure; No: overflow. . . This fixture has no header offset: page 0 starts at byte 0. Checked arithmetic and the complete end boundary are both necessary. A page ID is not a Rust pointer."
  },
  "bplus-lookup": {
    "title": "Separators partition child domains",
    "question": "Why does key 15 select child 1?",
    "kind": "graph",
    "nodes": [
      {
        "id": "s",
        "label": "[10,20]",
        "x": 50,
        "y": 15
      },
      {
        "id": "a",
        "label": "child 0",
        "x": 16,
        "y": 80
      },
      {
        "id": "b",
        "label": "child 1",
        "x": 50,
        "y": 80
      },
      {
        "id": "c",
        "label": "child 2",
        "x": 84,
        "y": 80
      }
    ],
    "edges": [
      {
        "from": "s",
        "to": "a",
        "label": "< 10"
      },
      {
        "from": "s",
        "to": "b",
        "label": "10..19"
      },
      {
        "from": "s",
        "to": "c",
        "label": "≥ 20"
      }
    ],
    "legend": "partition_point counts separators ≤ key. Thus 9→0, 10→1, 15→1, 20→2.",
    "height": 300,
    "note": "These are child domains from the inline routing function, not a claim that it constructs complete leaves or stores the keys 10..19 in one node. Equality routes to the right.",
    "description": "Why does key 15 select child 1? Nodes: [10,20], child 0, child 1, child 2. Connections: [10,20] leads to child 0 (< 10); [10,20] leads to child 1 (10..19); [10,20] leads to child 2 (≥ 20). partition_point counts separators ≤ key. Thus 9→0, 10→1, 15→1, 20→2.. These are child domains from the inline routing function, not a claim that it constructs complete leaves or stores the keys 10..19 in one node. Equality routes to the right."
  },
  "arrays": {
    "title": "Index 1 selects the second initialized element",
    "question": "Why does second(values) return 20?",
    "kind": "slots",
    "rows": [
      {
        "label": "Three u32 elements",
        "values": [
          10,
          20,
          30
        ],
        "note": "Length=3; valid indices are 0,1,2.",
        "active": [
          1
        ],
        "muted": [],
        "tags": {
          "1": "selected"
        }
      }
    ],
    "note": "Indices count elements, not bytes. The fixed array is passed by value to second; these u32 elements are Copy.",
    "description": "Why does second(values) return 20? Three u32 elements: index 0 = 10, index 1 = 20, index 2 = 30. Length=3; valid indices are 0,1,2.. Indices count elements, not bytes. The fixed array is passed by value to second; these u32 elements are Copy."
  },
  "vectors": {
    "title": "Insert at the returned position; reject duplicates",
    "question": "Why does inserting 3 into [1,5] preserve sorted order?",
    "kind": "slots",
    "rows": [
      {
        "label": "Before insert_key",
        "values": [
          1,
          5
        ],
        "note": "binary_search returns Err(1): insert before the old 5.",
        "active": [],
        "muted": [],
        "tags": {
          "1": "insertion position"
        }
      },
      {
        "label": "After insertion",
        "values": [
          1,
          3,
          5
        ],
        "note": "A second search for 3 returns Ok(1), so duplicate insertion is rejected.",
        "active": [
          1
        ],
        "muted": []
      }
    ],
    "note": "The array length changes, so this is a logical element view, not fixed physical storage. Vec may reallocate during insertion; existing element addresses are not promised stable.",
    "description": "Why does inserting 3 into [1,5] preserve sorted order? Before insert_key: index 0 = 1, index 1 = 5. binary_search returns Err(1): insert before the old 5.. After insertion: index 0 = 1, index 1 = 3, index 2 = 5. A second search for 3 returns Ok(1), so duplicate insertion is rejected.. The array length changes, so this is a logical element view, not fixed physical storage. Vec may reallocate during insertion; existing element addresses are not promised stable."
  },
  "alg-recursion": {
    "title": "Calls retain unfinished multiplication",
    "question": "Why does factorial(6) return 720?",
    "kind": "frames",
    "frames": [
      {
        "call": "factorial(6)",
        "pending": "6 × factorial(5)",
        "result": "Return 720"
      },
      {
        "call": "factorial(5)",
        "pending": "5 × factorial(4)",
        "result": "Return 120"
      },
      {
        "call": "factorial(4)",
        "pending": "4 × factorial(3)",
        "result": "Return 24"
      },
      {
        "call": "factorial(3)",
        "pending": "3 × factorial(2)",
        "result": "Return 6"
      },
      {
        "call": "factorial(2)",
        "pending": "2 × factorial(1)",
        "result": "Return 2"
      },
      {
        "call": "factorial(1)",
        "pending": "1 × factorial(0)",
        "result": "Return 1"
      },
      {
        "call": "factorial(0)",
        "pending": "Base case returns 1",
        "result": "Return 1"
      }
    ],
    "note": "This is the printed factorial(6) call, with results returning from the innermost call outward. Frames are a logical call model, not a physical stack layout or an overflow guarantee for arbitrary inputs.",
    "description": "Why does factorial(6) return 720? factorial(6). 6 × factorial(5). Return 720; factorial(5). 5 × factorial(4). Return 120; factorial(4). 4 × factorial(3). Return 24; factorial(3). 3 × factorial(2). Return 6; factorial(2). 2 × factorial(1). Return 2; factorial(1). 1 × factorial(0). Return 1; factorial(0). Base case returns 1. Return 1. This is the printed factorial(6) call, with results returning from the innermost call outward. Frames are a logical call model, not a physical stack layout or an overflow guarantee for arbitrary inputs."
  },
  "checked-arithmetic": {
    "title": "Checked addition has a failure outcome",
    "question": "Why does u32::MAX + 1 become an error instead of a wrapped success?",
    "kind": "branch",
    "root": "checked_add followed by ok_or(overflow)",
    "paths": [
      {
        "when": "19 + 23 fits u32",
        "result": "Some(42) → Ok(42)",
        "detail": "The successful printed call returns 42."
      },
      {
        "when": "u32::MAX + 1 does not fit",
        "result": "None → Err(overflow)",
        "detail": "No wrapped value is accepted."
      }
    ],
    "note": "This is checked arithmetic, independent of debug/release overflow settings. The unrepresentable sum is reported as failure, not evaluated as an ordinary wrapping expression.",
    "description": "Why does u32::MAX + 1 become an error instead of a wrapped success? checked_add followed by ok_or(overflow). 19 + 23 fits u32. Some(42) → Ok(42). The successful printed call returns 42.; u32::MAX + 1 does not fit. None → Err(overflow). No wrapped value is accepted.. This is checked arithmetic, independent of debug/release overflow settings. The unrepresentable sum is reported as failure, not evaluated as an ordinary wrapping expression."
  },
  "question-mark": {
    "title": "Question mark either extracts or returns early",
    "question": "Which step is skipped when parsing a fails?",
    "kind": "flow",
    "steps": [
      {
        "label": "number(a)?",
        "detail": "Ok(value) extracts a; Err(bad number) immediately returns from add_text."
      },
      {
        "label": "number(b)?",
        "detail": "Reached only if parsing a succeeded; apply the same rule to b."
      },
      {
        "label": "checked_add",
        "detail": "If both parsed, return Ok(sum) or Err(overflow)."
      }
    ],
    "note": "Assertions cover x/2 → bad number, MAX/1 → overflow, and 19/23 → Ok(42). The printed call is 19/23; an early error does not continue through later stages.",
    "description": "Which step is skipped when parsing a fails? number(a)?. Ok(value) extracts a; Err(bad number) immediately returns from add_text.; number(b)?. Reached only if parsing a succeeded; apply the same rule to b.; checked_add. If both parsed, return Ok(sum) or Err(overflow).. Assertions cover x/2 → bad number, MAX/1 → overflow, and 19/23 → Ok(42). The printed call is 19/23; an early error does not continue through later stages."
  },
  "atomic-change": {
    "title": "Reject before replacing the old name",
    "question": "Why does a rejected empty replacement preserve Ada?",
    "kind": "branch",
    "root": "replacement is nonempty and at most 31 UTF-8 bytes?",
    "paths": [
      {
        "when": "No · empty string",
        "result": "Err(invalid name)",
        "detail": "name stays Ada."
      },
      {
        "when": "Yes · Lin",
        "result": "Replace name; Ok(())",
        "detail": "name becomes Lin and is printed."
      }
    ],
    "note": "The function validates before assignment through &mut String. “Atomic change” here describes an all-or-nothing API effect, not lock-free CPU atomics or thread synchronization.",
    "description": "Why does a rejected empty replacement preserve Ada? replacement is nonempty and at most 31 UTF-8 bytes?. No · empty string. Err(invalid name). name stays Ada.; Yes · Lin. Replace name; Ok(()). name becomes Lin and is printed.. The function validates before assignment through &mut String. “Atomic change” here describes an all-or-nothing API effect, not lock-free CPU atomics or thread synchronization."
  },
  "decode": {
    "title": "Read only a complete four-byte prefix",
    "question": "Why must the short-input cases return an error before decoding?",
    "kind": "panels",
    "panels": [
      {
        "label": "Length guard",
        "model": {
          "kind": "branch",
          "root": "bytes.get(..4)",
          "paths": [
            {
              "when": "Fewer than 4 bytes",
              "result": "Err(short input)",
              "detail": "No four-byte array is read."
            },
            {
              "when": "At least 4 bytes",
              "result": "Take the first four bytes",
              "detail": "Convert to [u8;4], then decode."
            }
          ]
        }
      },
      {
        "label": "Supplied successful prefix",
        "model": {
          "kind": "bytes",
          "label": "Little-endian bytes → 258",
          "values": [
            "02",
            "01",
            "00",
            "00"
          ],
          "groups": [
            {
              "label": "low",
              "size": 1
            },
            {
              "label": "next",
              "size": 1
            },
            {
              "label": "high",
              "size": 2
            }
          ]
        }
      }
    ],
    "note": "The helper accepts a prefix; it does not reject all trailing bytes. Checked slice access precedes conversion and decoding.",
    "description": "Why must the short-input cases return an error before decoding? Length guard. bytes.get(..4). Fewer than 4 bytes. Err(short input). No four-byte array is read.; At least 4 bytes. Take the first four bytes. Convert to [u8;4], then decode.; Supplied successful prefix. Little-endian bytes → 258. low uses byte offsets 0: 02; next uses byte offsets 1: 01; high uses byte offsets 2 through 3: 00, 00. The helper accepts a prefix; it does not reject all trailing bytes. Checked slice access precedes conversion and decoding."
  },
  "option-propagation": {
    "title": "A size overflow stops before constructing the success",
    "question": "Why is the oversized record count None?",
    "kind": "branch",
    "root": "records.checked_mul(size)?",
    "paths": [
      {
        "when": "3 × 40 fits usize",
        "result": "Extract 120; return Some(120)",
        "detail": ""
      },
      {
        "when": "usize::MAX × 40 does not fit",
        "result": "Return None immediately",
        "detail": "The later Some(count) is not reached."
      }
    ],
    "note": "The maximum depends on usize’s target width. This is a checked byte-count calculation, not an allocation attempt or a claim that memory is available.",
    "description": "Why is the oversized record count None? records.checked_mul(size)?. 3 × 40 fits usize. Extract 120; return Some(120). ; usize::MAX × 40 does not fit. Return None immediately. The later Some(count) is not reached.. The maximum depends on usize’s target width. This is a checked byte-count calculation, not an allocation attempt or a claim that memory is available."
  },
  "lifetimes": {
    "title": "The returned reference still borrows an input",
    "question": "Why can longer return Grace without allocating a new String?",
    "kind": "references",
    "states": [
      {
        "label": "During the call and while using the result",
        "objects": [
          {
            "label": "First caller-owned String",
            "value": "Ada",
            "refs": [
              {
                "name": "first",
                "edge": "owns"
              },
              {
                "name": "a",
                "edge": "shared borrow"
              }
            ]
          },
          {
            "label": "Second caller-owned String",
            "value": "Grace",
            "refs": [
              {
                "name": "second",
                "edge": "owns"
              },
              {
                "name": "b and returned result",
                "edge": "shared borrows"
              }
            ]
          }
        ]
      }
    ],
    "note": "The function chooses b because its byte length is larger. The shared lifetime parameter constrains valid use of the returned borrow; it does not extend either owner’s lifetime or copy the selected text.",
    "description": "Why can longer return Grace without allocating a new String? During the call and while using the result: First caller-owned String contains Ada. first owns First caller-owned String; a shared borrow First caller-owned String; Second caller-owned String contains Grace. second owns Second caller-owned String; b and returned result shared borrows Second caller-owned String. The function chooses b because its byte length is larger. The shared lifetime parameter constrains valid use of the returned borrow; it does not extend either owner’s lifetime or copy the selected text."
  },
  "text-slices": {
    "title": "A text view does not take ownership",
    "question": "How can text_length read owned.as_str() without consuming owned?",
    "kind": "references",
    "states": [
      {
        "label": "While text_length runs",
        "objects": [
          {
            "label": "One caller-owned String",
            "value": "Ada · 3 UTF-8 bytes",
            "refs": [
              {
                "name": "owned",
                "edge": "owns"
              },
              {
                "name": "text: &str",
                "edge": "borrows the text range"
              }
            ]
          }
        ]
      }
    ],
    "note": "The same function can read a string literal. The borrowed view has a byte length; no new owned String is needed.",
    "description": "How can text_length read owned.as_str() without consuming owned? While text_length runs: One caller-owned String contains Ada · 3 UTF-8 bytes. owned owns One caller-owned String; text: &str borrows the text range One caller-owned String. The same function can read a string literal. The borrowed view has a byte length; no new owned String is needed."
  },
  "shared": {
    "title": "A shared reader leaves the owner available",
    "question": "Why does the final print still include café?",
    "kind": "references",
    "states": [
      {
        "label": "During byte_len(&name)",
        "objects": [
          {
            "label": "Caller-owned String",
            "value": "café · 5 UTF-8 bytes",
            "refs": [
              {
                "name": "name",
                "edge": "owns"
              },
              {
                "name": "text: &str",
                "edge": "shared read access"
              }
            ]
          }
        ]
      }
    ],
    "note": "The helper reads the byte length through a shared borrow. It neither consumes nor clones name; the caller prints both 5 and café afterward.",
    "description": "Why does the final print still include café? During byte_len(&name): Caller-owned String contains café · 5 UTF-8 bytes. name owns Caller-owned String; text: &str shared read access Caller-owned String. The helper reads the byte length through a shared borrow. It neither consumes nor clones name; the caller prints both 5 and café afterward."
  }
};
