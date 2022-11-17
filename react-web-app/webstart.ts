import { run } from './runner';


function webStart() {
  document.addEventListener("DOMContentLoaded", function () {
    function displayServer(arg: string) {
      console.log("arg in displayServer", arg)
      const elt = document.createElement("pre");
      document.getElementById("serverCompileOutput").appendChild(elt);
      elt.innerText = arg;
    }
    function displayServerless(arg:string) {
      console.log("arg in displayServerless", arg)
      const elt = document.createElement("pre");
      document.getElementById("serverlessCompileOutput").appendChild(elt);
      elt.innerText = arg;
    }
    var importObjectServer = {importObject:{
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
          displayServer(String(arg));
          return 0;
        },
        print_bool: (arg: any) => {
          if (arg === 0) { displayServer("False"); }
          else { displayServer("True"); }
          return 0;
        },
        print_none: (arg: any) => {
          displayServer("None");
          return arg;
        },
        abs: Math.abs,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
      },
    }};

    var importObjectServerless = {importObject:{
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
          displayServerless(String(arg));
          return 0;
        },
        print_bool: (arg: any) => {
          if (arg === 0) { displayServer("False"); }
          else { displayServerless("True"); }
          return 0;
        },
        print_none: (arg: any) => {
          displayServerless("None");
          return arg;
        },
        abs: Math.abs,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
      },
    }};

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
      const comparison = document.getElementById("comparison");
      comparison.innerHTML = "<strong> Fidelity verification: </strong>" + (result.compare?`<span style="color:green">Passed</span>`:`<span style="color:red">Failed</span>`);
    }

    function renderError(result: any): void {
      const elt = document.createElement("pre");
      document.getElementById("output").appendChild(elt);
      elt.setAttribute("style", "color: red");
      elt.innerText = String(result);
    }

    document.getElementById("run").addEventListener("click", function (e) {
      const source = document.getElementById("user-code") as HTMLTextAreaElement;
      run(source.value, importObjectServer, importObjectServerless).then((r) => { renderResult(r); console.log("run finished") })
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
