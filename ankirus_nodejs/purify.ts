import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

const { window } = new JSDOM("<!DOCTYPE html>");
const DOMPurify = createDOMPurify(window);

async function purify(content: string): Promise<string> {
  if (typeof content !== "string") {
    throw new Error("输入内容不是字符串");
  }
  const purifiedContent = DOMPurify.sanitize(content);
  return purifiedContent;
}

export { purify };
