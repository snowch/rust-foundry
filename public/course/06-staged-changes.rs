//! Rust Foundry TinyDB: a bounded, single-writer teaching database.
//! See docs/tinydb-format.md for the persisted contracts and failure model.
use std::collections::HashSet;
use std::fs::{self, OpenOptions};
use std::io::{self, BufRead, Write};
use std::path::{Path, PathBuf};

type DbResult<T> = Result<T, String>;
const PAGE_SIZE: usize = 256;
const MAX_PAGES: usize = 4096;
const MAX_ROWS: usize = 4096;
const LEAF_MAX: usize = 4;
const BRANCH_MAX: usize = 5;
const ROW_SIZE: usize = 40;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Row { pub id: u32, pub name: String, pub score: u32 }
impl Row {
    pub fn new(id: u32, name: &str, score: u32) -> DbResult<Self> {
        if id == 0 || name.is_empty() || name.len() > 31 || name.bytes().any(|b| b < 32 || b == 127) {
            return Err("Use a positive uint32 ID, 1–31 UTF-8 name bytes without ASCII controls, and a uint32 score.".into());
        }
        Ok(Self { id, name: name.into(), score })
    }
}
#[derive(Clone, Debug)]
enum Node {
    Leaf { rows: Vec<Row>, next: Option<usize> },
    Branch { keys: Vec<u32>, children: Vec<usize> },
}
impl Node {
    fn len(&self) -> usize { match self { Self::Leaf { rows, .. } => rows.len(), Self::Branch { children, .. } => children.len() } }
    fn minimum(&self) -> usize { if matches!(self, Self::Leaf { .. }) { 2 } else { 3 } }
}
#[derive(Clone, Debug)]
pub struct Database { pages: Vec<Option<Node>>, root: usize, len: usize, generation: u64 }
impl Default for Database { fn default() -> Self { Self::new() } }
impl Database {
    pub fn new() -> Self {
        Self { pages: vec![None, Some(Node::Leaf { rows: vec![], next: None })], root: 1, len: 0, generation: 0 }
    }
    fn node(&self, id: usize) -> DbResult<&Node> { self.pages.get(id).and_then(Option::as_ref).ok_or_else(|| format!("Invalid page reference {id}.")) }
    fn put(&mut self, id: usize, node: Node) { self.pages[id] = Some(node); }
    fn alloc(&mut self, node: Node) -> DbResult<usize> {
        if let Some(id) = self.pages.iter().enumerate().skip(1).find_map(|(i, p)| if p.is_none() { Some(i) } else { None }) {
            self.pages[id] = Some(node); return Ok(id);
        }
        if self.pages.len() >= MAX_PAGES { return Err("Page limit reached.".into()); }
        self.pages.push(Some(node)); Ok(self.pages.len() - 1)
    }
    fn first_key(&self, mut id: usize) -> DbResult<u32> {
        for _ in 0..self.pages.len() {
            match self.node(id)? {
                Node::Leaf { rows, .. } => return rows.first().map(|r| r.id).ok_or_else(|| "Empty non-root subtree.".into()),
                Node::Branch { children, .. } => id = *children.first().ok_or("Empty branch.")?,
            }
        }
        Err("Page cycle.".into())
    }
    fn branch(&self, children: Vec<usize>) -> DbResult<Node> {
        let keys = children.iter().skip(1).map(|id| self.first_key(*id)).collect::<DbResult<Vec<_>>>()?;
        Ok(Node::Branch { keys, children })
    }
    fn leaf_for(&self, key: u32) -> DbResult<(usize, Vec<usize>)> {
        let mut id = self.root; let mut path = vec![];
        for _ in 0..self.pages.len() {
            path.push(id);
            match self.node(id)? {
                Node::Leaf { .. } => return Ok((id, path)),
                Node::Branch { keys, children } => id = children[keys.partition_point(|k| key >= *k)],
            }
        }
        Err("Page cycle.".into())
    }
    pub fn find(&self, key: u32) -> DbResult<Option<&Row>> {
        let (id, _) = self.leaf_for(key)?;
        match self.node(id)? {
            Node::Leaf { rows, .. } => Ok(rows.binary_search_by_key(&key, |r| r.id).ok().map(|i| &rows[i])),
            _ => Err("Expected a leaf.".into()),
        }
    }
    pub fn range(&self, low: u32, high: u32) -> DbResult<Vec<Row>> {
        if low > high { return Ok(vec![]); }
        let (mut id, _) = self.leaf_for(low)?; let mut found = vec![]; let mut visited = HashSet::new();
        loop {
            if !visited.insert(id) { return Err("Leaf-link cycle.".into()); }
            match self.node(id)? {
                Node::Leaf { rows, next } => {
                    for row in rows {
                        if row.id > high { return Ok(found); }
                        if row.id >= low { found.push(row.clone()); }
                    }
                    match next { Some(next_id) => id = *next_id, None => return Ok(found) }
                }
                _ => return Err("Leaf link points to a branch.".into()),
            }
        }
    }
    pub fn rows(&self) -> DbResult<Vec<Row>> { self.range(1, u32::MAX) }
    pub fn insert(&mut self, row: Row) -> DbResult<()> {
        Row::new(row.id, &row.name, row.score)?;
        if self.len >= MAX_ROWS { return Err("Table is full (4096 rows).".into()); }
        if self.find(row.id)?.is_some() { return Err("Duplicate ID.".into()); }
        let mut candidate = self.clone();
        if let Some((key, right)) = candidate.insert_at(candidate.root, row)? {
            let old = candidate.root;
            candidate.root = candidate.alloc(Node::Branch { keys: vec![key], children: vec![old, right] })?;
        }
        candidate.len += 1; *self = candidate; Ok(())
    }
    fn insert_at(&mut self, id: usize, row: Row) -> DbResult<Option<(u32, usize)>> {
        match self.node(id)?.clone() {
            Node::Leaf { mut rows, next } => {
                let at = rows.binary_search_by_key(&row.id, |r| r.id).unwrap_or_else(|i| i);
                rows.insert(at, row);
                if rows.len() <= LEAF_MAX { self.put(id, Node::Leaf { rows, next }); return Ok(None); }
                let right_rows = rows.split_off(rows.len() / 2); let key = right_rows[0].id;
                let right = self.alloc(Node::Leaf { rows: right_rows, next })?;
                self.put(id, Node::Leaf { rows, next: Some(right) }); Ok(Some((key, right)))
            }
            Node::Branch { keys, mut children } => {
                let at = keys.partition_point(|k| row.id >= *k);
                if let Some((_, right)) = self.insert_at(children[at], row)? { children.insert(at + 1, right); }
                if children.len() <= BRANCH_MAX { self.put(id, self.branch(children)?); return Ok(None); }
                let right_children = children.split_off(children.len() / 2);
                let key = self.first_key(right_children[0])?;
                let right = self.alloc(self.branch(right_children)?)?;
                self.put(id, self.branch(children)?); Ok(Some((key, right)))
            }
        }
    }
    pub fn update(&mut self, id: u32, name: Option<String>, score: Option<u32>) -> DbResult<()> {
        let old = self.find(id)?.ok_or("ID not found.")?;
        let row = Row::new(id, name.as_deref().unwrap_or(&old.name), score.unwrap_or(old.score))?;
        let (page, _) = self.leaf_for(id)?;
        if let Some(Node::Leaf { rows, .. }) = &mut self.pages[page] {
            let at = rows.binary_search_by_key(&id, |r| r.id).map_err(|_| "ID not found.")?;
            rows[at] = row;
        }
        Ok(())
    }
    pub fn delete(&mut self, key: u32) -> DbResult<()> {
        if self.find(key)?.is_none() { return Err("ID not found.".into()); }
        let mut candidate = self.clone(); candidate.delete_at(candidate.root, key)?;
        if let Node::Branch { children, .. } = candidate.node(candidate.root)? {
            if children.len() == 1 {
                let old = candidate.root; candidate.root = children[0]; candidate.pages[old] = None;
            }
        }
        candidate.len -= 1; *self = candidate; Ok(())
    }
    fn delete_at(&mut self, id: usize, key: u32) -> DbResult<()> {
        match self.node(id)?.clone() {
            Node::Leaf { mut rows, next } => {
                let at = rows.binary_search_by_key(&key, |r| r.id).map_err(|_| "ID not found.")?;
                rows.remove(at); self.put(id, Node::Leaf { rows, next });
            }
            Node::Branch { keys, mut children } => {
                let at = keys.partition_point(|k| key >= *k); self.delete_at(children[at], key)?;
                if self.node(children[at])?.len() < self.node(children[at])?.minimum() { self.rebalance(&mut children, at)?; }
                self.put(id, self.branch(children)?);
            }
        }
        Ok(())
    }
    fn rebalance(&mut self, children: &mut Vec<usize>, at: usize) -> DbResult<()> {
        if at > 0 && self.node(children[at - 1])?.len() > self.node(children[at - 1])?.minimum() {
            let left = children[at - 1]; let child = children[at];
            match (self.node(left)?.clone(), self.node(child)?.clone()) {
                (Node::Leaf { mut rows, next }, Node::Leaf { rows: mut target, next: target_next }) => {
                    target.insert(0, rows.pop().ok_or("Empty sibling.")?);
                    self.put(left, Node::Leaf { rows, next }); self.put(child, Node::Leaf { rows: target, next: target_next });
                }
                (Node::Branch { children: mut left_children, .. }, Node::Branch { children: mut target, .. }) => {
                    target.insert(0, left_children.pop().ok_or("Empty sibling.")?);
                    self.put(left, self.branch(left_children)?); self.put(child, self.branch(target)?);
                }
                _ => return Err("Sibling type mismatch.".into()),
            }
        } else if at + 1 < children.len() && self.node(children[at + 1])?.len() > self.node(children[at + 1])?.minimum() {
            let right = children[at + 1]; let child = children[at];
            match (self.node(right)?.clone(), self.node(child)?.clone()) {
                (Node::Leaf { mut rows, next }, Node::Leaf { rows: mut target, next: target_next }) => {
                    target.push(rows.remove(0));
                    self.put(right, Node::Leaf { rows, next }); self.put(child, Node::Leaf { rows: target, next: target_next });
                }
                (Node::Branch { children: mut right_children, .. }, Node::Branch { children: mut target, .. }) => {
                    target.push(right_children.remove(0));
                    self.put(right, self.branch(right_children)?); self.put(child, self.branch(target)?);
                }
                _ => return Err("Sibling type mismatch.".into()),
            }
        } else if at > 0 {
            self.merge(children[at - 1], children[at])?; children.remove(at);
        } else if children.len() > 1 {
            self.merge(children[at], children[at + 1])?; children.remove(at + 1);
        }
        Ok(())
    }
    fn merge(&mut self, left: usize, right: usize) -> DbResult<()> {
        let merged = match (self.node(left)?.clone(), self.node(right)?.clone()) {
            (Node::Leaf { mut rows, .. }, Node::Leaf { rows: other, next }) => { rows.extend(other); Node::Leaf { rows, next } }
            (Node::Branch { children: mut a, .. }, Node::Branch { children: b, .. }) => { a.extend(b); self.branch(a)? }
            _ => return Err("Sibling type mismatch.".into()),
        };
        self.put(left, merged); self.pages[right] = None; Ok(())
    }
    pub fn validate(&self) -> DbResult<()> {
        if self.pages.len() < 2 || self.pages.len() > MAX_PAGES || self.len > MAX_ROWS { return Err("Invalid database bounds.".into()); }
        let mut seen = HashSet::new(); let mut leaves = vec![]; let mut depth = None;
        self.walk(self.root, 0, &mut seen, &mut leaves, &mut depth)?;
        if seen.len() != self.pages.iter().skip(1).filter(|p| p.is_some()).count() { return Err("Unreachable allocated page.".into()); }
        let mut previous = None; let mut count = 0;
        for (i, id) in leaves.iter().enumerate() {
            if let Node::Leaf { rows, next } = self.node(*id)? {
                if *next != leaves.get(i + 1).copied() { return Err("Broken leaf chain.".into()); }
                for row in rows {
                    Row::new(row.id, &row.name, row.score)?;
                    if previous.map(|key| key >= row.id).unwrap_or(false) { return Err("Keys are not strictly ordered.".into()); }
                    previous = Some(row.id); count += 1;
                }
            }
        }
        if count != self.len { return Err("Row count mismatch.".into()); } Ok(())
    }
    fn walk(&self, id: usize, level: usize, seen: &mut HashSet<usize>, leaves: &mut Vec<usize>, depth: &mut Option<usize>) -> DbResult<(u32, u32)> {
        if id == 0 || !seen.insert(id) || level > 32 { return Err("Repeated page, cycle, or excessive height.".into()); }
        match self.node(id)? {
            Node::Leaf { rows, .. } => {
                if rows.len() > LEAF_MAX || (id != self.root && rows.len() < 2) { return Err("Leaf occupancy violation.".into()); }
                if let Some(expected) = *depth { if expected != level { return Err("Leaves have different depths.".into()); } } else { *depth = Some(level); }
                leaves.push(id); Ok((rows.first().map(|r| r.id).unwrap_or(0), rows.last().map(|r| r.id).unwrap_or(0)))
            }
            Node::Branch { keys, children } => {
                let minimum = if id == self.root { 2 } else { 3 };
                if children.len() < minimum || children.len() > BRANCH_MAX || keys.len() + 1 != children.len() { return Err("Branch occupancy violation.".into()); }
                let mut spans = vec![];
                for child in children { spans.push(self.walk(*child, level + 1, seen, leaves, depth)?); }
                for i in 1..spans.len() {
                    if keys[i - 1] != spans[i].0 || spans[i - 1].1 >= spans[i].0 { return Err("Invalid separator or overlapping subtree.".into()); }
                }
                Ok((spans[0].0, spans[spans.len() - 1].1))
            }
        }
    }
}

fn checksum(bytes: &[u8], skip: Option<std::ops::Range<usize>>) -> u32 {
    bytes.iter().enumerate().fold(2_166_136_261u32, |hash, (i, b)| {
        let value = if skip.as_ref().map(|range| range.contains(&i)).unwrap_or(false) { 0 } else { *b };
        (hash ^ u32::from(value)).wrapping_mul(16_777_619)
    })
}
fn u16_at(b: &[u8], at: usize) -> usize { u16::from_le_bytes([b[at], b[at + 1]]) as usize }
fn u32_at(b: &[u8], at: usize) -> u32 { u32::from_le_bytes(b[at..at + 4].try_into().expect("checked field bounds")) }
fn u64_at(b: &[u8], at: usize) -> u64 { u64::from_le_bytes(b[at..at + 8].try_into().expect("checked field bounds")) }
fn put32(b: &mut [u8], at: usize, value: u32) { b[at..at + 4].copy_from_slice(&value.to_le_bytes()); }
fn encode_row(row: &Row, out: &mut [u8]) { put32(out, 0, row.id); out[4..4 + row.name.len()].copy_from_slice(row.name.as_bytes()); put32(out, 36, row.score); }
fn decode_row(b: &[u8]) -> DbResult<Row> {
    if b.len() != ROW_SIZE { return Err("Invalid row length.".into()); }
    let end = b[4..36].iter().position(|b| *b == 0).ok_or("Unterminated row name.")?;
    let name = std::str::from_utf8(&b[4..4 + end]).map_err(|_| "Invalid UTF-8 name.")?;
    Row::new(u32_at(b, 0), name, u32_at(b, 36))
}
impl Database {
    pub fn encode(&self) -> DbResult<Vec<u8>> {
        self.validate()?;
        let mut bytes = vec![0; self.pages.len() * PAGE_SIZE];
        bytes[..4].copy_from_slice(b"RDB2"); bytes[4] = 1; bytes[6..8].copy_from_slice(&(PAGE_SIZE as u16).to_le_bytes());
        put32(&mut bytes, 8, self.root as u32); put32(&mut bytes, 12, self.pages.len() as u32); put32(&mut bytes, 16, self.len as u32);
        bytes[20..28].copy_from_slice(&self.generation.to_le_bytes());
        for (id, node) in self.pages.iter().enumerate().skip(1) {
            let page = &mut bytes[id * PAGE_SIZE..(id + 1) * PAGE_SIZE];
            match node {
                None => continue,
                Some(Node::Leaf { rows, next }) => {
                    page[0] = 1; page[2..4].copy_from_slice(&(rows.len() as u16).to_le_bytes()); put32(page, 4, next.unwrap_or(0) as u32);
                    for (i, row) in rows.iter().enumerate() { encode_row(row, &mut page[16 + i * ROW_SIZE..16 + (i + 1) * ROW_SIZE]); }
                }
                Some(Node::Branch { keys, children }) => {
                    page[0] = 2; page[2..4].copy_from_slice(&(children.len() as u16).to_le_bytes());
                    for (i, key) in keys.iter().enumerate() { put32(page, 16 + i * 4, *key); }
                    for (i, child) in children.iter().enumerate() { put32(page, 32 + i * 4, *child as u32); }
                }
            }
            let hash = checksum(&page[..252], None); put32(page, 252, hash);
        }
        let hash = checksum(&bytes, Some(28..32)); put32(&mut bytes, 28, hash); Ok(bytes)
    }
    pub fn decode(bytes: &[u8]) -> DbResult<Self> {
        if bytes.len() < PAGE_SIZE || &bytes[..4] != b"RDB2" || bytes[4] != 1 || u16_at(bytes, 6) != PAGE_SIZE { return Err("Unsupported paged database header.".into()); }
        let count = u32_at(bytes, 12) as usize;
        if !(2..=MAX_PAGES).contains(&count) || bytes.len() != count * PAGE_SIZE || checksum(bytes, Some(28..32)) != u32_at(bytes, 28) { return Err("Database length or checksum mismatch.".into()); }
        let mut pages = vec![None];
        for id in 1..count {
            let b = &bytes[id * PAGE_SIZE..(id + 1) * PAGE_SIZE];
            if b[0] == 0 { if b.iter().any(|v| *v != 0) { return Err("Invalid free page.".into()); } pages.push(None); continue; }
            if checksum(&b[..252], None) != u32_at(b, 252) { return Err(format!("Checksum mismatch on page {id}.")); }
            let n = u16_at(b, 2);
            pages.push(Some(match b[0] {
                1 if n <= LEAF_MAX => {
                    let rows = (0..n).map(|i| decode_row(&b[16 + i * ROW_SIZE..16 + (i + 1) * ROW_SIZE])).collect::<DbResult<Vec<_>>>()?;
                    Node::Leaf { rows, next: match u32_at(b, 4) { 0 => None, n => Some(n as usize) } }
                }
                2 if (2..=BRANCH_MAX).contains(&n) => Node::Branch {
                    keys: (0..n - 1).map(|i| u32_at(b, 16 + i * 4)).collect(),
                    children: (0..n).map(|i| u32_at(b, 32 + i * 4) as usize).collect(),
                },
                _ => return Err(format!("Invalid node tag or count on page {id}.")),
            }));
        }
        let db = Self { pages, root: u32_at(bytes, 8) as usize, len: u32_at(bytes, 16) as usize, generation: u64_at(bytes, 20) };
        db.validate()?; Ok(db)
    }
    pub fn export_legacy(&self) -> DbResult<Vec<u8>> {
        if self.len > 128 { return Err("TDB1 exchange supports at most 128 rows.".into()); }
        let mut bytes = vec![0; 8 + self.len * ROW_SIZE]; bytes[..8].copy_from_slice(&[b'T', b'D', b'B', b'1', 1, 40, self.len as u8, 0]);
        for (i, row) in self.rows()?.iter().enumerate() { encode_row(row, &mut bytes[8 + i * ROW_SIZE..8 + (i + 1) * ROW_SIZE]); }
        Ok(bytes)
    }
    pub fn import_legacy(bytes: &[u8]) -> DbResult<Self> {
        if bytes.len() < 8 || &bytes[..6] != b"TDB1\x01\x28" || bytes[7] != 0 || bytes[6] > 128 || bytes.len() != 8 + usize::from(bytes[6]) * ROW_SIZE { return Err("Invalid TDB1 file.".into()); }
        let mut db = Self::new();
        for b in bytes[8..].chunks_exact(ROW_SIZE) { db.insert(decode_row(b)?)?; }
        Ok(db)
    }
}

#[derive(Clone, Debug, PartialEq)]
enum Token { Word(String), Number(u32), Text(String), Symbol(char) }
fn lex(text: &str) -> DbResult<Vec<Token>> {
    let mut chars = text.chars().peekable(); let mut tokens = vec![];
    while let Some(c) = chars.next() {
        if c.is_whitespace() { continue; }
        if c.is_ascii_digit() {
            let mut number = c.to_string();
            while chars.peek().map(|c| c.is_ascii_digit()).unwrap_or(false) { number.push(chars.next().unwrap()); }
            tokens.push(Token::Number(number.parse().map_err(|_| "Number exceeds uint32.")?));
        } else if c.is_ascii_alphabetic() || c == '_' {
            let mut word = c.to_string();
            while chars.peek().map(|c| c.is_ascii_alphanumeric() || *c == '_').unwrap_or(false) { word.push(chars.next().unwrap()); }
            tokens.push(Token::Word(word.to_ascii_uppercase()));
        } else if c == '\'' {
            let mut value = String::new(); let mut ended = false;
            while let Some(c) = chars.next() {
                if c == '\'' {
                    if chars.peek() == Some(&'\'') { chars.next(); value.push('\''); }
                    else { ended = true; break; }
                } else { value.push(c); }
                if value.len() > 31 { return Err("Name exceeds 31 UTF-8 bytes.".into()); }
            }
            if !ended { return Err("Unterminated string.".into()); }
            tokens.push(Token::Text(value));
        } else if "(),;*=<>".contains(c) { tokens.push(Token::Symbol(c)); }
        else { return Err(format!("Unexpected character {c:?}.")); }
        if tokens.len() > 128 { return Err("Statement is too long.".into()); }
    }
    Ok(tokens)
}
#[derive(Debug)]
enum Statement {
    Insert(Row), Select { count: bool, low: u32, high: u32 },
    Update { id: u32, name: Option<String>, score: Option<u32> }, Delete(u32),
    Begin, Commit, Rollback, Explain(Box<Statement>),
}
struct Parser { tokens: Vec<Token>, at: usize }
impl Parser {
    fn next(&mut self) -> DbResult<Token> { let token = self.tokens.get(self.at).cloned().ok_or("Unexpected end of statement.")?; self.at += 1; Ok(token) }
    fn take_word(&mut self, expected: &str) -> bool {
        if self.tokens.get(self.at) == Some(&Token::Word(expected.into())) { self.at += 1; true } else { false }
    }
    fn word(&mut self, expected: &str) -> DbResult<()> { if self.take_word(expected) { Ok(()) } else { Err(format!("Expected {expected}.")) } }
    fn take_symbol(&mut self, expected: char) -> bool {
        if self.tokens.get(self.at) == Some(&Token::Symbol(expected)) { self.at += 1; true } else { false }
    }
    fn symbol(&mut self, expected: char) -> DbResult<()> { if self.take_symbol(expected) { Ok(()) } else { Err(format!("Expected {expected}.")) } }
    fn number(&mut self) -> DbResult<u32> { match self.next()? { Token::Number(n) => Ok(n), _ => Err("Expected an unsigned integer.".into()) } }
    fn text(&mut self) -> DbResult<String> { match self.next()? { Token::Text(s) => Ok(s), _ => Err("Expected a single-quoted name.".into()) } }
    fn select(&mut self) -> DbResult<Statement> {
        let count = self.take_word("COUNT");
        if count { self.symbol('(')?; self.symbol('*')?; self.symbol(')')?; } else { self.symbol('*')?; }
        self.word("FROM")?; self.word("PEOPLE")?;
        let (mut low, mut high) = (1, u32::MAX);
        if self.take_word("WHERE") {
            self.word("ID")?;
            if self.take_symbol('=') { low = self.number()?; high = low; }
            else {
                self.symbol('>')?; self.symbol('=')?; low = self.number()?;
                self.word("AND")?; self.word("ID")?; self.symbol('<')?; self.symbol('=')?; high = self.number()?;
                if low > high { return Err("Range lower bound exceeds upper bound.".into()); }
            }
        }
        if self.take_word("ORDER") { self.word("BY")?; self.word("ID")?; }
        Ok(Statement::Select { count, low, high })
    }
    fn statement(&mut self) -> DbResult<Statement> {
        let result = if self.take_word("INSERT") {
            self.word("INTO")?; self.word("PEOPLE")?; self.word("VALUES")?; self.symbol('(')?;
            let id = self.number()?; self.symbol(',')?; let name = self.text()?; self.symbol(',')?;
            let score = self.number()?; self.symbol(')')?; Statement::Insert(Row::new(id, &name, score)?)
        } else if self.take_word("SELECT") { self.select()? }
        else if self.take_word("EXPLAIN") { self.word("SELECT")?; Statement::Explain(Box::new(self.select()?)) }
        else if self.take_word("UPDATE") {
            self.word("PEOPLE")?; self.word("SET")?; let mut name = None; let mut score = None;
            loop {
                if self.take_word("NAME") {
                    if name.is_some() { return Err("Repeated name assignment.".into()); }
                    self.symbol('=')?; name = Some(self.text()?);
                } else if self.take_word("SCORE") {
                    if score.is_some() { return Err("Repeated score assignment.".into()); }
                    self.symbol('=')?; score = Some(self.number()?);
                } else { return Err("UPDATE supports name and score only.".into()); }
                if !self.take_symbol(',') { break; }
            }
            self.word("WHERE")?; self.word("ID")?; self.symbol('=')?;
            Statement::Update { id: self.number()?, name, score }
        } else if self.take_word("DELETE") {
            self.word("FROM")?; self.word("PEOPLE")?; self.word("WHERE")?; self.word("ID")?; self.symbol('=')?;
            Statement::Delete(self.number()?)
        } else if self.take_word("BEGIN") { self.take_word("TRANSACTION"); Statement::Begin }
        else if self.take_word("COMMIT") { Statement::Commit }
        else if self.take_word("ROLLBACK") { Statement::Rollback }
        else { return Err("Unknown statement. Use .help for the supported SQL subset.".into()); };
        self.symbol(';')?;
        if self.at != self.tokens.len() { return Err("Trailing tokens after statement.".into()); }
        Ok(result)
    }
}
fn parse(text: &str) -> DbResult<Statement> { Parser { tokens: lex(text)?, at: 0 }.statement() }

fn sidecar(path: &Path, suffix: &str) -> PathBuf { PathBuf::from(format!("{}{suffix}", path.display())) }
fn read_limited(path: &Path, limit: usize) -> DbResult<Option<Vec<u8>>> {
    match fs::metadata(path) {
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("Cannot inspect {}: {error}", path.display())),
        Ok(meta) if meta.len() > limit as u64 => Err(format!("File {} exceeds the size limit.", path.display())),
        Ok(_) => fs::read(path).map(Some).map_err(|error| format!("Cannot read {}: {error}", path.display())),
    }
}
fn sync_parent(path: &Path) -> DbResult<()> {
    #[cfg(all(unix, not(target_arch = "wasm32")))]
    {
        let parent = path.parent().filter(|p| !p.as_os_str().is_empty()).unwrap_or(Path::new("."));
        fs::File::open(parent).and_then(|file| file.sync_all()).map_err(|e| format!("Directory sync failed: {e}"))?;
    }
    #[cfg(any(not(unix), target_arch = "wasm32"))]
    let _ = path;
    Ok(())
}
fn write_atomic(path: &Path, bytes: &[u8]) -> DbResult<()> {
    let temporary = sidecar(path, ".tmp");
    let mut file = OpenOptions::new().write(true).create_new(true).open(&temporary).map_err(|error| format!("Cannot create {}: {error}. Existing files were retained.", temporary.display()))?;
    let result = (|| {
        file.write_all(bytes).map_err(|e| format!("Write failed: {e}"))?;
        #[cfg(not(target_arch = "wasm32"))]
        file.sync_all().map_err(|e| format!("File sync failed: {e}"))?;
        drop(file);
        fs::rename(&temporary, path).map_err(|e| format!("Rename failed: {e}"))?;
        sync_parent(path)
    })();
    if result.is_err() { let _ = fs::remove_file(&temporary); }
    result
}
fn read_database(path: &Path) -> DbResult<Database> {
    match read_limited(path, PAGE_SIZE * MAX_PAGES)? {
        None => Ok(Database::new()),
        Some(bytes) if bytes.starts_with(b"TDB1") => Database::import_legacy(&bytes),
        Some(bytes) => Database::decode(&bytes),
    }
}
fn journal(base: u64, snapshot: &[u8], committed: bool) -> DbResult<Vec<u8>> {
    let db = Database::decode(snapshot)?;
    if base.checked_add(1) != Some(db.generation) { return Err("Invalid journal generation.".into()); }
    let mut out = vec![0; 32]; out[..4].copy_from_slice(b"RWL2"); out[4] = 1; out[5] = u8::from(committed);
    out[8..16].copy_from_slice(&base.to_le_bytes()); out[16..24].copy_from_slice(&db.generation.to_le_bytes());
    put32(&mut out, 24, snapshot.len() as u32); out.extend_from_slice(snapshot);
    let hash = checksum(&out, Some(28..32)); put32(&mut out, 28, hash); Ok(out)
}
fn decode_journal(bytes: &[u8]) -> DbResult<(u64, u64, bool, &[u8])> {
    if bytes.len() < 32 || &bytes[..4] != b"RWL2" || bytes[4] != 1 || bytes[5] > 1 || bytes[6..8] != [0, 0] || bytes.len() - 32 != u32_at(bytes, 24) as usize || checksum(bytes, Some(28..32)) != u32_at(bytes, 28) {
        return Err("Invalid or truncated journal; files were retained for inspection.".into());
    }
    let base = u64_at(bytes, 8); let target = u64_at(bytes, 16); let snapshot = &bytes[32..];
    if base.checked_add(1) != Some(target) || Database::decode(snapshot)?.generation != target { return Err("Journal generation mismatch.".into()); }
    Ok((base, target, bytes[5] == 1, snapshot))
}
fn recover(path: &Path) -> DbResult<Option<String>> {
    let wal = sidecar(path, ".wal");
    let bytes = match read_limited(&wal, PAGE_SIZE * MAX_PAGES + 32)? { Some(bytes) => bytes, None => return Ok(None) };
    let (base, target, committed, snapshot) = decode_journal(&bytes)?;
    let current = read_database(path)?;
    let message;
    if committed {
        if current.generation == base { write_atomic(path, snapshot)?; }
        else if current.generation != target || current.encode()? != snapshot { return Err("Journal conflicts with the database generation; files were retained.".into()); }
        message = format!("Recovered committed transaction at generation {target}.");
    } else {
        if current.generation != base { return Err("Prepared journal conflicts with the database generation.".into()); }
        message = "Discarded uncommitted journal; previous database retained.".into();
    }
    fs::remove_file(&wal).map_err(|e| format!("Cannot remove recovered journal: {e}"))?; sync_parent(&wal)?;
    Ok(Some(message))
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum FailPoint { Prepare, Commit, Install }
pub struct Session { path: PathBuf, committed: Database, staged: Option<Database>, fail: Option<FailPoint>, recovery: Option<String> }
impl Session {
    pub fn open(path: &Path) -> DbResult<Self> {
        if path.as_os_str().is_empty() || path.to_string_lossy().len() > 220 { return Err("Invalid database path.".into()); }
        let recovery = recover(path)?; let committed = read_database(path)?;
        if !path.exists() { write_atomic(path, &committed.encode()?)?; }
        Ok(Self { path: path.into(), committed, staged: None, fail: None, recovery })
    }
    fn view(&self) -> &Database { self.staged.as_ref().unwrap_or(&self.committed) }
    fn commit(&mut self, mut candidate: Database) -> DbResult<()> {
        let base = self.committed.generation;
        if read_database(&self.path)?.generation != base { return Err("Database changed since it was opened; reopen before writing.".into()); }
        if sidecar(&self.path, ".wal").exists() { return Err("An unfinished journal exists; reopen to recover it.".into()); }
        candidate.generation = base.checked_add(1).ok_or("Generation overflow.")?;
        let snapshot = candidate.encode()?; let wal = sidecar(&self.path, ".wal");
        write_atomic(&wal, &journal(base, &snapshot, false)?)?;
        if self.fail == Some(FailPoint::Prepare) { return Err("SIMULATED_CRASH: after prepare; no commit marker.".into()); }
        write_atomic(&wal, &journal(base, &snapshot, true)?)?;
        if self.fail == Some(FailPoint::Commit) { return Err("SIMULATED_CRASH: after commit marker; redo on reopen.".into()); }
        write_atomic(&self.path, &snapshot)?;
        if self.fail == Some(FailPoint::Install) { return Err("SIMULATED_CRASH: after install; recovery is idempotent.".into()); }
        fs::remove_file(&wal).map_err(|e| format!("Journal cleanup failed: {e}"))?; sync_parent(&wal)?;
        self.committed = candidate; self.fail = None; Ok(())
    }
    fn apply(&mut self, change: impl FnOnce(&mut Database) -> DbResult<()>) -> DbResult<String> {
        todo!("06-staged-changes: Change a candidate, keep failure atomic, stage during BEGIN, otherwise autocommit.")
    }
    pub fn execute(&mut self, text: &str) -> DbResult<String> {
        let text = text.trim();
        if text.is_empty() || text.starts_with("--") { return Ok(String::new()); }
        if text.len() > 4096 { return Err("Statement exceeds 4096 bytes.".into()); }
        if text.starts_with('.') { return self.meta(text); }
        match parse(text)? {
            Statement::Insert(row) => self.apply(|db| db.insert(row)),
            Statement::Update { id, name, score } => self.apply(|db| db.update(id, name, score)),
            Statement::Delete(id) => self.apply(|db| db.delete(id)),
            Statement::Select { count, low, high } => {
                let rows = self.view().range(low, high)?;
                if count { return Ok(format!("{}\n", rows.len())); }
                let mut out = String::new();
                for row in &rows { out.push_str(&format!("{} | {} | {}\n", row.id, row.name, row.score)); }
                out.push_str(&format!("{} row{}\n", rows.len(), if rows.len() == 1 { "" } else { "s" })); Ok(out)
            }
            Statement::Begin => {
                if self.staged.is_some() { return Err("A transaction is already active.".into()); }
                self.staged = Some(self.committed.clone()); Ok("BEGIN\n".into())
            }
            Statement::Rollback => {
                if self.staged.take().is_none() { return Err("No active transaction.".into()); } Ok("ROLLBACK\n".into())
            }
            Statement::Commit => {
                let candidate = self.staged.as_ref().ok_or("No active transaction.")?.clone();
                self.commit(candidate)?; self.staged = None; Ok("COMMIT\n".into())
            }
            Statement::Explain(statement) => match *statement {
                Statement::Select { low, high, .. } => {
                    let (_, pages) = self.view().leaf_for(low)?;
                    Ok(format!("{}; root-to-leaf pages {:?}; {} rows match\n", if low == high { "B+ tree point lookup" } else { "B+ tree range seek + leaf scan" }, pages, self.view().range(low, high)?.len()))
                }
                _ => Err("EXPLAIN supports SELECT only.".into()),
            },
        }
    }
    fn meta(&mut self, text: &str) -> DbResult<String> {
        let words = text.split_whitespace().collect::<Vec<_>>();
        match words.as_slice() {
            [".help"] => Ok("TinyDB: one people table; 4096 rows; 256-byte pages; B+ tree (4 rows/leaf, 5 children/branch).\nINSERT INTO people VALUES (1, 'Ada', 90);\nSELECT * FROM people [WHERE id = 1 | WHERE id >= 1 AND id <= 9] [ORDER BY id];\nSELECT COUNT(*) FROM people;\nUPDATE people SET score = 95 WHERE id = 1;\nDELETE FROM people WHERE id = 1;\nBEGIN; COMMIT; ROLLBACK;\nEXPLAIN SELECT * FROM people WHERE id = 1;\n.tables .schema .pages .index .check .recover\n.export legacy.tdb   .snapshot backup.rdb   .import file\n.crash prepare|commit|install   .quit\nTransactions must finish in the same browser script. An open transaction rolls back at EOF.\n".into()),
            [".tables"] => Ok("people\n".into()),
            [".schema"] => Ok("people(id uint32 positive unique, name UTF-8 bytes[1..31], score uint32)\n".into()),
            [".check"] => {
                self.view().validate()?;
                Ok(format!("OK: {} rows; {} allocated pages; height {}.\n", self.view().len, self.view().pages.iter().skip(1).filter(|p| p.is_some()).count(), self.view().leaf_for(1)?.1.len()))
            }
            [".index"] => Ok(format!("B+ tree on people.id; root {}; height {}; unique; leaf capacity 4; branch capacity 5\n", self.view().root, self.view().leaf_for(1)?.1.len())),
            [".pages"] => {
                let mut out = format!("page 0: header; generation {}; root {}; {} rows; page size 256\n", self.view().generation, self.view().root, self.view().len);
                for (id, node) in self.view().pages.iter().enumerate().skip(1) {
                    out.push_str(&match node {
                        None => format!("page {id}: free\n"),
                        Some(Node::Leaf { rows, next }) => format!("page {id}: leaf; keys {:?}; next {:?}\n", rows.iter().map(|r| r.id).collect::<Vec<_>>(), next),
                        Some(Node::Branch { keys, children }) => format!("page {id}: branch; separators {keys:?}; children {children:?}\n"),
                    });
                }
                Ok(out)
            }
            [".recover"] => Ok(format!("Recovery complete; generation {}.\n", self.committed.generation)),
            [".export", path] => { self.export_target(Path::new(path))?; write_atomic(Path::new(path), &self.view().export_legacy()?)?; Ok(format!("Exported TDB1 to {path}.\n")) }
            [".snapshot", path] => { self.export_target(Path::new(path))?; write_atomic(Path::new(path), &self.view().encode()?)?; Ok(format!("Exported paged snapshot to {path}.\n")) }
            [".import", path] => {
                let bytes = read_limited(Path::new(path), PAGE_SIZE * MAX_PAGES)?.ok_or("Import file not found.")?;
                let mut imported = if bytes.starts_with(b"TDB1") { Database::import_legacy(&bytes)? } else { Database::decode(&bytes)? };
                imported.generation = self.committed.generation;
                self.apply(|db| { *db = imported; Ok(()) })
            }
            [".crash", point] => {
                self.fail = Some(match *point { "prepare" => FailPoint::Prepare, "commit" => FailPoint::Commit, "install" => FailPoint::Install, _ => return Err("Use .crash prepare, commit, or install.".into()) });
                Ok(format!("Next commit will simulate interruption after {point}.\n"))
            }
            _ => Err("Unknown command or arguments. Use .help.".into()),
        }
    }
    fn export_target(&self, target: &Path) -> DbResult<()> {
        let normalized = |path: &Path| -> DbResult<PathBuf> {
            let parent = path.parent().filter(|p| !p.as_os_str().is_empty()).unwrap_or(Path::new("."));
            let name = path.file_name().ok_or("Invalid export filename.")?;
            // Canonicalization is not available in this memory WASI filesystem.
            #[cfg(not(target_arch = "wasm32"))]
            let parent = parent.canonicalize().map_err(|e| format!("Invalid export directory: {e}"))?;
            #[cfg(target_arch = "wasm32")]
            let parent = {
                let mut normalized = PathBuf::from("/");
                for part in parent.components() {
                    match part {
                        std::path::Component::Normal(value) => normalized.push(value),
                        std::path::Component::ParentDir => { normalized.pop(); },
                        _ => {},
                    }
                }
                normalized
            };
            Ok(parent.join(name))
        };
        let target = normalized(target)?;
        for protected in [self.path.clone(), sidecar(&self.path, ".wal"), sidecar(&self.path, ".tmp"), sidecar(&self.path, ".wal.tmp")] {
            if target == normalized(&protected)? { return Err("Export to a different filename; the active database and journal are protected.".into()); }
        }
        Ok(())
    }
}

fn split_statements(line: &str) -> DbResult<Vec<String>> {
    if line.trim_start().starts_with('.') || line.trim_start().starts_with("--") { return Ok(vec![line.trim().into()]); }
    let mut quoted = false; let mut current = String::new(); let mut statements = vec![];
    // A pair of quote toggles has no net effect for SQL's doubled quote escape.
    for c in line.chars() {
        current.push(c);
        if c == '\'' { quoted = !quoted; }
        if c == ';' && !quoted { statements.push(std::mem::take(&mut current)); }
    }
    if quoted { return Err("Unterminated string; use one complete statement per line.".into()); }
    if !current.trim().is_empty() { statements.push(current); }
    Ok(statements)
}
fn main() {
    let args = std::env::args().collect::<Vec<_>>();
    if args.get(1).map(String::as_str) == Some("--help") { println!("tinydb DATABASE [--execute SQL]"); return; }
    if args.len() != 2 && !(args.len() == 4 && args[2] == "--execute") { eprintln!("Usage: tinydb DATABASE [--execute SQL]"); std::process::exit(2); }
    let mut session = match Session::open(Path::new(&args[1])) { Ok(s) => s, Err(e) => { eprintln!("Error: {e}"); std::process::exit(3); } };
    if let Some(message) = session.recovery.take() { println!("{message}"); }
    let mut code = 0; let mut quit = false;
    let input: Box<dyn BufRead> = if args.len() == 4 { Box::new(io::Cursor::new(args[3].clone().into_bytes())) } else { Box::new(io::BufReader::new(io::stdin())) };
    for line in input.lines() {
        let line = match line { Ok(line) => line, Err(e) => { eprintln!("Input error: {e}"); code = 3; break; } };
        let statements = match split_statements(&line) { Ok(s) => s, Err(e) => { eprintln!("Error: {e}"); code = 2; continue; } };
        for text in statements {
            if matches!(text.trim(), ".quit" | ".exit") { quit = true; break; }
            match session.execute(&text) {
                Ok(output) => print!("{output}"),
                Err(error) => {
                    eprintln!("Error: {error}");
                    if error.starts_with("SIMULATED_CRASH:") { std::process::exit(80); }
                    code = 2;
                }
            }
        }
        if quit { break; }
        let _ = io::stdout().flush();
    }
    if session.staged.is_some() { println!("ROLLBACK (input ended with an open transaction)"); }
    std::process::exit(code);
}
