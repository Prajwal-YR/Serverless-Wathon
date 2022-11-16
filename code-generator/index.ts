import { APIGatewayEvent } from "aws-lambda";
import { TypeEnv, Program } from "./ast";
import { codeGenProgram } from "./codeGen";



export const handler = async (
    event: APIGatewayEvent
): Promise<string> => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    // @ts-ignore
    const emptyEnv: TypeEnv = { vars: new Map(), funcs: new Map(), classes: new Map(event.env.classes), retType: "None" };
    // @ts-ignore
    const typedAst: Program<Type> = event.typedAst;
    return codeGenProgram(typedAst, emptyEnv);
};
