"use strict";
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
        var result = (0, codeGen_1.codeGenProgram)(typedAst, ProgramEnv);
        console.log("after codegen commands", result);
        console.log("\n-------------------------------------------------------------------------------------------------------------------------\n");
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end(result);
    });
});
server.listen(port, hostname, function () {
    console.log("Server running at http://".concat(hostname, ":").concat(port, "/"));
});
//# sourceMappingURL=index.js.map