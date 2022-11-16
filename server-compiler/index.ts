import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from "./parser";
import { TypeEnv } from "./ast";
import { typeCheckProgram, } from "./typecheck";
import { codeGenProgram } from "./codeGen";

const hostname = '127.0.0.1';
const port = 3000;

type Post = {
  program: string
}

function getJSONDataFromRequestStream<T>(request: IncomingMessage): Promise<T> {
  return new Promise(resolve => {
    const chunks: any[] | Uint8Array[] = [];
    request.on('data', (chunk) => {
      chunks.push(chunk);
    });
    request.on('end', () => {
      resolve(
        JSON.parse(
          Buffer.concat(chunks).toString()
        )
      )
    });
  })
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  getJSONDataFromRequestStream<Post>(req).then(body => {
    console.log("Body:", body);
    //parse
    const parsed = parse(body.program);
    console.log("Parsed:", parsed);
    //tc
    const ProgramEnv: TypeEnv = {
      vars: new Map(),
      funcs: new Map(),
      classes: new Map(),
      retType: "None",
    };
    const typedAst = typeCheckProgram(parsed, ProgramEnv);
    console.log("typed program", typedAst)
    //codegen
    const result = codeGenProgram(typedAst, ProgramEnv);
    console.log("after codegen commands", result);
    console.log("\n-------------------------------------------------------------------------------------------------------------------------\n");
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end(result);
  });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});