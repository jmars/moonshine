// A tiny C struct definition parser
// despair, all ye who enter here

var Lexer = (function(){
	"use strict";

	var symbols =
	[
		/^(typedef)[\s\n]*/, // typedef keyword
		/^(struct)[\s\n]*/, // struct keyword
		/^([\w_]+)[\s\n]*/i, // ident
		/^({)[\s\n]*/, // open block
		/^(})[\s\n]*/, // close block
		/^(,)[\s\n]*/, // comma
		/^(;)[\s\n]*/, // terminator
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
			nud: function(){
				this.first = expr(70);
				this.second = expr(70);
				this.arity = 'unary';
				return this
			}
		},
		{// struct
			lbp: 0,
			nud: function(){
				this.first = expr(70);
				this.arity = 'unary';
				return this
			}
		},
		{// ident
			lbp: 0,
			nud: function(){
				return this
			}
		},
		{// open block
			lbp: 0,
			nud: function(){
				return this
			}
		},
		{// close block
			lbp: 0,
			nud: function(){
				return this
			}
		},
		{// comma
			lbp: 80,
			led: function(left){
				this.left = left;
				this.right = expr(this.lbp);
				this.arity = 'binary';
				return this
			}
		},
		{// terminator
			lbp: 0,
			nud: function(){
				return this
			}
		}
	]

	function sequence(tokens) {
		var i = 0;
		return {
			next: function advance() {
				var
					node = object(tokens[i++]),
					behaviour = symbols[node.type];
				node.lbp = behaviour.lbp;
				node.nud = behaviour.nud;
				node.led = behaviour.led;
				if (i === tokens.length) this.done = true;
				return node
			},
			done: false
		}
	}

	function expression(token, advance) {
		return function expr(rbp){
			var left, t = token;
			advance();
			left = t.nud();
			while (rbp < token.lbp) {
				t = token;
				advance();
				left = t.led(left);
			}
			return left;
		}
	}

	function parse_str(str){

	}

	return {
		parse: parse_str
	}
})(Lexer)

var test = 'typedef struct { int a; } test_s'

console.log(Lexer.lex(test))
