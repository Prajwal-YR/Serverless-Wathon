import { APIGatewayEvent } from "aws-lambda";
import { typeCheckProgram, TypeEnv } from "./typecheck";
import { Program, Type } from "./ast";

export const handler = async (
  event: APIGatewayEvent
): Promise<Program<Type>> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  const ProgramEnv: TypeEnv = {
    vars: new Map(),
    funcs: new Map(),
    classes: new Map(),
    retType: "None",
  };
  return {
    // @ts-ignore
    typedAst: typeCheckProgram(event.ast, ProgramEnv),
    env: ProgramEnv
  };
};
