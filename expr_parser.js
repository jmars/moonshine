// A tiny C struct definition parser
// despair, all ye who enter here

var Lexer = (function(){
	"use strict";

	var symbols =
	[
		/^(typedef)[\s\n]*/, // typedef keyword
		/^(struct)[\s\n]*/, // struct keyword
		/^([\w_]+\s[\w_]+)[\s\n]*/, // type pair
		/^([\w_]+)[\s\n]*/i, // ident
		/^({)[\s\n]*/, // open block
		/^(})[\s\n]*/, // close block
		/^(,)[\s\n]*/, // comma
		/^(;)[\s\n]*/ // terminator
	]

	function new_symbol(type, value) {
		return {
			type: type,
			value: value
		}
	}

	function lex_string(str) {
		var i = 0, j, regexp, substr, tokens = [], match;
		outer:while (i < str.length) {
			substr = str.slice(i);
			for (j = 0; j < symbols.length; j++) {
				regexp = symbols[j];
				if (regexp.test(substr)) {
					match = substr.match(regexp);
					tokens.push(new_symbol(j, match[1]));
					i = i + match[0].length;
					continue outer;
				}
			}
		}
		return tokens;
	}

	return {
		lex: lex_string
	}
})()

var Parser = (function(Lexer){
	"use strict";

	function object(o) {
		function F() {};
		F.prototype = o;
		return new F();
	}

	var symbols = [
		{// typedef
			lbp: 0,
			nud: function(expr){
				this.first = expr();
				this.second = expr();
				this.arity = 'unary';
				return this
			}
		},
		{// struct
			lbp: 0,
			nud: function(expr){
				this.first = expr();
				this.second 
				this.arity = 'unary';
				return this
			}
		},
		{// type pair
			lbp: 0,
			nud: function (expr) {
				return this
			}
		},
		{// ident
			lbp: 0,
			nud: function(expr){
				return this
			}
		},
		{// open block
			lbp: 0,
			nud: function(expr){
				this.first = expr();
				return this;
			}
		},
		{// close block
			lbp: 0,
			nud: function(expr){
				return this
			}
		},
		{// comma
			lbp: 0,
			led: function(expr, left){
				this.first = left;
				this.second = expr(0);
				this.arity = 'binary';
				return this
			},
			nud: function(expr) {
				return this
			}
		},
		{// terminator
			lbp: 0,
			nud: function(expr){
				return this
			}
		}
	];

	symbols = (function(symbols){
		for (var i = symbols.length-1; i >= 0; i--) {
			var symbol = symbols[i];
			symbol.toJSON = function(){
				return {
					type: this.type,
					value: this.value,
					lbp: this.lbp,
					arity: this.arity,
					first: this.first,
					second: this.second
				}
			}
		}
		return symbols
	})(symbols)

	function sequence(tokens) {
		var i = 0;
		var self = {
			next: function advance() {
				if (self.done) return {value:'END', nud:function(){return this}};
				var
					node = object(tokens[i++]),
					behaviour = symbols[node.type];
				node.lbp = behaviour.lbp;
				node.nud = behaviour.nud;
				node.led = behaviour.led;
				node.toJSON = behaviour.toJSON;
				if (i === tokens.length) self.done = true;
				return node
			},
			done: false
		}
		return self
	}

	function expression(tok, advance) {
		var token = tok;
		return function expr(rbp){
			if (rbp === null) rbp = 0;
			var left, t = token;
			token = advance();
			left = t.nud(expr);
			while (rbp < token.lbp) {
				t = token;
				advance();
				left = t.led(expr, left);
			}
			return left;
		}
	}

	function parse_str(str){
		var tokens = sequence(Lexer.lex(str));
		var token = tokens.next();
		var parser = expression(token, tokens.next);
		return parser(0);
	}

	return {
		parse: parse_str
	}
})(Lexer)

var test = 'struct { int a; }'

console.log(JSON.stringify(Parser.parse(test), null, '  '));
