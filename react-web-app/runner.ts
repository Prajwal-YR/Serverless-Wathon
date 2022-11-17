// This is a mashup of tutorials from:
//
// - https://github.com/AssemblyScript/wabt.js/
// - https://developer.mozilla.org/en-US/docs/WebAssembly/Using_the_JavaScript_API

// import axios from 'axios';
import wabt from 'wabt';

// NOTE(joe): This is a hack to get the CLI Repl to run. WABT registers a global
// uncaught exn handler, and this is not allowed when running the REPL
// (https://nodejs.org/api/repl.html#repl_global_uncaught_exceptions). No reason
// is given for this in the docs page, and I haven't spent time on the domain
// module to figure out what's going on here. It doesn't seem critical for WABT
// to have this support, so we patch it away.
if (typeof process !== "undefined") {
  const oldProcessOn = process.on;
  process.on = (...args: any): any => {
    if (args[0] === "uncaughtException") { return; }
    else { return oldProcessOn.apply(process, args); }
  };
}

async function execWasm(wasmSource: string, config:any ){
  const wabtInterface = await wabt();
  const importObject = config.importObject;
  const myModule = wabtInterface.parseWat("test.wat", wasmSource);
  var asBinary = myModule.toBinary({});
  var wasmModule = await WebAssembly.instantiate(asBinary.buffer, importObject);
  const result = (wasmModule.instance.exports.exported_func as any)();
  console.log("Memory", wasmModule.instance.exports.memory);
  return result;
}

export async function run(source: string, serverConfig: any, serverlessConfig: any): Promise<any> {
  const execInput = {
    input: JSON.stringify({ program: source }),
    stateMachineArn: "arn:aws:states:us-west-2:078212600544:stateMachine:Wathon"
  }
  const response = await fetch('https://l07eno817e.execute-api.us-west-2.amazonaws.com/delta/execution', {
    method: 'POST',
    body: JSON.stringify(execInput),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const serverlessResult = await response.json();
  console.log("execution output", serverlessResult);
  const detailsInput = {
    executionArn: serverlessResult.executionArn
  }
  var execDetailsResult;
  do {
    const execDetails = await fetch('https://l07eno817e.execute-api.us-west-2.amazonaws.com/delta/desc', {
      method: 'POST',
      body: JSON.stringify(detailsInput),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    execDetailsResult = await execDetails.json();
  } while (execDetailsResult.status === "RUNNING");
  const wasmSource:string = JSON.parse(execDetailsResult.output);
  console.log("Final Wasm code:\n" + wasmSource);
  const serverlessOutput = await execWasm(wasmSource, serverlessConfig);
  // return result;
  const serverInput = {
    program: source
  }
  const serverResponse = await fetch('http://ec2-52-39-168-9.us-west-2.compute.amazonaws.com:3000/', {
    method: 'POST',
    body: JSON.stringify(serverInput),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const serverResult = await serverResponse.text();
  const serverOutput = await execWasm(serverResult, serverConfig);
  return { server: serverOutput, serverless: serverlessOutput, compare: serverlessOutput === serverOutput };
}
