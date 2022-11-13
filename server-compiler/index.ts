import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from "./parser";
import { Program, Type, TypeEnv } from "./ast";
import { ClassEnv, typeCheckProgram, } from "./typecheck";
import { codeGenFun, codeGenStmt, resolveLiteral } from "./codeGen";

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
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  //   console.log(req)
  res.end('Hello World');
  //var body = "";
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
    const scratchVar: string = `(local $$last i32)`;
    const emptyEnv: TypeEnv = { vars: new Map(), funcs: new Map(), classes: new Map(ProgramEnv.classes), retType: "None" };
    var globals: string[] = [`(global $heap (mut i32) (i32.const 4))`];
    typedAst.classdefs.forEach(c => {
        const prefix = `${c.name}$`;
        c.methods.forEach(m => {
            m.name = prefix + m.name;
            globals = globals.concat(codeGenFun(m, emptyEnv));
        });
        var initvals: string[] = [];
        // constructor
        c.fields.forEach((f, index) => {
            const offset = (index) * 4;
            initvals = [
                ...initvals,
                ` (global.get $heap)`,
                ` (i32.add  (i32.const ${offset}))`,
                ` ${resolveLiteral(f.init)}`,
                ` i32.store`];

        });
        const init_present = emptyEnv.classes.get(c.name).methods.has('__init__');
        globals = [
            ...globals,
            `(func $${c.name}  (result i32)`,
            ` (local $$last i32)`,
            ...initvals,
            ` (global.get $heap)`,
            init_present ? ` (local.set $$last (global.get $heap)) ` : ``,
            ` (global.set $heap (i32.add (global.get $heap) (i32.const ${c.fields.length * 4})))`,
            init_present ? ` call $${c.name}$__init__\n (local.get $$last)` : ``,
            ` return
      )`
        ];
    });
    typedAst.varinits.forEach((v) => {
        globals.push(`(global $${v.name} (mut i32) ${resolveLiteral(v.init)})`);
    });
    typedAst.fundefs.forEach((f) => {
        globals = globals.concat(codeGenFun(f, emptyEnv));
    });
    const commandGroups = typedAst.stmts.map(stmt => codeGenStmt(stmt, emptyEnv));
    const commands = [].concat.apply([scratchVar], commandGroups);
    console.log("after codegen commands", commands);
    console.log("after codegen globals", globals);
    console.log("\n-------------------------------------------------------------------------------------------------------------------------\n");
  });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});