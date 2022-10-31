"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
var lezer_python_1 = require("lezer-python");
var ast_1 = require("./ast");
function traverseLiteral(c, s) {
    switch (c.type.name) {
        case "Number":
            return { tag: "num", value: Number(s.substring(c.from, c.to)) };
        case "Boolean":
            if (s.substring(c.from, c.to) == "True")
                return { tag: "bool", value: true };
            if (s.substring(c.from, c.to) == "False")
                return { tag: "bool", value: false };
            throw new Error("Invalid value for boolean type");
        case "None":
            return { tag: "none" };
        default:
            throw new Error("ParseError: Expected a literal");
    }
}
function isVarDef(c, s) {
    if (c.type.name !== "AssignStatement")
        return false;
    c.firstChild();
    c.nextSibling();
    var name = c.type.name;
    c.parent();
    // @ts-ignore
    return name === "TypeDef";
}
function isFunDef(c, s) {
    return c.type.name === "FunctionDefinition";
}
function isClassDef(c, s) {
    return c.type.name === "ClassDefinition";
}
function traverseVarDef(c, s) {
    c.firstChild();
    var _a = traverseTypedVar(c, s), name = _a.name, type = _a.type;
    c.nextSibling(); // go to =
    c.nextSibling(); // go to liiteral
    var init = traverseLiteral(c, s);
    c.parent();
    return { name: name, type: type, init: init };
}
function traverseParameters(c, s) {
    c.firstChild(); // Focuses on open paren
    var parameters = [];
    c.nextSibling(); // Focuses on a VariableName
    do {
        if (c.type.name === ")")
            break;
        parameters.push(traverseTypedVar(c, s));
        c.nextSibling(); // Focuses on a VariableName
    } while (c.nextSibling());
    c.parent(); // Pop to ParamList
    return parameters;
}
function traverseFunDef(c, s) {
    c.firstChild(); // Focus on def
    c.nextSibling(); // Focus on name of function
    var name = s.substring(c.from, c.to);
    c.nextSibling(); // Focus on ParamList
    var params = traverseParameters(c, s);
    c.nextSibling(); // Focus on Body or TypeDef
    var ret = "None";
    if (c.type.name === "TypeDef") {
        c.firstChild(); // go to ->
        c.nextSibling(); // go to return type
        ret = traverseType(c, s);
        c.parent(); // pop
    }
    c.nextSibling(); // go to body
    c.firstChild(); // go into body
    var body = [];
    var inits = [];
    while (c.nextSibling()) {
        if (isVarDef(c, s)) {
            inits.push(traverseVarDef(c, s));
        }
        else if (isFunDef(c, s)) {
            throw new Error("ParseError: Nested Functions not supported");
        }
        else
            body.push(traverseStmt(c, s));
    }
    c.parent(); // Pop to Body
    c.parent(); // Pop to FunctionDefinition
    if (body.length === 0) {
        throw new Error("ParseError: Empty function body for " + name);
    }
    if (ret == "None" && body[body.length - 1].tag !== "return") {
        body.push({
            tag: "return",
            ret: { tag: "literal", literal: { tag: "none" } },
        });
    }
    return {
        name: name,
        params: params,
        inits: inits,
        body: body,
        ret: ret,
    };
}
function traverseClassDef(c, s) {
    c.firstChild(); //go to class
    c.nextSibling(); //go to name
    var name = s.substring(c.from, c.to);
    c.nextSibling(); //go to ArgList
    if (c.type.name === "ArgList") {
        var args = [];
        c.firstChild(); // go into arglist
        while (c.nextSibling()) {
            // find single argument in arglist
            //@ts-ignore
            if (c.type.name === ")")
                break;
            args.push(s.substring(c.from, c.to));
            c.nextSibling();
        }
        c.parent(); // pop arglist
        if (args.length > 1 || args[0] !== "object")
            throw new Error("Base class can only be `object`");
        c.nextSibling(); // go to body
    }
    c.firstChild(); //go into body
    var fields = [];
    var methods = [];
    while (c.nextSibling()) {
        if (isVarDef(c, s)) {
            fields.push(traverseVarDef(c, s));
        }
        else if (isFunDef(c, s)) {
            methods.push(traverseFunDef(c, s));
        }
        else
            throw new Error("ParseError: Illegal statement in class definition");
    }
    c.parent();
    c.parent();
    return { name: name, fields: fields, methods: methods };
}
function traverseType(c, s) {
    switch (s.substring(c.from, c.to)) {
        case "int":
            return "int";
        case "bool":
            return "bool";
        case "None":
            return "None";
        default:
            return { tag: "object", class: s.substring(c.from, c.to) };
    }
}
function traverseTypedVar(c, s) {
    var name = s.substring(c.from, c.to);
    c.nextSibling(); //go to TypeDef
    if (c.type.name !== "TypeDef") {
        throw new Error("Missed type annotation for " + name);
    }
    c.firstChild(); //go to :
    c.nextSibling(); //go to type
    var type = traverseType(c, s);
    c.parent(); //pop TypeDef
    return { name: name, type: type };
}
function traverseExpr(c, s) {
    switch (c.type.name) {
        case "Number":
        case "Boolean":
        case "None":
            return {
                tag: "literal",
                literal: traverseLiteral(c, s),
            };
        case "VariableName":
            return {
                tag: "id",
                name: s.substring(c.from, c.to),
            };
        case "CallExpression":
            c.firstChild();
            var callName;
            var callObj;
            //@ts-ignore
            if (c.type.name === "MemberExpression") {
                var out = traverseExpr(c, s);
                //@ts-ignore
                callName = out.name;
                callObj = out.obj;
            }
            else {
                callName = s.substring(c.from, c.to);
            }
            c.nextSibling(); // go to arglist
            var args = travesreArgs(c, s);
            c.parent(); // pop CallExpression
            if (callName === "print" || callName === "abs") {
                if (args.length !== 1)
                    throw new Error("ParseError: Incorrect number of args for builtin1");
                return {
                    tag: "builtin1",
                    name: callName,
                    arg: args[0],
                };
            }
            else if (callName === "max" ||
                callName === "min" ||
                callName === "pow") {
                if (args.length !== 2)
                    throw new Error("ParseError: Incorrect number of args for builtin1");
                return {
                    tag: "builtin2",
                    name: callName,
                    arg1: args[0],
                    arg2: args[1],
                };
            }
            return { tag: "call", name: callName, args: args, obj: callObj };
        case "UnaryExpression":
            c.firstChild();
            var uniop;
            switch (s.substring(c.from, c.to)) {
                case "not":
                    uniop = ast_1.UniOp.Not;
                    break;
                case "-":
                    uniop = ast_1.UniOp.Neg;
                    break;
                case "+":
                    c.nextSibling();
                    var ret = traverseExpr(c, s);
                    c.parent();
                    return ret;
                default:
                    throw new Error("ParseError: Unknown unary operator");
            }
            c.nextSibling();
            var right = traverseExpr(c, s);
            c.parent();
            return { tag: "uniexpr", op: uniop, right: right };
        case "BinaryExpression":
            c.firstChild();
            var left = traverseExpr(c, s);
            c.nextSibling();
            var op = traverseBinOp(c, s);
            c.nextSibling();
            var right = traverseExpr(c, s);
            c.parent(); //pop
            return { tag: "binexpr", op: op, left: left, right: right };
        case "ParenthesizedExpression":
            c.firstChild();
            c.nextSibling();
            var exp = traverseExpr(c, s);
            c.parent();
            return exp;
        case "MemberExpression":
            c.firstChild(); //go to object name
            var obj = traverseExpr(c, s);
            c.nextSibling(); //go to .
            c.nextSibling(); //go to name
            var name_1 = s.substring(c.from, c.to);
            c.parent();
            return { tag: "getattr", obj: obj, name: name_1 };
        default:
            throw new Error("ParseError: Could not parse expr at " +
                c.from +
                " " +
                c.to +
                ": " +
                s.substring(c.from, c.to));
    }
}
function travesreArgs(c, s) {
    var args = [];
    c.firstChild(); // go into arglist
    while (c.nextSibling()) {
        // find single argument in arglist
        if (c.type.name === ")")
            break;
        args.push(traverseExpr(c, s));
        c.nextSibling();
    }
    c.parent(); // pop arglist
    return args;
}
function traverseBinOp(c, s) {
    switch (s.substring(c.from, c.to)) {
        case "+":
            return ast_1.BinOp.Add;
        case "-":
            return ast_1.BinOp.Sub;
        case "*":
            return ast_1.BinOp.Mul;
        case "//":
            return ast_1.BinOp.Div;
        case "%":
            return ast_1.BinOp.Mod;
        case "<":
            return ast_1.BinOp.Lesser;
        case "<=":
            return ast_1.BinOp.LessEq;
        case ">":
            return ast_1.BinOp.Greater;
        case ">=":
            return ast_1.BinOp.GreatEq;
        case "==":
            return ast_1.BinOp.Equals;
        case "!=":
            return ast_1.BinOp.NotEquals;
        case "is":
            return ast_1.BinOp.Is;
        default:
            throw new Error("ParseError: Unknown binary operator");
    }
}
function set(obj, path, value) {
    var schema = obj;
    var pList = path.split(".");
    var len = pList.length;
    for (var i = 0; i < len - 1; i++) {
        var elem = pList[i];
        if (!schema[elem])
            schema[elem] = {};
        schema = schema[elem];
    }
    schema[pList[len - 1]] = value;
}
function traverseIf(c, s) {
    c.firstChild(); //go to if
    c.nextSibling(); //go to condition
    var cond = traverseExpr(c, s);
    c.nextSibling(); //go to body
    c.firstChild(); //step into body
    var body = [];
    while (c.nextSibling()) {
        if (isVarDef(c, s) || isFunDef(c, s)) {
            throw new Error("ParseError: Variable and function definitions not allowed here");
        }
        body.push(traverseStmt(c, s));
    }
    c.parent(); // pop if body
    var stmt = {
        tag: "if",
        cond: cond,
        body: body,
        elseBody: new Array(),
    };
    var elif = {};
    var out = c.nextSibling();
    if (out && c.type.name === "elif") {
        c.nextSibling(); //go to condition
        var cond_1 = traverseExpr(c, s);
        c.nextSibling(); //go to body
        c.firstChild(); //step into body
        var body_1 = [];
        while (c.nextSibling()) {
            if (isVarDef(c, s) || isFunDef(c, s)) {
                throw new Error("ParseError: Variable and function definitions not allowed here");
            }
            body_1.push(traverseStmt(c, s));
        }
        c.parent(); // pop elif body
        stmt.elseBody.push({
            tag: "if",
            cond: cond_1,
            body: body_1,
            elseBody: new Array(),
        });
        out = c.nextSibling();
    }
    if (out && c.type.name === "else") {
        c.nextSibling(); //go to body
        c.firstChild(); //step into body
        var elseBody = [];
        while (c.nextSibling()) {
            if (isVarDef(c, s) || isFunDef(c, s)) {
                throw new Error("ParseError: Variable and function definitions not allowed here");
            }
            elseBody.push(traverseStmt(c, s));
        }
        c.parent(); //pop else body
        if (stmt.elseBody.length == 0)
            stmt.elseBody = elseBody;
        // @ts-ignore
        else
            stmt.elseBody[0].elseBody = elseBody;
    }
    c.parent();
    return stmt;
}
function traverseStmt(c, s) {
    switch (c.node.type.name) {
        case "AssignStatement":
            c.firstChild(); // go to name
            var lvalue;
            if (c.type.name === "MemberExpression") {
                //@ts-ignore
                lvalue = traverseExpr(c, s);
            }
            else {
                lvalue = s.substring(c.from, c.to);
            }
            c.nextSibling(); // go to equals
            // if(s.substring(c.from, c.to) == "TypeDef")
            c.nextSibling(); // go to value
            var value = traverseExpr(c, s);
            c.parent();
            return {
                tag: "assign",
                lvalue: lvalue,
                value: value,
            };
        case "ExpressionStatement":
            c.firstChild();
            var expr = traverseExpr(c, s);
            c.parent(); // pop going into stmt
            return { tag: "expr", expr: expr };
        case "ReturnStatement":
            c.firstChild(); //go to return
            var ret = { tag: "literal", literal: { tag: "none" } }; //default return None
            if (c.nextSibling())
                ret = traverseExpr(c, s);
            c.parent();
            return { tag: "return", ret: ret };
        case "PassStatement":
            return { tag: "pass" };
        case "IfStatement":
            return traverseIf(c, s);
        case "WhileStatement":
            c.firstChild(); // go to while
            c.nextSibling(); // go to condn
            var cond = traverseExpr(c, s);
            c.nextSibling(); //go to body
            c.firstChild(); //go to :
            var body = [];
            while (c.nextSibling()) {
                if (isVarDef(c, s) || isFunDef(c, s)) {
                    throw new Error("ParseError: Variable and function definitions not allowed here");
                }
                body.push(traverseStmt(c, s));
            }
            c.parent(); // Pop body
            c.parent(); // Pop while
            return { tag: "while", cond: cond, body: body };
        default:
            throw new Error("ParseError: Could not parse stmt at " +
                c.node.from +
                " " +
                c.node.to +
                ": " +
                s.substring(c.from, c.to));
    }
}
function traverse(c, s) {
    switch (c.node.type.name) {
        case "Script":
            var stmts = [];
            var varinits = [];
            var fundefs = [];
            var classdefs = [];
            c.firstChild();
            while (true) {
                if (isVarDef(c, s)) {
                    varinits.push(traverseVarDef(c, s));
                }
                else if (isFunDef(c, s)) {
                    fundefs.push(traverseFunDef(c, s));
                }
                else if (isClassDef(c, s)) {
                    classdefs.push(traverseClassDef(c, s));
                }
                else
                    break;
                if (c.nextSibling()) {
                    continue;
                }
                else {
                    return { varinits: varinits, fundefs: fundefs, classdefs: classdefs, stmts: stmts };
                }
            }
            do {
                if (isVarDef(c, s) || isFunDef(c, s)) {
                    throw new Error("ParseError: Variable and function definitions not allowed here");
                }
                stmts.push(traverseStmt(c, s));
            } while (c.nextSibling());
            console.log("traversed " + stmts.length + " statements ", stmts, "stopped at ", c.node);
            return { varinits: varinits, fundefs: fundefs, classdefs: classdefs, stmts: stmts };
        default:
            throw new Error("ParseError: Could not parse program at " +
                c.node.from +
                " " +
                c.node.to);
    }
}
function parse(source) {
    var t = lezer_python_1.parser.parse(source);
    return traverse(t.cursor(), source);
}
exports.parse = parse;
//# sourceMappingURL=parser.js.map