import readline from "node:readline";
import { purify } from "./purify.js";
import { mathjax } from "./mathjax.js";

const rl = readline.createInterface({
  input: process.stdin,
});
const linebuffer: Array<string> = [];
const linewaiter: Array<(line: string) => void> = [];
rl.on("line", (line) => {
  const callback = linewaiter.shift();
  if (callback) {
    callback(line);
  } else {
    linebuffer.push(line);
  }
});
async function print(value: string) {
  process.stdout.write(value + "\n");
}
async function input(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const line = linebuffer.shift();
    if (line !== undefined) {
      resolve(line);
    } else {
      linewaiter.push(resolve);
    }
  });
}

async function test(request: string): Promise<string> {
  return request;
}
const functable: { [key: string]: (request: any) => Promise<any> } = {
  test: test,
  purify: purify,
  mathjax: mathjax,
};
async function handle_request(
  id: number,
  name: string,
  args: any,
): Promise<void> {
  try {
    const func = functable[name];
    const response = await func(args);
    await print(JSON.stringify({ id: id, result: response }));
  } catch (e) {
    await print(JSON.stringify({ id: id, error: String(e) }));
  }
}
async function main() {
  while (true) {
    const line = await input("");
    try {
      const request: { id: number; name: string; args: any } = JSON.parse(line);
      handle_request(request.id, request.name, request.args);
    } catch (e) {
      console.error(e);
    }
  }
}

main();
