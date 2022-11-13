"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeCheckProgram = void 0;
var ast_1 = require("./ast");
function typeCheckProgram(prog, env) {
    var typedClassDefs = [];
    prog.classdefs.forEach(function (classdef) {
        // add class to env
        env.classes.set(classdef.name, null);
    });
    prog.classdefs.forEach(function (classdef) {
        typedClassDefs.push(typeCheckClassDef(classdef, env));
    });
    var typedInits = typeCheckVarInits(prog.varinits, env.vars, env.classes);
    var typedFunDefs = [];
    prog.fundefs.forEach(function (fundef) {
        // add func to env
        env.funcs.set(fundef.name, [
            fundef.params.map(function (param) { return param.type; }),
            fundef.ret,
        ]);
    });
    prog.fundefs.forEach(function (fundef) {
        typedFunDefs.push(typeCheckFunDef(fundef, env));
    });
    var typedStmts = typeCheckStmts(prog.stmts, env);
    return {
        varinits: typedInits,
        fundefs: typedFunDefs,
        classdefs: typedClassDefs,
        stmts: typedStmts,
        a: env.retType,
    };
}
exports.typeCheckProgram = typeCheckProgram;
function typeCheckVarInits(inits, vars, classes) {
    var typedInits = [];
    inits.forEach(function (init) {
        var initType = typeCheckLiteral(init.init);
        if (!checkAssign(init.type, initType.a, classes)) {
            throw new TypeError("Expected type `".concat(init.type, "`; got type `").concat(initType.a, "`"));
        }
        if (vars.has(init.name)) {
            throw new TypeError("Duplicate declaration for `".concat(init.name, "`"));
        }
        vars.set(init.name, init.type);
        typedInits.push(__assign(__assign({}, init), { a: init.type, init: initType }));
    });
    return typedInits;
}
function typeCheckFunDef(fundef, env) {
    // add params to env
    var localEnv = __assign(__assign({}, env), { vars: new Map(env.vars), funcs: new Map(env.funcs), classes: new Map(env.classes) });
    fundef.params.forEach(function (param) {
        localEnv.vars.set(param.name, param.type);
    });
    var typedParams = typeCheckParams(fundef.params);
    // check inits and add to env
    var typedInits = typeCheckVarInits(fundef.inits, localEnv.vars, localEnv.classes);
    localEnv.retType = fundef.ret;
    // check body
    var typedStmts = typeCheckStmts(fundef.body, localEnv);
    // check return
    var lastStmt = typedStmts[typedStmts.length - 1];
    if (lastStmt.tag !== "return") {
        if (lastStmt.tag === "pass") {
        }
        else if (lastStmt.tag !== "if" ||
            lastStmt.elseBody.length == 0 ||
            lastStmt.elseBody[lastStmt.elseBody.length - 1].tag !== "return") {
            throw new TypeError("All paths must have return for function ".concat(fundef.name));
        }
    }
    return __assign(__assign({}, fundef), { params: typedParams, inits: typedInits, body: typedStmts });
}
function typeCheckClassDef(classdef, env) {
    // add params to env
    var classEnv = { fields: new Map(), methods: new Map() };
    var typedFields = typeCheckVarInits(classdef.fields, classEnv.fields, env.classes);
    var typedMethods = [];
    classdef.methods.forEach(function (method) {
        if (method.name === "__init__") {
            if (method.params.length !== 1 || method.ret !== "None")
                throw new TypeError("Method overriden with different type signature: __init__");
            if (typeof method.params[0].type !== "object" ||
                method.params[0].type.class !== classdef.name) {
                throw new TypeError("First parameter of the following method must be of the enclosing class: __init__");
            }
        }
        classEnv.methods.set(method.name, [
            method.params.map(function (param) { return param.type; }),
            method.ret,
        ]);
    });
    env.classes.set(classdef.name, classEnv);
    classdef.methods.forEach(function (fundef) {
        typedMethods.push(typeCheckFunDef(fundef, env));
    });
    return __assign(__assign({}, classdef), { fields: typedFields, methods: typedMethods });
}
function typeCheckParams(params) {
    return params.map(function (param) {
        return __assign(__assign({}, param), { a: param.type });
    });
}
function checkAssign(left, right, classes) {
    if (left === right) {
        return true;
    }
    if (typeof left === "object" && left.tag === "object") {
        if (!classes.has(left.class)) {
            throw new TypeError("There is no class named: ".concat(left.class));
        }
        return (right === "None" ||
            (typeof right === "object" && right.class === left.class));
    }
    return false;
}
function typeCheckStmts(stmts, env) {
    var typedStmts = [];
    stmts.forEach(function (stmt) {
        switch (stmt.tag) {
            case "assign":
                if (typeof stmt.lvalue === "string") {
                    if (!env.vars.has(stmt.lvalue)) {
                        throw new ReferenceError("Not a variable `".concat(stmt.lvalue, "`"));
                    }
                    var typedValue = typeCheckExpr(stmt.value, env);
                    var expectedType = env.vars.get(stmt.lvalue);
                    if (!checkAssign(expectedType, typedValue.a, env.classes)) {
                        throw new TypeError("Expected type `".concat(expectedType, "`; got type `").concat(typedValue.a, "`"));
                    }
                    typedStmts.push(__assign(__assign({}, stmt), { value: typedValue, a: "None" }));
                }
                else {
                    var typedValue = typeCheckExpr(stmt.value, env);
                    //@ts-ignore
                    var expectedType = typeCheckExpr(stmt.lvalue, env);
                    if (!checkAssign(expectedType.a, typedValue.a, env.classes)) {
                        throw new TypeError("Expected type `".concat(expectedType.a, "`; got type `").concat(typedValue.a, "`"));
                    }
                    typedStmts.push(__assign(__assign({}, stmt), { lvalue: expectedType, value: typedValue, a: "None" }));
                }
                break;
            case "return":
                var typedRet = typeCheckExpr(stmt.ret, env);
                if (!checkAssign(env.retType, typedRet.a, env.classes)) {
                    throw new TypeError("Expected type `".concat(env.retType, "`; got type `").concat(typedRet.a, "`"));
                }
                typedStmts.push(__assign(__assign({}, stmt), { ret: typedRet, a: "None" }));
                break;
            case "pass":
                typedStmts.push(__assign(__assign({}, stmt), { a: "None" }));
                break;
            case "if":
                var typedCond = typeCheckExpr(stmt.cond, env);
                if (typedCond.a !== "bool")
                    throw new TypeError("Condition expression cannot be of type `".concat(typedCond.a, "`"));
                var typedBody = typeCheckStmts(stmt.body, env);
                var typedElseBody = typeCheckStmts(stmt.elseBody, env);
                typedStmts.push(__assign(__assign({}, stmt), { cond: typedCond, body: typedBody, elseBody: typedElseBody, a: "None" }));
                break;
            case "while":
                var typedWhileCond = typeCheckExpr(stmt.cond, env);
                if (typedWhileCond.a !== "bool")
                    throw new TypeError("Condition expression cannot be of type `".concat(typedWhileCond.a, "`"));
                var typedWhileBody = typeCheckStmts(stmt.body, env);
                typedStmts.push(__assign(__assign({}, stmt), { cond: typedWhileCond, body: typedWhileBody, a: "None" }));
                break;
            case "expr":
                var typedExpr = typeCheckExpr(stmt.expr, env);
                typedStmts.push(__assign(__assign({}, stmt), { expr: typedExpr, a: typedExpr.a }));
                break;
        }
    });
    return typedStmts;
}
function typeCheckExpr(expr, env) {
    switch (expr.tag) {
        case "id":
            if (!env.vars.has(expr.name)) {
                throw new ReferenceError("Not a variable `".concat(expr.name, "`"));
            }
            var idType = env.vars.get(expr.name);
            return __assign(__assign({}, expr), { a: idType });
        case "getattr":
            var obj = typeCheckExpr(expr.obj, env);
            if (typeof obj.a !== "object" || obj.a.tag !== "object") {
                throw TypeError("Not an object!");
            }
            var classData = env.classes.get(obj.a.class);
            if (!classData.fields.has(expr.name)) {
                throw new ReferenceError("`".concat(expr.name, "` is not a member of class `").concat(obj.a.class, "`"));
            }
            var fieldType = classData.fields.get(expr.name);
            return __assign(__assign({}, expr), { obj: obj, a: fieldType });
        case "builtin1":
            var arg = typeCheckExpr(expr.arg, env);
            switch (expr.name) {
                case "print":
                    return __assign(__assign({}, expr), { arg: arg, a: "None" });
                case "abs":
                    if (arg.a !== "int")
                        throw new TypeError("Expected int; got ".concat(arg.a, " for abs()"));
                    return __assign(__assign({}, expr), { arg: arg, a: "int" });
            }
            break;
        case "builtin2":
            var arg1 = typeCheckExpr(expr.arg1, env);
            var arg2 = typeCheckExpr(expr.arg2, env);
            if (arg1.a !== "int" || arg2.a !== "int") {
                throw new TypeError("Cannot apply builtin2 `".concat(expr.name, "` on types `").concat(arg1.a, "` and `").concat(arg2.a, "`"));
            }
            return __assign(__assign({}, expr), { arg1: arg1, arg2: arg2, a: "int" });
        case "uniexpr":
            var right = typeCheckExpr(expr.right, env);
            switch (expr.op) {
                case ast_1.UniOp.Not:
                    if (right.a !== "bool")
                        throw new TypeError("Cannot apply operator `".concat(expr.op, "` on type `").concat(right.a, "`"));
                    break;
                case ast_1.UniOp.Neg:
                    if (right.a !== "int")
                        throw new TypeError("Cannot apply operator `".concat(expr.op, "` on type `").concat(right.a, "`"));
                    break;
            }
            return __assign(__assign({}, expr), { right: right, a: right.a });
        case "binexpr":
            var left = typeCheckExpr(expr.left, env);
            var right = typeCheckExpr(expr.right, env);
            switch (expr.op) {
                case ast_1.BinOp.Add:
                case ast_1.BinOp.Sub:
                case ast_1.BinOp.Mul:
                case ast_1.BinOp.Div:
                case ast_1.BinOp.Mod:
                    if (left.a !== "int" || right.a !== "int") {
                        throw new TypeError("Cannot apply operator `".concat(expr.op, "` on types `").concat(left.a, "` and `").concat(right.a, "`"));
                    }
                    return __assign(__assign({}, expr), { left: left, right: right, a: "int" });
                case ast_1.BinOp.Lesser:
                case ast_1.BinOp.LessEq:
                case ast_1.BinOp.GreatEq:
                case ast_1.BinOp.Greater:
                    if (left.a !== "int" || right.a !== "int") {
                        throw new TypeError("Cannot apply operator `".concat(expr.op, "` on types `").concat(left.a, "` and `").concat(right.a, "`"));
                    }
                    return __assign(__assign({}, expr), { left: left, right: right, a: "bool" });
                case ast_1.BinOp.Equals:
                case ast_1.BinOp.NotEquals:
                    if (left.a !== right.a || right.a === "None") {
                        throw new TypeError("Cannot apply operator `".concat(expr.op, "` on types `").concat(left.a, "` and `").concat(right.a, "`"));
                    }
                    return __assign(__assign({}, expr), { left: left, right: right, a: "bool" });
                case ast_1.BinOp.Is:
                    if ((left.a !== "None" && typeof left.a !== "object") ||
                        (right.a !== "None" && typeof left.a !== "object")) {
                        throw new TypeError("Cannot apply operator `".concat(expr.op, "` on types `").concat(left.a, "` and `").concat(right.a, "`"));
                    }
                    return __assign(__assign({}, expr), { left: left, right: right, a: "bool" });
            }
            break;
        case "literal":
            var lit = typeCheckLiteral(expr.literal);
            return __assign(__assign({}, expr), { a: lit.a });
        case "call":
            if (env.funcs.has(expr.name)) {
                //Functions
                var typedArgs = expr.args.map(function (arg) { return typeCheckExpr(arg, env); });
                var _a = env.funcs.get(expr.name), actualArgs = _a[0], retType = _a[1];
                if (actualArgs.length !== typedArgs.length)
                    throw new Error("Expected ".concat(actualArgs.length, " arguments for ").concat(expr.name, " got ").concat(typedArgs.length));
                for (var index = 0; index < typedArgs.length; index++) {
                    if (!checkAssign(actualArgs[index], typedArgs[index].a, env.classes))
                        if (typedArgs[index].a !== actualArgs[index])
                            throw new TypeError("Expected type `".concat(actualArgs[index], "`; got type `").concat(typedArgs[index].a, "` for parameter ").concat(index));
                }
                return __assign(__assign({}, expr), { args: typedArgs, a: retType });
            }
            else if (env.classes.has(expr.name)) {
                // Constructors
                if (expr.args.length !== 0) {
                    throw new TypeError("Expected 0 arguments for ".concat(expr.name, " got ").concat(expr.args.length));
                }
                var retType = { tag: "object", class: expr.name };
                return __assign(__assign({}, expr), { a: retType });
            }
            else if (expr.obj) {
                // Methods
                var obj_1 = typeCheckExpr(expr.obj, env);
                if (typeof obj_1.a !== "object" || obj_1.a.tag !== "object") {
                    throw new ReferenceError("Not an object");
                }
                var typedArgs = expr.args.map(function (arg) { return typeCheckExpr(arg, env); });
                var methods = env.classes.get(obj_1.a.class).methods;
                if (!methods.has(expr.name)) {
                    throw new ReferenceError("There is no method `".concat(expr.name, "` in class `").concat(obj_1.a.class, "`"));
                }
                var _b = methods.get(expr.name), actualArgs = _b[0], retType = _b[1];
                if (actualArgs.length - 1 !== typedArgs.length)
                    throw new Error("Expected ".concat(actualArgs.length - 1, " arguments for ").concat(expr.name, " got ").concat(typedArgs.length));
                for (var index = 0; index < typedArgs.length; index++) {
                    if (!checkAssign(actualArgs[index + 1], typedArgs[index].a, env.classes))
                        throw new TypeError("Expected type `".concat(actualArgs[index + 1], "`; got type `").concat(typedArgs[index].a, "` for parameter ").concat(index));
                }
                return __assign(__assign({}, expr), { args: typedArgs, obj: obj_1, a: retType });
            }
            else {
                throw new ReferenceError("Not a Function or Class `".concat(expr.name, "`"));
            }
        default:
            break;
    }
}
function typeCheckLiteral(literal) {
    switch (literal.tag) {
        case "num":
            return __assign(__assign({}, literal), { a: "int" });
        case "bool":
            return __assign(__assign({}, literal), { a: "bool" });
        case "none":
            return __assign(__assign({}, literal), { a: "None" });
        default:
            break;
    }
}
//# sourceMappingURL=typecheck.js.map