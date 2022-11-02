import { APIGatewayEvent } from "aws-lambda";
import { TypeEnv, Program } from "./ast";
import { codeGenFun, codeGenStmt, resolveLiteral } from "./codeGen";

type CompileResult = {
    globals: string,
    wasmSource: string,
};

export const handler = async (
    event: APIGatewayEvent
): Promise<CompileResult> => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    // @ts-ignore
    const emptyEnv: TypeEnv = { vars: new Map(), funcs: new Map(), classes: new Map(event.env.classes), retType: "None" };
    // @ts-ignore
    const typedAst: Program<Type> = event.typedAst;
    const scratchVar: string = `(local $$last i32)`;
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
    console.log("Generated: ", commands.join("\n"));
    return {
        globals: globals.join("\n"),
        wasmSource: commands.join("\n"),
    };
};
