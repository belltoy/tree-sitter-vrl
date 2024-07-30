(comment) @comment @spell

(null) @constant.builtin

(timestamp) @constant

(closure_variables
  (ident) @variable.parameter)

(integer) @number

(float) @number.float

[
  (string)
  (raw_string)
] @string

[
  (raw_string_escape_sequence)
  (escape_sequence)
  (regex_escape_sequence)
] @string.escape

(string_template
  "{{" @punctuation.special
  (_)
  "}}" @punctuation.special)

(regex) @string.regexp

(boolean) @boolean

(ident) @variable

[
  (null)
  ; (event)
  (noop)
] @variable.builtin

; To prevent the (event) pattern from matching the unnamed "." in the path field
((event) @variable.builtin
  (#not-has-parent? @variable.builtin path))

(function_call
  (ident) @function.call)

; VRL queries
(query
  (path
    [
      (field) @variable
      (string) @string
      (index) @number
    ]))

"return" @keyword.return

"abort" @keyword.exception

[
  "if"
  "else"
] @keyword.conditional

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
] @operator

[
  "->"
  ":"
  ";"
  ","
] @punctuation.delimiter

("." @punctuation.delimiter
  (#has-parent? @punctuation.delimiter path))

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

(closure_variables
  "|" @punctuation.bracket)

(function_call
  (ident) @keyword.exception
  "!"
  (#any-of? @keyword.exception "assert" "assert_eq"))
