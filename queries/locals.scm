(closure_variables
  (ident) @local.definition.parameter)

[
  (ident)
  (metadata)
] @local.reference

; To prevent the (event) pattern from matching the unamed "." in the path field
((event) @local.reference
  (#not-has-parent? @local.reference path))

[
  (block)
  (closure)
  (if_statement)
] @local.scope
