import { APIGatewayEvent } from "aws-lambda";
import { ClassEnv, typeCheckProgram, TypeEnv } from "./typecheck";
import { Program, Type } from "./ast";

type returnType = {
  typedAst: Program<Type>
  env: {
    vars: [string, Type][],
    funcs: [string, [Type[], Type]][],
    classes: [string, ClassEnv][],
  }
}

export const handler = async (
  event: APIGatewayEvent
): Promise<returnType> => {
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
    env: {
      vars: Array.from(ProgramEnv.vars.entries()),
      funcs: Array.from(ProgramEnv.funcs.entries()),
      classes: Array.from(ProgramEnv.classes.entries()),
    }
  };
};
