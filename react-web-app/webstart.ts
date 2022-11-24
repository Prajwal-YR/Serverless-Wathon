import { run } from './runner';


function webStart() {
  document.addEventListener("DOMContentLoaded", function () {
    function display(arg: string, element: string) {
      console.log("arg in displayServer", arg)
      const elt = document.createElement("pre");
      document.getElementById(element + "CompileOutput").appendChild(elt);
      elt.innerText = arg;
    }

    function getImportObject(type: string) {
      var importObject = {
        imports: {
          print: (arg: any) => {
            console.log("Logging from WASM: ", arg);
            const elt = document.createElement("pre");
            document.getElementById("output").appendChild(elt);
            elt.innerText = arg;
            return arg;
          },
          print_num: (arg: any) => {
            console.log("Logging from WASM: ", arg);
            display(String(arg), type);
            return 0;
          },
          print_bool: (arg: any) => {
            if (arg === 0) { display("False", type); }
            else { display("True", type); }
            return 0;
          },
          print_none: (arg: any) => {
            display("None", type);
            return arg;
          },
          abs: Math.abs,
          max: Math.max,
          min: Math.min,
          pow: Math.pow,
        },
      }
      return { importObject };
    }

    function renderResult(result: any): void {
      if (result.server) {
        const elt = document.createElement("pre");
        document.getElementById("serverCompileOutput").appendChild(elt);
        elt.innerText = result.server;
      }
      if (result.serverless) {
        const elt = document.createElement("pre");
        document.getElementById("serverlessCompileOutput").appendChild(elt);
        elt.innerText = result.serverless;
      }
      if (result.serverlessExpOutput) {
        const elt = document.createElement("pre");
        document.getElementById("serverlessExpCompileOutput").appendChild(elt);
        elt.innerText = result.serverlessExpOutput;
      }
      const serverlessFidelity = document.getElementById("serverlessFidelity");
      serverlessFidelity.innerHTML = result.compareServerless ? `<span style="color:green">Passed</span>` : `<span style="color:red">Failed</span>`;
      const serverlessExpFidelity = document.getElementById("serverlessExpFidelity");
      serverlessExpFidelity.innerHTML = result.compareServerlessExp ? `<span style="color:green">Passed</span>` : `<span style="color:red">Failed</span>`;
      if (result.serverlessExecTime) {
        const elt = document.createElement("pre");
        document.getElementById("serverlessCompileTime").appendChild(elt);
        elt.innerText = result.serverlessExecTime;
      }
      if (result.serverExecTime) {
        const elt = document.createElement("pre");
        document.getElementById("serverCompileTime").appendChild(elt);
        elt.innerText = result.serverExecTime;
      }
      if (result.serverlessRespTime) {
        const elt = document.createElement("pre");
        document.getElementById("serverlessRespTime").appendChild(elt);
        elt.innerText = result.serverlessRespTime;
      }
      if (result.serverRespTime) {
        const elt = document.createElement("pre");
        document.getElementById("serverRespTime").appendChild(elt);
        elt.innerText = result.serverRespTime;
      }
      if (result.serverlessApiCalls) {
        const elt = document.createElement("pre");
        document.getElementById("serverlessApiCalls").appendChild(elt);
        elt.innerText = result.serverlessApiCalls;
      }
      const elt1 = document.createElement("pre");
      document.getElementById("serverApiCalls").appendChild(elt1);
      elt1.innerText = String(1);
      const elt2 = document.createElement("pre");
      document.getElementById("serverlessExpApiCalls").appendChild(elt2);
      elt2.innerText = String(1);
      if (result.serverlessExpExecTime) {
        const elt = document.createElement("pre");
        document.getElementById("serverlessExpCompileTime").appendChild(elt);
        elt.innerText = result.serverlessExpExecTime;
      }
      if (result.serverlessExpRespTime) {
        const elt = document.createElement("pre");
        document.getElementById("serverlessExpRespTime").appendChild(elt);
        elt.innerText = result.serverlessExpRespTime;
      }
    }

    function renderError(result: any): void {
      const elt = document.createElement("pre");
      document.getElementById("output").appendChild(elt);
      elt.setAttribute("style", "color: red");
      elt.innerText = String(result);
    }

    document.getElementById("run").addEventListener("click", function (e) {
      const source = document.getElementById("user-code") as HTMLTextAreaElement;
      run(
        source.value,
        getImportObject("server"),
        getImportObject("serverless"),
        getImportObject("serverlessExp")
      ).then((r) => { renderResult(r); console.log("run finished") })
        .catch((e) => { renderError(e); console.log("run failed", e) });;
    });
    const textarea = document.querySelector("textarea");

    textarea.addEventListener("keydown", (e) => {
      if (e.keyCode === 9) {
        e.preventDefault();

        textarea.setRangeText(
          "  ",
          textarea.selectionStart,
          textarea.selectionStart,
          "end"
        );
      }
    });
  });
}

webStart();
