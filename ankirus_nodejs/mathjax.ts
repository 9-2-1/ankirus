import mjAPI from "mathjax-node";
mjAPI.config({ displayMessages: true, displayErrors: true });
async function mathjax(content: string): Promise<string> {
  return mjAPI
    .typeset({
      math: content,
      format: "inline-TeX",
      html: true,
    })
    .then((res) => {
      if (res.errors) {
        throw new Error(res.errors.join("\n"));
      } else {
        if (res.html === undefined) {
          throw new Error("mathjax 未返回 html");
        }
        return res.html;
      }
    });
}

export { mathjax };
