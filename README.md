# tree-sitter-vrl

Vector Remap Language (VRL) grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter).

## Features

- [x] Syntax highlighting
- [x] Code folding
- [x] Indentation
- [x] Code injection
- [x] Local variables
- [ ] Tagging

## Usage

To use this grammar, you need to have tree-sitter installed and configured in your editor or IDE.

## Advanced Usage

Since people use VRL embedded in the vector's YAML or TOML config files, you can use Tree Sitter
[Language Injection] feature to highlight VRL code injected inside these files.

For example, you can use the following queries in your YAML extended query file to highlight VRL
code in YAML:

```query
;; Vector VRL codes embeded in YAML
;;
;; _NOTE_: ONLY use injection for VRL code in block scalar **literal** mode.
;;
;;
;; Block header in _clip_ mode with indentation indicator
;; Or in _strip_ or _keep_ mode without indentation indicator
;; Example:
;;
;;     source: |-
;;
;; or
;;
;;     source: |4
(block_mapping_pair
  key: (flow_node
    (plain_scalar
      (string_scalar) @_source
      (#any-of? @_source "source" "condition")))
  value: (block_node
    (block_scalar) @injection.content
    (#match? @injection.content "^[\\|][-+1-9]\n.*$")
    (#offset! @injection.content 0 2 0 0)
    (#set! injection.language "vrl")))

;; Block header in _strip_ or _keep_ mode with indentation indicator
;; Example:
;;
;;     source: |-4
(block_mapping_pair
  key: (flow_node
    (plain_scalar
      (string_scalar) @_source
      (#any-of? @_source "source" "condition")))
  value: (block_node
    (block_scalar) @injection.content
    (#match? @injection.content "^[\\|][-+][1-9]\n.*$")
    (#offset! @injection.content 0 3 0 0)
    (#set! injection.language "vrl")))

;; Block header in _clip_ mode without indentation indicator
;; Example:
;;
;;     source: |
(block_mapping_pair
  key: (flow_node
    (plain_scalar
      (string_scalar) @_source
      (#any-of? @_source "source" "condition")))
  value: (block_node
    (block_scalar) @injection.content
    (#match? @injection.content "^[\\|]\n.*$")
    (#offset! @injection.content 0 1 0 0)
    (#set! injection.language "vrl")))

;; For float scalars
(block_mapping_pair
  key: (flow_node
         (plain_scalar
           (string_scalar) @_source
          (#eq? @_source "condition")))
  value: (flow_node
           (plain_scalar
             (string_scalar) @injection.content
             (#offset! @injection.content 0 0 0 0)
             (#set! injection.language "vrl"))))
```

You can do the same for TOML files.

## Known Issues

The vector configuration file supports environment variable [interpolation]. This feature is not a
part of the VRL language. So the syntax highlighting will not work correctly if you inject VRL
code in the vector's configuration file in this case.

However, tree sitter will minimize the impact of this issue via its error detection and recovery
techniques.

## TODO

- [x] Add unit tests
- [ ] Detect RFC3339 format for `timestamp` type

## References

- [VRL](https://vrl.dev/)
- [Language Injection]

[Language Injection]: https://tree-sitter.github.io/tree-sitter/syntax-highlighting#language-injection
[interpolation]: https://vector.dev/docs/reference/configuration/#environment-variables
