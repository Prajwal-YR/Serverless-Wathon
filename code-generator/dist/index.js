"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
exports.handler = void 0;
var codeGen_1 = require("./codeGen");
var handler = function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var emptyEnv, typedAst, scratchVar, globals, commandGroups, commands;
    return __generator(this, function (_a) {
        console.log("Event: ".concat(JSON.stringify(event, null, 2)));
        emptyEnv = { vars: new Map(), funcs: new Map(), classes: new Map(event.env.classes), retType: "None" };
        typedAst = event.typedAst;
        scratchVar = "(local $$last i32)";
        globals = ["(global $heap (mut i32) (i32.const 4))"];
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
        commandGroups = typedAst.stmts.map(function (stmt) { return (0, codeGen_1.codeGenStmt)(stmt, emptyEnv); });
        commands = [].concat.apply([scratchVar], commandGroups);
        console.log("Generated: ", commands.join("\n"));
        return [2 /*return*/, {
                globals: globals.join("\n"),
                wasmSource: commands.join("\n"),
            }];
    });
}); };
exports.handler = handler;
//# sourceMappingURL=index.js.map