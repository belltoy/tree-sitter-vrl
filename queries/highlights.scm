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
(boolean) @boolean

(ident) @identifier
