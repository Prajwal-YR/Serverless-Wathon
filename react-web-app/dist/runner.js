"use strict";
// This is a mashup of tutorials from:
//
// - https://github.com/AssemblyScript/wabt.js/
// - https://developer.mozilla.org/en-US/docs/WebAssembly/Using_the_JavaScript_API
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
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
// import axios from 'axios';
var wabt_1 = __importDefault(require("wabt"));
// NOTE(joe): This is a hack to get the CLI Repl to run. WABT registers a global
// uncaught exn handler, and this is not allowed when running the REPL
// (https://nodejs.org/api/repl.html#repl_global_uncaught_exceptions). No reason
// is given for this in the docs page, and I haven't spent time on the domain
// module to figure out what's going on here. It doesn't seem critical for WABT
// to have this support, so we patch it away.
if (typeof process !== "undefined") {
    var oldProcessOn_1 = process.on;
    process.on = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (args[0] === "uncaughtException") {
            return;
        }
        else {
            return oldProcessOn_1.apply(process, args);
        }
    };
}
function execWasm(wasmSource, config) {
    return __awaiter(this, void 0, void 0, function () {
        var wabtInterface, importObject, myModule, asBinary, wasmModule, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, wabt_1.default)()];
                case 1:
                    wabtInterface = _a.sent();
                    importObject = config.importObject;
                    myModule = wabtInterface.parseWat("test.wat", wasmSource);
                    asBinary = myModule.toBinary({});
                    return [4 /*yield*/, WebAssembly.instantiate(asBinary.buffer, importObject)];
                case 2:
                    wasmModule = _a.sent();
                    result = wasmModule.instance.exports.exported_func();
                    console.log("Memory", wasmModule.instance.exports.memory);
                    return [2 /*return*/, result];
            }
        });
    });
}
function run(source, serverConfig, serverlessConfig, serverlessExpConfig) {
    return __awaiter(this, void 0, void 0, function () {
        var execInput, serverlessRespStart, response, serverlessApiCalls, serverlessResult, detailsInput, execDetailsResult, execDetails, serverlessRespTime, serverlessExecTime, wasmSource, serverlessOutput, execExpInput, serverlessExpRespStart, responseExp, serverlessExpResult, serverlessExpRespTime, serverlessExpExecTime, serverlessExpOutput, serverInput, serverRespStart, serverResponse, serverRespTime, serverResult, serverExecTime, serverOutput;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    execInput = {
                        input: JSON.stringify({ program: source }),
                        stateMachineArn: "arn:aws:states:us-west-2:078212600544:stateMachine:Wathon"
                    };
                    serverlessRespStart = Date.now();
                    return [4 /*yield*/, fetch('https://l07eno817e.execute-api.us-west-2.amazonaws.com/delta/execution', {
                            method: 'POST',
                            body: JSON.stringify(execInput),
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })];
                case 1:
                    response = _a.sent();
                    serverlessApiCalls = 1;
                    return [4 /*yield*/, response.json()];
                case 2:
                    serverlessResult = _a.sent();
                    console.log("execution output", serverlessResult);
                    detailsInput = {
                        executionArn: serverlessResult.executionArn
                    };
                    _a.label = 3;
                case 3: return [4 /*yield*/, fetch('https://l07eno817e.execute-api.us-west-2.amazonaws.com/delta/desc', {
                        method: 'POST',
                        body: JSON.stringify(detailsInput),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })];
                case 4:
                    execDetails = _a.sent();
                    return [4 /*yield*/, execDetails.json()];
                case 5:
                    execDetailsResult = _a.sent();
                    serverlessApiCalls++;
                    _a.label = 6;
                case 6:
                    if (execDetailsResult.status === "RUNNING") return [3 /*break*/, 3];
                    _a.label = 7;
                case 7:
                    serverlessRespTime = Date.now() - serverlessRespStart;
                    serverlessExecTime = (execDetailsResult.stopDate - execDetailsResult.startDate) * 1000;
                    wasmSource = JSON.parse(execDetailsResult.output);
                    console.log("Final Wasm code:\n" + wasmSource);
                    return [4 /*yield*/, execWasm(wasmSource, serverlessConfig)];
                case 8:
                    serverlessOutput = _a.sent();
                    execExpInput = {
                        input: JSON.stringify({ program: source }),
                        stateMachineArn: "arn:aws:states:us-west-2:078212600544:stateMachine:Wathon_Express"
                    };
                    serverlessExpRespStart = Date.now();
                    return [4 /*yield*/, fetch('https://l07eno817e.execute-api.us-west-2.amazonaws.com/delta/execSync', {
                            method: 'POST',
                            body: JSON.stringify(execExpInput),
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })];
                case 9:
                    responseExp = _a.sent();
                    return [4 /*yield*/, responseExp.json()];
                case 10:
                    serverlessExpResult = _a.sent();
                    serverlessExpRespTime = Date.now() - serverlessExpRespStart;
                    serverlessExpExecTime = (serverlessExpResult.stopDate - serverlessExpResult.startDate) * 1000;
                    return [4 /*yield*/, execWasm(JSON.parse(serverlessExpResult.output), serverlessExpConfig)];
                case 11:
                    serverlessExpOutput = _a.sent();
                    serverInput = {
                        program: source
                    };
                    serverRespStart = Date.now();
                    return [4 /*yield*/, fetch('http://ec2-52-39-168-9.us-west-2.compute.amazonaws.com:3000/', {
                            method: 'POST',
                            body: JSON.stringify(serverInput),
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })];
                case 12:
                    serverResponse = _a.sent();
                    serverRespTime = Date.now() - serverRespStart;
                    return [4 /*yield*/, serverResponse.json()];
                case 13:
                    serverResult = _a.sent();
                    serverExecTime = (serverResult.stopDate - serverResult.startDate) * 1000;
                    return [4 /*yield*/, execWasm(serverResult.output, serverConfig)];
                case 14:
                    serverOutput = _a.sent();
                    // Return values
                    return [2 /*return*/, {
                            server: serverOutput,
                            serverless: serverlessOutput,
                            compareServerless: serverlessOutput === serverOutput,
                            compareServerlessExp: serverlessExpOutput === serverOutput,
                            serverlessExecTime: serverlessExecTime,
                            serverExecTime: serverExecTime,
                            serverRespTime: serverRespTime,
                            serverlessRespTime: serverlessRespTime,
                            serverlessApiCalls: serverlessApiCalls,
                            serverlessExpOutput: serverlessExpOutput,
                            serverlessExpExecTime: serverlessExpExecTime,
                            serverlessExpRespTime: serverlessExpRespTime
                        }];
            }
        });
    });
}
exports.run = run;
//# sourceMappingURL=runner.js.map