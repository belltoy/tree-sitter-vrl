/**
 * @file Vector Remap Language (VRL) grammar for tree-sitter
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const decimal_integer = /-?(0|[1-9][_0-9]*)/;
const fractional = /([_0-9])+/;

module.exports = grammar({
  name: 'vrl',

  extras: $ => [
    /\s/,
    $.comment,
  ],

  supertypes: $ => [
    $._literal,
  ],

  precedences: $ => [
    [
      'return',
      'not',
      'binary_factor',
      'binary_add',
      'merge',
      'binary_comparison',
      'binary_equality',
      'logical', // `&&` and `||` share one level, as in VRL's parser
      'error_coalesce',
    ],
    [
      'assign',
    ],
  ],

  // `}` NEWLINE `else` continues an if; a bare NEWLINE ends it
  conflicts: $ => [
    [$.if_statement],
  ],

  word: $ => $.ident,

  rules: {
    program: $ => optional($._root_exprs),

    _root_exprs: $ => choice(
      $._root_expr,
      repeat1(seq($._root_expr, $._end_of_expression)),
      seq(repeat1(seq($._root_expr, $._end_of_expression)), $._root_expr),
    ),

    _root_expr: $ => $._expr,

    _expr: $ => choice(
      $.if_statement,
      $.abort,
      $.return,
      $.break,
      $._assignment_expr,
    ),

    _arithmetic: $ => choice(
      $.binary_expression,
      $.unary_expression,
      $._term,
      // alias($._term, $.term),
    ),

    binary_expression: $ => choice(
      ...[
        ['??', 'error_coalesce'],
        ['||', 'logical'],
        ['&&', 'logical'],

        ['!=', 'binary_equality'],
        ['==', 'binary_equality'],

        ['>=', 'binary_comparison'],
        ['>', 'binary_comparison'],
        ['<=', 'binary_comparison'],
        ['<', 'binary_comparison'],

        ['|', 'merge'],

        ['+', 'binary_add'],
        ['-', 'binary_add'],
        ['*', 'binary_factor'],
        ['/', 'binary_factor'],
      ].map(([operator, precedence]) => {
        return prec.left(precedence, seq(
            field('left', $._arithmetic),
            field('operator', operator),
            field('right', $._arithmetic),
        ))
      })
    ),

    unary_expression: $ => prec.right('not', seq('!', field('right', $._arithmetic))),

    _term: $ => choice(
      $._literal,
      prec.left(1, $._container), // higher than ??
      $.query,
      prec.left(1, $.function_call), // higher than ??
      $.ident,
    ),

    _literal: $ => choice(
      $.string,
      $.raw_string,
      $.integer,
      $.float,
      $.boolean,
      $.null,
      $.regex,
      $.timestamp,
    ),

    _container: $ => choice(
      $.group,
      $.block,
      $.array,
      $.object,
    ),

    if_statement: $ => prec.dynamic(1, seq(
      'if',
      field('condition', $.predicate),
      repeat($._non_terminal_newline),
      $.block,

      repeat(seq(
        repeat($._non_terminal_newline),
        'else',
        repeat($._non_terminal_newline),
        'if',
        field('condition', $.predicate),
        repeat($._non_terminal_newline),
        $.block,
      )),

      optional(seq(repeat($._non_terminal_newline), 'else', repeat($._non_terminal_newline), $.block)),
    )),

    predicate: $ => choice(
      $._arithmetic,
      seq(
      '(',
        repeat($._non_terminal_newline),
        repeat1(seq(
          $._assignment_expr,
          repeat1(choice($._non_terminal_newline, ';')),
        )),
        optional($._assignment_expr),
        ')',
      ),
    ),

    _assignment_expr: $ => choice(
      $._assignment,
      $._arithmetic,
    ),

    _assignment: $ => choice(
      alias($._assign_single, $.assignment),
      alias($._assign_infallible, $.assignment),
    ),

    assign_target: $ => choice(
      alias('_', $.noop),
      $.query,
      $.ident,
    ),

    _assign_operator: $ => choice(
      '=',
      '|=',
    ),

    _assign_single: $ => seq(
      field('left', $.assign_target),
      $._assign_operator,
      repeat($._non_terminal_newline),
      field('right', $._expr),
    ),

    assign_infallible_target: $ => seq(
      field('ok', $.assign_target),
      ',',
      field('err', $.assign_target),
    ),

    _assign_infallible: $ => seq(
      field('left', $.assign_infallible_target,),
      $._assign_operator,
      repeat($._non_terminal_newline),
      field('right', $._expr),
    ),

    /// The {L,R}Query token is an "instruction" token. It does not represent
    /// any character in the source, instead it represents the start or end of a
    /// sequence of tokens that together form a "query".
    ///
    /// Some examples:
    ///
    /// ```text
    /// .          => LQuery, Dot, RQuery
    /// .foo       => LQuery, Dot, Ident, RQuery
    /// foo.bar[2] => LQuery, Ident, Dot, Ident, LBracket, Integer, RBracket, RQuery
    /// foo().bar  => LQuery, FunctionCall, LParen, RParen, Dot, Ident, RQuery
    /// [1].foo    => LQuery, LBracket, Integer, RBracket, Dot, Ident, RQuery
    /// { .. }[0]  => LQuery, LBrace, ..., RBrace, LBracket, ... RBracket, RQuery
    /// ```
    ///
    /// The final example shows how the lexer does not care about the semantic
    /// validity of a query (as in, getting the index from an object does not
    /// work), it only signals that one exists.
    ///
    /// Some non-matching examples:
    ///
    /// ```text
    /// . foo      => Dot, Identifier
    /// foo() .a   => FunctionCall, LParen, RParen, LQuery, Dot, Ident, RQuery
    /// [1] [2]    => RBracket, Integer, LBracket, RBracket, Integer, RBracket
    /// ```
    ///
    /// The reason these tokens exist is to allow the parser to remain
    /// whitespace-agnostic, while still being able to distinguish between the
    /// above two groups of examples.
    query: $ => choice(
      $._external_event,
      $._external_metadata,
      alias('.', $.event),
      alias('%', $.metadata),
      seq(
        choice(
          $.ident,
          $.function_call,
          $._container, // array or object
        ),
        alias($._path_begin_with_dot, $.path),
      ),
    ),

    _external_event: $ => prec.left(2, seq(
      alias('.', $.event),
      alias($._path_begin_without_dot, $.path),
    )),

    _external_metadata: $ => prec.left(2, seq(
      alias('%', $.metadata),
      alias($._path_begin_without_dot, $.path),
    )),

    _path_begin_with_dot: $ => prec.left(seq(
      choice(
        seq($._immediate_dot, $._field),
        seq('[', alias($.integer, $.index), ']'),
      ),
      repeat($._path_segment),
    )),

    _path_begin_without_dot: $ => prec.left(seq(
      choice(
        $._field,
        seq('[', alias($.integer, $.index), ']'),
      ),
      repeat($._path_segment),
    )),

    _path_segment: $ => choice(
      seq($._immediate_dot, $._field),
      seq('[', alias($.integer, $.index), ']'),
    ),

    _field: $ => choice(
      $.field,
      $.string,
    ),

    field: $ => choice(
      $._any_ident,
      $._path_field,
    ),

    _path_field: _ => token.immediate(/[@_a-zA-Z][@_a-zA-Z0-9]*/),

    _any_ident: $ => choice(
      $.ident,
      // reserved ident
      'if',
      'else',
      'null',
      'true',
      'false',
      'abort',
      'return',
      'break',
    ),

    block: $ => seq(
      '{',
        seq(repeat($._non_terminal_newline), $._exprs),
      '}',
    ),

    object: $ => choice(
      seq('{', repeat($._non_terminal_newline), '}'),
      seq(
        '{',
        repeat($._non_terminal_newline),
        commaMultiline($.entry, $),
        '}',
      ),
    ),

    entry: $ => seq($.key, ':', alias($._arithmetic, $.value)),

    key: $ => $.string,

    array: $ => choice(
      seq('[', repeat($._non_terminal_newline), ']'),
      seq(
        '[',
        repeat($._non_terminal_newline),
        commaMultiline($._arithmetic, $),
        ']',
      ),
    ),

    group: $ => seq('(', $._assignment_expr, ')'),

    _exprs: $ => choice(
      $._expr,
      seq(
          repeat1(seq($._expr, $._end_of_expression)),
          optional($._expr),
      ),
    ),

    _non_terminal_newline: $ => '\n',

    _end_of_expression: $ =>
      choice(
        repeat1('\n'),
        seq(';', repeat('\n')),
      ),

    function_call: $ => seq(
      field('function_name', $.ident),
      optional(token.immediate('!')),
      seq(
        $.arguments,
        optional($.closure),
      ),
    ),

    arguments: $ => seq(
        '(',
        repeat($._non_terminal_newline),
        optional(commaMultiline($._argument, $)),
        ')',
    ),

    _argument: $ => choice(
      $.named_argument,
      $._arithmetic
    ),
    named_argument: $ => seq(
      field("name", $._any_ident),
      ':',
      field("value", $._arithmetic),
    ),

    closure: $ => seq(
      '->',
      $.closure_variables,
      repeat($._non_terminal_newline),
      field('body', $.block),
    ),

    closure_variables: $ => choice(
      '||',
      seq(
        '|',
        optional(commaMultiline($._closure_variable, $)),
        '|',
      )
    ),

    _closure_variable: $ => choice(
      $.ident,
      '_',
    ),

    abort: $ => prec.left(2, seq(
      'abort',
      optional(field('message', $._expr)),
    )),

    return: $ =>
      prec.left('return',
        seq(
          'return',
          $._expr,
        ),
      ),

    break: _ => 'break',

    comment: $ => token(prec(-10, /#.*/)),

    float: $ => token(
      seq(
        decimal_integer,
        '.',
        optional(fractional),
      ),
    ),

    integer: $ => token(decimal_integer),

    string: $ => seq(
      '"',
      repeat(choice($._string_content, $.string_template)),
      '"',
    ),

    string_template: $ => seq(
      '{{',
      $.ident,
      '}}',
    ),

    _string_content: $ => choice(
      /[^\\"\n\{\}]+/,
      $.escape_sequence,
      /\{ |[^\{]/,
      /\} |[^\}]/,
    ),

    escape_sequence: _ => token.immediate(seq(
      '\\',
      choice(
        /('|"|\\|n|\n|0|r|t|\{|\})/,
        /u\{[0-9a-fA-F]{1,6}\}/,
      ),
    )),

    raw_string: $ => seq(
      's\'',
      repeat($._raw_string_content),
      '\'',
    ),

    _raw_string_content: $ => choice(
      /[^\\']+/,
      $.raw_string_escape_sequence,
      token.immediate(seq(
        '\\',
        /[^']/,
      )),
    ),

    raw_string_escape_sequence: $ => token.immediate(seq('\\', '\'')),

    regex: $ => seq(
      'r\'',
      repeat($._regex_content),
      '\'',
    ),

    _regex_content: $ => choice(
      /[^\\']+/,
      $.regex_escape_sequence,
      token.immediate(seq('\\', /[^']/)),
    ),

    regex_escape_sequence: $ => token.immediate(seq('\\', '\'')),

    boolean: $ => /true|false/,

    null: $ => 'null',

    // Relaxed RFC 3339 as accepted by chrono (which VRL's compiler uses), e.g.
    // t'2021-02-11T10:32:50.553-04:00'. Anything else is a parse error.
    // shortcut: no unpadded numbers or inner spaces, nobody writes those; widen if needed.
    timestamp: _ => token(seq(
      't\'',
      /\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/,
      /[Tt ]/,
      /([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d+)?/,
      /([Zz]|[Uu][Tt][Cc]|[+-]([01]\d|2[0-3]):?[0-5]\d)/,
      '\'',
    )),

    ident: _ => token(/[_a-zA-Z0-9][a-zA-Z0-9_]*/),

    _immediate_dot: _ => prec.left(token.immediate('.')),
  }
});

function commaMultiline(rule, $) {
  return choice(
    seq(rule, repeat($._non_terminal_newline)),
    seq(
      repeat1(seq(
        rule,
        ',',
        repeat($._non_terminal_newline)
      )),
      optional(seq(rule, repeat($._non_terminal_newline))),
    )
  )
}
