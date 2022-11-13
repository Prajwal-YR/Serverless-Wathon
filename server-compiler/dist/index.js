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
var http_1 = require("http");
var parser_1 = require("./parser");
var typecheck_1 = require("./typecheck");
var codeGen_1 = require("./codeGen");
var hostname = '127.0.0.1';
var port = 3000;
function getJSONDataFromRequestStream(request) {
    return new Promise(function (resolve) {
        var chunks = [];
        request.on('data', function (chunk) {
            chunks.push(chunk);
        });
        request.on('end', function () {
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
        });
    });
}
var server = (0, http_1.createServer)(function (req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    //   console.log(req)
    res.end('Hello World');
    //var body = "";
    getJSONDataFromRequestStream(req).then(function (body) {
        console.log("Body:", body);
        //parse
        var parsed = (0, parser_1.parse)(body.program);
        console.log("Parsed:", parsed);
        //tc
        var ProgramEnv = {
            vars: new Map(),
            funcs: new Map(),
            classes: new Map(),
            retType: "None",
        };
        var typedAst = (0, typecheck_1.typeCheckProgram)(parsed, ProgramEnv);
        console.log("typed program", typedAst);
        //codegen
        var scratchVar = "(local $$last i32)";
        var emptyEnv = { vars: new Map(), funcs: new Map(), classes: new Map(ProgramEnv.classes), retType: "None" };
        var globals = ["(global $heap (mut i32) (i32.const 4))"];
        typedAst.classdefs.forEach(function (c) {
            var prefix = "".concat(c.name, "$");
            c.methods.forEach(function (m) {
                m.name = prefix + m.name;
                globals = globals.concat((0, codeGen_1.codeGenFun)(m, emptyEnv));
            });
            var initvals = [];
            // constructor
            c.fields.forEach(function (f, index) {
                var offset = (index) * 4;
                initvals = __spreadArray(__spreadArray([], initvals, true), [
                    " (global.get $heap)",
                    " (i32.add  (i32.const ".concat(offset, "))"),
                    " ".concat((0, codeGen_1.resolveLiteral)(f.init)),
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
            globals.push("(global $".concat(v.name, " (mut i32) ").concat((0, codeGen_1.resolveLiteral)(v.init), ")"));
        });
        typedAst.fundefs.forEach(function (f) {
            globals = globals.concat((0, codeGen_1.codeGenFun)(f, emptyEnv));
        });
        var commandGroups = typedAst.stmts.map(function (stmt) { return (0, codeGen_1.codeGenStmt)(stmt, emptyEnv); });
        var commands = [].concat.apply([scratchVar], commandGroups);
        console.log("after codegen commands", commands);
        console.log("after codegen globals", globals);
        console.log("\n-------------------------------------------------------------------------------------------------------------------------\n");
    });
});
server.listen(port, hostname, function () {
    console.log("Server running at http://".concat(hostname, ":").concat(port, "/"));
});
//# sourceMappingURL=index.js.map