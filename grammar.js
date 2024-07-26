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
      // 'unary',
      'not',
      'binary_factor',
      'binary_add',
      'merge',
      'binary_comparison',
      'binary_equality',
      'logical_and',
      'logical_or',
      'error_coalesce',
    ],
    [
      'assign',
    ],
  ],

  word: $ => $.ident,

  rules: {
    program: $ => repeat(seq($.expr, $._end_of_expression)),

    _root_exprs: $ => seq(
      field('exprs_1', $.expr),
      optional(
        seq(
          repeat(seq($.expr, $._end_of_expression)),  // Tree-sitter does not support syntactic
                                                      // rules that match the empty string unless
                                                      // they are used only as the grammar's start
                                                      // rule.
          seq(
            repeat1(prec.left(seq($.expr, $._end_of_expression))),
            $.expr
          ),
        )
      ),
    ),

    expr: $ => choice(
      $.if_statement,
      $.abort,
      $.return,
      $.assignment_expr,
    ),

    arithmetic: $ => choice(
      ...[
        ['??', 'error_coalesce'],
        ['||', 'logical_or'],
        ['&&', 'logical_and'],

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
        ['!', 'not'],
        ['term', ''],
      ].map(([operator, precedence]) => {
        if (operator === 'term') {
          return $._term
        } else
        if (operator === '!') {
          return prec.left(precedence, seq(
            operator,
            field('right', $.arithmetic),
          ))
        } else {
          return prec.left(
            precedence, seq(
              field('left', $.arithmetic),
              field('operator', operator),
              field('right', $.arithmetic),
            )
          )
        }
      })),

    _term: $ => choice(
      $._literal,
      // $.container,
      $.query,
      // $.function_call,
      $.ident,
    ),

    _literal: $ => choice(
      $.string,
      // $.raw_string,
      $.integer,
      $.float,
      $.boolean,
      $.null,
      // $.regex,
      $.timestamp,
    ),

    // _container: $ => choice(
    //   $.group,
    //   $.block,
    //   $.array,
    //   $.object,
    // ),

    if_statement: $ => seq(
      'if',
      field('condition', $.predicate),
      repeat($._not_terminal_newline),
      $.block,

      repeat(seq(
        'else',
        repeat($._not_terminal_newline),
        'if',
        field('condition', $.predicate),
        repeat($._not_terminal_newline),
        $.block,
      )),

      optional(seq('else', repeat($._not_terminal_newline), $.block)),
    ),

    predicate: $ => choice(
      $.arithmetic,
      seq(
      '(',
        repeat($._not_terminal_newline),
        repeat1(seq(
          $.assignment,
          repeat1(choice($._not_terminal_newline, ';')),
        )),
        optional($.assignment),
        ')',
      ),
    ),

    assignment_expr: $ => choice(
      field("bar1", $.assignment),
      field("bar2", $.arithmetic),
    ),

    assignment: $ => choice(
      $.assign_single,
      $._assign_infallible,
    ),

    assign_target: $ => choice(
      '_',
      $.query,
      $.ident,
    ),

    assign_operator: $ => choice(
      '=',
      '|=',
    ),

    assign_single: $ => seq(
      $.assign_target,
      $.assign_operator,
      repeat($._not_terminal_newline),
      $.expr,
    ),

    _assign_infallible: $ => seq(
      $.assign_target, // ok target
      ',',
      $.assign_target, // err target
      $.assign_operator,
      repeat($._not_terminal_newline),
      $.expr,
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
      $.internal,
      $.external_event,
      $.external_metadata,
      // field('function_call', $.function_call),
      // $.container, // array or object
      $.event,
      $.metadata,
      // $.query_target,
      // prec.left(2, seq($.query_target, $.path)),
    ),

    internal: $ => seq(
      $._immediate_ident,
      $.path_begin_with_dot,
    ),

    _immediate_dot: _ => prec.left(token.immediate('.')),
    _immediate_percent: _ => prec.left(token.immediate('%')),

    external_event: $ => prec.left(2, seq(
      // $._immediate_dot,
      '.',
      $.path_begin_without_dot,
    )),

    external_metadata: $ => prec.left(2, seq(
      '%',
      $.path_begin_without_dot,
    )),

    event: $ => '.',
    metadata: $ => '%',

    path_begin_with_dot: $ => prec.left(seq(
      choice(
        field('field', seq($._immediate_dot, $.field)),
        field('index', seq('[', $.integer, ']')),
      ),
      repeat($.path_segment),
    )),

    path_begin_without_dot: $ => prec.left(seq(
      choice(
        field('field', $.field),
        field('index', seq('[', $.integer, ']')),
      ),
      repeat($.path_segment),
    )),

    path_segment: $ => choice(
      field('field', seq($._immediate_dot, $.field)),
      field('index', seq('[', $.integer, ']')),
    ),

    field: $ => choice(
      $._any_ident,
      // $._path_field,  // TODO: Implement
      $.string,
    ),

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
    ),

    block: $ => seq(
      '{',
      repeat($._not_terminal_newline),
      $._exprs,
      '}',
    ),

    _exprs: $ => choice(
      $.expr,
      seq(
          repeat1(seq($.expr, $._end_of_expression)),
          optional($.expr),
      ),
    ),

    _not_terminal_newline: $ => '\n',

    _end_of_expression: $ =>
      choice(
        repeat1('\n'),
        seq(';', repeat('\n')),
      ),

    abort: $ => prec.left(2, seq(
      'abort',
      optional(seq('abort', field('message', $.expr))),
    )),

    return: $ =>
      prec.left('return',
        seq(
          'return',
          $.expr,
        ),
      ),

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
      repeat($._string_content),
      '"',
    ),

    _string_content: $ =>
      choice(
        /[^\\"\n]+/,
        $.escape_sequence,
      ),

    escape_sequence: _ => token.immediate(seq(
      '\\',
      /("|\\|\n|0|r|t|\{)/,
    )),

    boolean: $ => /true|false/,

    null: $ => 'null',

    timestamp: $ => seq(
      't',
      '\'',
      repeat($._timestamp_content),
      '\'',
    ),

    _timestamp_content: $ => choice(
      token.immediate(prec(1, /[^\\'\n]+/)),
      token.immediate(seq(
        '\\',
        /('|\\)/,
      )),
    ),

    ident: _ => token(/[a-zA-Z0-9][a-zA-Z0-9_]*/),
    _immediate_ident: _ => token.immediate(/[a-zA-Z0-9][a-zA-Z0-9_]*/),
  }
});
