import { BinOp, Expr, FunDef, Literal, Program, Stmt, Type, TypeEnv, UniOp } from "ast";

var labelCounter = 0;

export function codeGenProgram(typedAst: Program<Type>, emptyEnv: TypeEnv): string {
    const scratchVar: string = `(local $$last i32)`;
    var globals: string[] = [`(global $heap (mut i32) (i32.const 4))`];
    var returnType = "";
    var returnExpr = "";
    if (typedAst.stmts.length > 0) {
        const lastExpr = typedAst.stmts[typedAst.stmts.length - 1]
        if (lastExpr.tag === "expr" && !(lastExpr.expr.tag === 'builtin1' && lastExpr.expr.name === 'print')) {
            returnType = "(result i32)";
            returnExpr = "(local.get $$last)"
        }
    }
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
    // console.log("Generated: ", commands.join("\n"));

    const finalWasmCode = `(module
    (func $print_num (import "imports" "print_num") (param i32) (result i32))
    (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
    (func $print_none (import "imports" "print_none") (param i32) (result i32))
    (func $abs (import "imports" "abs") (param i32) (result i32))
    (func $max (import "imports" "max") (param i32 i32) (result i32))
    (func $min (import "imports" "min") (param i32 i32) (result i32))
    (func $pow (import "imports" "pow") (param i32 i32) (result i32))
    (memory (export "memory") 1)
    ${globals.join("\n")}
    (func (export "exported_func") ${returnType}
      ${commands.join("\n")}
      ${returnExpr}
    )
  )`;
    return finalWasmCode;
}

function codeGenFun(fundef: FunDef<Type>, localEnv: TypeEnv): Array<string> {
    // Construct the environment for the function body
    const funEnv: TypeEnv = { vars: new Map(), funcs: new Map(), classes: new Map(localEnv.classes), retType: "None" };
    // Construct the code for params and variable declarations in the body
    fundef.inits.forEach(init => {
        funEnv.vars.set(init.name, init.type);
    });
    fundef.params.forEach(param => {
        funEnv.vars.set(param.name, param.type);
    });
    // Construct the code for params and variable declarations in the body
    const params = fundef.params.map(p => `(param $${p.name} i32)`).join(" ");
    const varDecls = fundef.inits.map(v =>
        `(local $${v.name} i32)\n${resolveLiteral(v.init)}\n(local.set $${v.name})`).join("\n");

    const stmts = fundef.body.map(s => codeGenStmt(s, funEnv, false)).flat();
    const stmtsBody = stmts.join("\n");
    return [`(func $${fundef.name} ${params} (result i32)
    (local $$last i32)
    ${varDecls}
    ${stmtsBody}
    (i32.const 0))`];

}

function codeGenStmt(stmt: Stmt<Type>, localEnv: TypeEnv, useGlobal: boolean = true): Array<string> {
    switch (stmt.tag) {
        case "assign":
            var valStmts = codeGenExpr(stmt.value, localEnv);

            if (typeof stmt.lvalue === 'string' && localEnv.vars.has(stmt.lvalue))
                return valStmts.concat([`(local.set $${stmt.lvalue})`]);
            if (typeof stmt.lvalue === 'object') {
                const obj = codeGenExpr(stmt.lvalue.obj, localEnv);
                //@ts-ignore
                const classData = localEnv.classes.get(stmt.lvalue.obj.a.class);
                const i = Array.from(classData.fields.keys()).indexOf(stmt.lvalue.name)
                return [...obj, `(i32.add (i32.const ${i * 4}))`, ...valStmts, `(i32.store)`];
                // return valStmts.concat([...lvalue,`i32.store`]);
            }
            if (useGlobal && typeof stmt.lvalue === 'string')
                return valStmts.concat([`(global.set $${stmt.lvalue})`]);
            throw new ReferenceError(`Cannot assign to variable that is not explicitly declared in this scope: \`${stmt.lvalue}\``);


        case "expr":
            var exprStmts = codeGenExpr(stmt.expr, localEnv);
            return exprStmts.concat([`(local.set $$last)`]);
        case "return":
            var retStmts = codeGenExpr(stmt.ret, localEnv);
            return [...retStmts, `return`];
        case "pass":
            return ['nop'];
        case "if":
            var condStmts = codeGenExpr(stmt.cond, localEnv);
            var bodyStmts = stmt.body.map(s => codeGenStmt(s, localEnv, useGlobal)).flat();
            if (stmt.elseBody.length == 0)
                return [...condStmts,
                    `(if
            (then`, ...bodyStmts, `)`, `)`];
            const elseBodyStmts = stmt.elseBody.map(s => codeGenStmt(s, localEnv, useGlobal)).flat()
            return [...condStmts, `(if`, `(then`, ...bodyStmts, `)`, `(else`, ...elseBodyStmts, `)`, `)`];
        case "while":
            var label = labelCounter;
            labelCounter++;
            var condStmts = codeGenExpr(stmt.cond, localEnv);
            var bodyStmts = stmt.body.map(s => codeGenStmt(s, localEnv, useGlobal)).flat();
            return [`(block $block_${label}`,
            `(loop $loop_${label}`,
            ...condStmts,
                `i32.const 1`,
                `i32.xor`,
            `br_if $block_${label}`,
            ...bodyStmts,
            `br $loop_${label}`,
                `)`,
                `)`
            ];

    }
}

function resolveLiteral(literal: Literal<Type>): string {
    switch (literal.tag) {
        case "num":
            return `(i32.const ${literal.value})`;

        case "bool":
            return `(i32.const ${Number(literal.value)})`;

        case "none":
            return "(i32.const 0)";
    }
}

function codeGenExpr(expr: Expr<Type>, localEnv: TypeEnv): Array<string> {
    switch (expr.tag) {
        case "builtin1":
            const argStmts = codeGenExpr(expr.arg, localEnv);
            var funName = expr.name;
            if (funName === 'print') {
                switch (expr.arg.a) {
                    case "int":
                        funName = 'print_num'
                        break;
                    case "bool":
                        funName = 'print_bool'
                        break;
                    case "None":
                        funName = 'print_none'
                        break;
                }
            }
            return argStmts.concat([`(call $${funName})`]);
        case "builtin2":
            const arg1Stmts = codeGenExpr(expr.arg1, localEnv);
            const arg2Stmts = codeGenExpr(expr.arg2, localEnv);
            return [...arg1Stmts, ...arg2Stmts, `(call $${expr.name})`];
        case "literal":
            return [resolveLiteral(expr.literal)];

        case "id":
            if (localEnv.vars.has(expr.name))
                return [`(local.get $${expr.name})`];

            return [`(global.get $${expr.name})`];


        case "binexpr":
            const leftexpr = codeGenExpr(expr.left, localEnv);
            var rightexpr = codeGenExpr(expr.right, localEnv);
            var op = codeGenBinOp(expr.op);
            return [...leftexpr, ...rightexpr, op];

        case "uniexpr":
            var rightexpr = codeGenExpr(expr.right, localEnv);
            switch (expr.op) {
                case UniOp.Neg:
                    return ["(i32.const 0)", ...rightexpr, "(i32.sub)"]
                case UniOp.Not:
                    return ["(i32.const 1)", ...rightexpr, "(i32.xor)"]
            }
            break;

        case "call":
            const argsStmts = expr.args.map((arg) => codeGenExpr(arg, localEnv)).flat();
            if (expr.obj) {
                const obj = codeGenExpr(expr.obj, localEnv);
                return [...obj,
                    `(tee_local $$last)`, `(i32.eqz)`,
                    `(if
          (then  (i32.const -1) (i32.load) local.set $$last))`,
                    `(get_local $$last)`,
                ...argsStmts,
                //@ts-ignore
                `(call $${expr.obj.a.class}$${expr.name})`];


            }
            return [...argsStmts, `(call $${expr.name})`];

        case "getattr":
            const obj = codeGenExpr(expr.obj, localEnv);

            //@ts-ignore
            const classData = localEnv.classes.get(expr.obj.a.class);
            const i = Array.from(classData.fields.keys()).indexOf(expr.name)
            return [...obj,
                `(tee_local $$last)`, `(i32.eqz)`,
                `(if
        (then  (i32.const -1) (i32.load) local.set $$last))`,
                `(get_local $$last)`,
            `(i32.add (i32.const ${i * 4}))`, `(i32.load)`];

    }
}



function codeGenBinOp(op: BinOp): string {
    switch (op) {
        case BinOp.Add:
            return "(i32.add)";
        case BinOp.Sub:
            return "(i32.sub)";
        case BinOp.Mul:
            return "(i32.mul)";
        case BinOp.Div:
            return "(i32.div_s)";
        case BinOp.Mod:
            return "(i32.rem_s)";
        case BinOp.Lesser:
            return "(i32.lt_s)";
        case BinOp.LessEq:
            return "(i32.le_s)";
        case BinOp.Greater:
            return "(i32.gt_s)";
        case BinOp.GreatEq:
            return "(i32.ge_s)";
        case BinOp.Equals:
        case BinOp.Is:
            return "(i32.eq)";
        case BinOp.NotEquals:
            return "(i32.ne)";
    }
}
