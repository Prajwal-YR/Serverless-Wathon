"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniOp = exports.BinOp = void 0;
var BinOp;
(function (BinOp) {
    BinOp["Add"] = "+";
    BinOp["Sub"] = "-";
    BinOp["Mul"] = "*";
    BinOp["Div"] = "//";
    BinOp["Mod"] = "%";
    BinOp["Lesser"] = "<";
    BinOp["LessEq"] = "<=";
    BinOp["Greater"] = ">";
    BinOp["GreatEq"] = ">=";
    BinOp["Equals"] = "==";
    BinOp["NotEquals"] = "!=";
    BinOp["Is"] = "is";
})(BinOp = exports.BinOp || (exports.BinOp = {}));
var UniOp;
(function (UniOp) {
    UniOp["Not"] = "not";
    UniOp["Neg"] = "-";
})(UniOp = exports.UniOp || (exports.UniOp = {}));
//# sourceMappingURL=ast.js.map