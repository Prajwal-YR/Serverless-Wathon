"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var runner_1 = require("./runner");
function webStart() {
    document.addEventListener("DOMContentLoaded", function () {
        function display(arg, element) {
            console.log("arg in displayServer", arg);
            var elt = document.createElement("pre");
            document.getElementById(element + "CompileOutput").appendChild(elt);
            elt.innerText = arg;
        }
        function getImportObject(type) {
            var importObject = {
                imports: {
                    print: function (arg) {
                        console.log("Logging from WASM: ", arg);
                        var elt = document.createElement("pre");
                        document.getElementById("output").appendChild(elt);
                        elt.innerText = arg;
                        return arg;
                    },
                    print_num: function (arg) {
                        console.log("Logging from WASM: ", arg);
                        display(String(arg), type);
                        return 0;
                    },
                    print_bool: function (arg) {
                        if (arg === 0) {
                            display("False", type);
                        }
                        else {
                            display("True", type);
                        }
                        return 0;
                    },
                    print_none: function (arg) {
                        display("None", type);
                        return arg;
                    },
                    abs: Math.abs,
                    max: Math.max,
                    min: Math.min,
                    pow: Math.pow,
                },
            };
            return { importObject: importObject };
        }
        function renderResult(result) {
            if (result.server) {
                var elt = document.createElement("pre");
                document.getElementById("serverCompileOutput").appendChild(elt);
                elt.innerText = result.server;
            }
            if (result.serverless) {
                var elt = document.createElement("pre");
                document.getElementById("serverlessCompileOutput").appendChild(elt);
                elt.innerText = result.serverless;
            }
            if (result.serverlessExpOutput) {
                var elt = document.createElement("pre");
                document.getElementById("serverlessExpCompileOutput").appendChild(elt);
                elt.innerText = result.serverlessExpOutput;
            }
            var serverlessFidelity = document.getElementById("serverlessFidelity");
            serverlessFidelity.innerHTML = result.compareServerless ? "<span style=\"color:green\">Passed</span>" : "<span style=\"color:red\">Failed</span>";
            var serverlessExpFidelity = document.getElementById("serverlessExpFidelity");
            serverlessExpFidelity.innerHTML = result.compareServerlessExp ? "<span style=\"color:green\">Passed</span>" : "<span style=\"color:red\">Failed</span>";
            if (result.serverlessExecTime) {
                var elt = document.createElement("pre");
                document.getElementById("serverlessCompileTime").appendChild(elt);
                elt.innerText = result.serverlessExecTime;
            }
            if (result.serverExecTime) {
                var elt = document.createElement("pre");
                document.getElementById("serverCompileTime").appendChild(elt);
                elt.innerText = result.serverExecTime;
            }
            if (result.serverlessRespTime) {
                var elt = document.createElement("pre");
                document.getElementById("serverlessRespTime").appendChild(elt);
                elt.innerText = result.serverlessRespTime;
            }
            if (result.serverRespTime) {
                var elt = document.createElement("pre");
                document.getElementById("serverRespTime").appendChild(elt);
                elt.innerText = result.serverRespTime;
            }
            if (result.serverlessApiCalls) {
                var elt = document.createElement("pre");
                document.getElementById("serverlessApiCalls").appendChild(elt);
                elt.innerText = result.serverlessApiCalls;
            }
            var elt1 = document.createElement("pre");
            document.getElementById("serverApiCalls").appendChild(elt1);
            elt1.innerText = String(1);
            var elt2 = document.createElement("pre");
            document.getElementById("serverlessExpApiCalls").appendChild(elt2);
            elt2.innerText = String(1);
            if (result.serverlessExpExecTime) {
                var elt = document.createElement("pre");
                document.getElementById("serverlessExpCompileTime").appendChild(elt);
                elt.innerText = result.serverlessExpExecTime;
            }
            if (result.serverlessExpRespTime) {
                var elt = document.createElement("pre");
                document.getElementById("serverlessExpRespTime").appendChild(elt);
                elt.innerText = result.serverlessExpRespTime;
            }
        }
        function renderError(result) {
            var elt = document.createElement("pre");
            document.getElementById("output").appendChild(elt);
            elt.setAttribute("style", "color: red");
            elt.innerText = String(result);
        }
        document.getElementById("run").addEventListener("click", function (e) {
            var source = document.getElementById("user-code");
            (0, runner_1.run)(source.value, getImportObject("server"), getImportObject("serverless"), getImportObject("serverlessExp")).then(function (r) { renderResult(r); console.log("run finished"); })
                .catch(function (e) { renderError(e); console.log("run failed", e); });
            ;
        });
        var textarea = document.querySelector("textarea");
        textarea.addEventListener("keydown", function (e) {
            if (e.keyCode === 9) {
                e.preventDefault();
                textarea.setRangeText("  ", textarea.selectionStart, textarea.selectionStart, "end");
            }
        });
    });
}
webStart();
//# sourceMappingURL=webstart.js.map