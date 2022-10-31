import { APIGatewayEvent } from "aws-lambda";
import {parse} from "./parser"; 
import { Program } from "./ast";

export const handler = async (
  event: APIGatewayEvent,
): Promise<Program<null>> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
// @ts-ignore
  return {ast: parse(event.program)};
};
