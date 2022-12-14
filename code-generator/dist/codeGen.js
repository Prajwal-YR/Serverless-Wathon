"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeGenProgram = void 0;
var ast_1 = require("./ast");
var labelCounter = 0;
function codeGenProgram(typedAst, emptyEnv) {
    var scratchVar = "(local $$last i32)";
    var globals = ["(global $heap (mut i32) (i32.const 4))"];
    var returnType = "";
    var returnExpr = "";
    if (typedAst.stmts.length > 0) {
        var lastExpr = typedAst.stmts[typedAst.stmts.length - 1];
        if (lastExpr.tag === "expr" && !(lastExpr.expr.tag === 'builtin1' && lastExpr.expr.name === 'print')) {
            returnType = "(result i32)";
            returnExpr = "(local.get $$last)";
        }
    }
    typedAst.classdefs.forEach(function (c) {
        var prefix = "".concat(c.name, "$");
        c.methods.forEach(function (m) {
            m.name = prefix + m.name;
            globals = globals.concat(codeGenFun(m, emptyEnv));
        });
        var initvals = [];
        // constructor
        c.fields.forEach(function (f, index) {
            var offset = (index) * 4;
            initvals = __spreadArray(__spreadArray([], initvals, true), [
                " (global.get $heap)",
                " (i32.add  (i32.const ".concat(offset, "))"),
                " ".concat(resolveLiteral(f.init)),
                " i32.store"
            ], false);
        });
        var init_present = emptyEnv.classes.get(c.name).methods.has('__init__');
        globals = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], globals, true), [
            "(func $".concat(c.name, "  (result i32)"),
            " (local $$last i32)"
        ], false), initvals, true), [
            " (global.get $heap)",
            init_present ? " (local.set $$last (global.get $heap)) " : "",
            " (global.set $heap (i32.add (global.get $heap) (i32.const ".concat(c.fields.length * 4, ")))"),
            init_present ? " call $".concat(c.name, "$__init__\n (local.get $$last)") : "",
            " return\n      )"
        ], false);
    });
    typedAst.varinits.forEach(function (v) {
        globals.push("(global $".concat(v.name, " (mut i32) ").concat(resolveLiteral(v.init), ")"));
    });
    typedAst.fundefs.forEach(function (f) {
        globals = globals.concat(codeGenFun(f, emptyEnv));
    });
    var commandGroups = typedAst.stmts.map(function (stmt) { return codeGenStmt(stmt, emptyEnv); });
    var commands = [].concat.apply([scratchVar], commandGroups);
    // console.log("Generated: ", commands.join("\n"));
    var finalWasmCode = "(module\n    (func $print_num (import \"imports\" \"print_num\") (param i32) (result i32))\n    (func $print_bool (import \"imports\" \"print_bool\") (param i32) (result i32))\n    (func $print_none (import \"imports\" \"print_none\") (param i32) (result i32))\n    (func $abs (import \"imports\" \"abs\") (param i32) (result i32))\n    (func $max (import \"imports\" \"max\") (param i32 i32) (result i32))\n    (func $min (import \"imports\" \"min\") (param i32 i32) (result i32))\n    (func $pow (import \"imports\" \"pow\") (param i32 i32) (result i32))\n    (memory (export \"memory\") 1)\n    ".concat(globals.join("\n"), "\n    (func (export \"exported_func\") ").concat(returnType, "\n      ").concat(commands.join("\n"), "\n      ").concat(returnExpr, "\n    )\n  )");
    return finalWasmCode;
}
exports.codeGenProgram = codeGenProgram;
function codeGenFun(fundef, localEnv) {
    // Construct the environment for the function body
    var funEnv = { vars: new Map(), funcs: new Map(), classes: new Map(localEnv.classes), retType: "None" };
    // Construct the code for params and variable declarations in the body
    fundef.inits.forEach(function (init) {
        funEnv.vars.set(init.name, init.type);
    });
    fundef.params.forEach(function (param) {
        funEnv.vars.set(param.name, param.type);
    });
    // Construct the code for params and variable declarations in the body
    var params = fundef.params.map(function (p) { return "(param $".concat(p.name, " i32)"); }).join(" ");
    var varDecls = fundef.inits.map(function (v) {
        return "(local $".concat(v.name, " i32)\n").concat(resolveLiteral(v.init), "\n(local.set $").concat(v.name, ")");
    }).join("\n");
    var stmts = fundef.body.map(function (s) { return codeGenStmt(s, funEnv, false); }).flat();
    var stmtsBody = stmts.join("\n");
    return ["(func $".concat(fundef.name, " ").concat(params, " (result i32)\n    (local $$last i32)\n    ").concat(varDecls, "\n    ").concat(stmtsBody, "\n    (i32.const 0))")];
}
function codeGenStmt(stmt, localEnv, useGlobal) {
    if (useGlobal === void 0) { useGlobal = true; }
    switch (stmt.tag) {
        case "assign":
            var valStmts = codeGenExpr(stmt.value, localEnv);
            if (typeof stmt.lvalue === 'string' && localEnv.vars.has(stmt.lvalue))
                return valStmts.concat(["(local.set $".concat(stmt.lvalue, ")")]);
            if (typeof stmt.lvalue === 'object') {
                var obj = codeGenExpr(stmt.lvalue.obj, localEnv);
                //@ts-ignore
                var classData = localEnv.classes.get(stmt.lvalue.obj.a.class);
                var i = Array.from(classData.fields.keys()).indexOf(stmt.lvalue.name);
                return __spreadArray(__spreadArray(__spreadArray(__spreadArray([], obj, true), ["(i32.add (i32.const ".concat(i * 4, "))")], false), valStmts, true), ["(i32.store)"], false);
                // return valStmts.concat([...lvalue,`i32.store`]);
            }
            if (useGlobal && typeof stmt.lvalue === 'string')
                return valStmts.concat(["(global.set $".concat(stmt.lvalue, ")")]);
            throw new ReferenceError("Cannot assign to variable that is not explicitly declared in this scope: `".concat(stmt.lvalue, "`"));
        case "expr":
            var exprStmts = codeGenExpr(stmt.expr, localEnv);
            return exprStmts.concat(["(local.set $$last)"]);
        case "return":
            var retStmts = codeGenExpr(stmt.ret, localEnv);
            return __spreadArray(__spreadArray([], retStmts, true), ["return"], false);
        case "pass":
            return ['nop'];
        case "if":
            var condStmts = codeGenExpr(stmt.cond, localEnv);
            var bodyStmts = stmt.body.map(function (s) { return codeGenStmt(s, localEnv, useGlobal); }).flat();
            if (stmt.elseBody.length == 0)
                return __spreadArray(__spreadArray(__spreadArray(__spreadArray([], condStmts, true), ["(if\n            (then"], false), bodyStmts, true), [")", ")"], false);
            var elseBodyStmts = stmt.elseBody.map(function (s) { return codeGenStmt(s, localEnv, useGlobal); }).flat();
            return __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], condStmts, true), ["(if", "(then"], false), bodyStmts, true), [")", "(else"], false), elseBodyStmts, true), [")", ")"], false);
        case "while":
            var label = labelCounter;
            labelCounter++;
            var condStmts = codeGenExpr(stmt.cond, localEnv);
            var bodyStmts = stmt.body.map(function (s) { return codeGenStmt(s, localEnv, useGlobal); }).flat();
            return __spreadArray(__spreadArray(__spreadArray(__spreadArray(["(block $block_".concat(label), "(loop $loop_".concat(label)], condStmts, true), ["i32.const 1", "i32.xor", "br_if $block_".concat(label)], false), bodyStmts, true), ["br $loop_".concat(label), ")", ")"], false);
    }
}
function resolveLiteral(literal) {
    switch (literal.tag) {
        case "num":
            return "(i32.const ".concat(literal.value, ")");
        case "bool":
            return "(i32.const ".concat(Number(literal.value), ")");
        case "none":
            return "(i32.const 0)";
    }
}
function codeGenExpr(expr, localEnv) {
    switch (expr.tag) {
        case "builtin1":
            var argStmts = codeGenExpr(expr.arg, localEnv);
            var funName = expr.name;
            if (funName === 'print') {
                switch (expr.arg.a) {
                    case "int":
                        funName = 'print_num';
                        break;
                    case "bool":
                        funName = 'print_bool';
                        break;
                    case "None":
                        funName = 'print_none';
                        break;
                }
            }
            return argStmts.concat(["(call $".concat(funName, ")")]);
        case "builtin2":
            var arg1Stmts = codeGenExpr(expr.arg1, localEnv);
            var arg2Stmts = codeGenExpr(expr.arg2, localEnv);
            return __spreadArray(__spreadArray(__spreadArray([], arg1Stmts, true), arg2Stmts, true), ["(call $".concat(expr.name, ")")], false);
        case "literal":
            return [resolveLiteral(expr.literal)];
        case "id":
            if (localEnv.vars.has(expr.name))
                return ["(local.get $".concat(expr.name, ")")];
            return ["(global.get $".concat(expr.name, ")")];
        case "binexpr":
            var leftexpr = codeGenExpr(expr.left, localEnv);
            var rightexpr = codeGenExpr(expr.right, localEnv);
            var op = codeGenBinOp(expr.op);
            return __spreadArray(__spreadArray(__spreadArray([], leftexpr, true), rightexpr, true), [op], false);
        case "uniexpr":
            var rightexpr = codeGenExpr(expr.right, localEnv);
            switch (expr.op) {
                case ast_1.UniOp.Neg:
                    return __spreadArray(__spreadArray(["(i32.const 0)"], rightexpr, true), ["(i32.sub)"], false);
                case ast_1.UniOp.Not:
                    return __spreadArray(__spreadArray(["(i32.const 1)"], rightexpr, true), ["(i32.xor)"], false);
            }
            break;
        case "call":
            var argsStmts = expr.args.map(function (arg) { return codeGenExpr(arg, localEnv); }).flat();
            if (expr.obj) {
                var obj_1 = codeGenExpr(expr.obj, localEnv);
                return __spreadArray(__spreadArray(__spreadArray(__spreadArray([], obj_1, true), ["(tee_local $$last)", "(i32.eqz)", "(if\n          (then  (i32.const -1) (i32.load) local.set $$last))", "(get_local $$last)"], false), argsStmts, true), [
                    //@ts-ignore
                    "(call $".concat(expr.obj.a.class, "$").concat(expr.name, ")")], false);
            }
            return __spreadArray(__spreadArray([], argsStmts, true), ["(call $".concat(expr.name, ")")], false);
        case "getattr":
            var obj = codeGenExpr(expr.obj, localEnv);
            //@ts-ignore
            var classData = localEnv.classes.get(expr.obj.a.class);
            var i = Array.from(classData.fields.keys()).indexOf(expr.name);
            return __spreadArray(__spreadArray([], obj, true), ["(tee_local $$last)", "(i32.eqz)", "(if\n        (then  (i32.const -1) (i32.load) local.set $$last))", "(get_local $$last)", "(i32.add (i32.const ".concat(i * 4, "))"), "(i32.load)"], false);
    }
}
function codeGenBinOp(op) {
    switch (op) {
        case ast_1.BinOp.Add:
            return "(i32.add)";
        case ast_1.BinOp.Sub:
            return "(i32.sub)";
        case ast_1.BinOp.Mul:
            return "(i32.mul)";
        case ast_1.BinOp.Div:
            return "(i32.div_s)";
        case ast_1.BinOp.Mod:
            return "(i32.rem_s)";
        case ast_1.BinOp.Lesser:
            return "(i32.lt_s)";
        case ast_1.BinOp.LessEq:
            return "(i32.le_s)";
        case ast_1.BinOp.Greater:
            return "(i32.gt_s)";
        case ast_1.BinOp.GreatEq:
            return "(i32.ge_s)";
        case ast_1.BinOp.Equals:
        case ast_1.BinOp.Is:
            return "(i32.eq)";
        case ast_1.BinOp.NotEquals:
            return "(i32.ne)";
    }
}
//# sourceMappingURL=codeGen.js.map