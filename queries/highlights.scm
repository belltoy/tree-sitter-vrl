;; vim:ft=query
(comment) @comment

[
   "abort"
   ; "as"
   ; "break"
   ; "continue"
   "else"
   "false"
   ; "for"
   "if"
   ; "impl"
   ; "in"
   ; "let"
   ; "loop"
   "null"
   "return"
   ; "self"
   ; "std"
   ; "then"
   ; "this"
   "true"
   ; "type"
   ; "until"
   ; "use"
   ; "while"
] @keyword

[
 "="
 "=="
 "!="
 "|="
 ">"
 ">="
 "<"
 "<="
 "+"
 "-"
 "*"
 "/"
 "&&"
 "||"
 "??"
 "|"
 "!"
 "."
] @operator

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
]  @punctuation.bracket

[
 (null)
 (boolean)
 (timestamp)
] @constant.builtin

(closure_variables
  "|" @punctuation.bracket)

(integer) @number

(float) @number

(string) @string

[
 (raw_string_escape_sequence)
 (escape_sequence)
 (regex_escape_sequence)
] @string.escape

(sigil_name) @string.special

(regex_content) @string.regexp

(boolean) @boolean

(ident) @identifier
