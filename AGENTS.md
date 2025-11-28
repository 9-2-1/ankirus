- 鼓励定义容易理解/调试的函数和类/子组件，使代码易于人类阅读。
  - 通用，大量重复的操作 `const x = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);` -> `const [x, _] = quadEqSolve(a, b, c);` `let fullpath = file.drive + file.path + file.name;` -> `let fullpath = fileFullpath(file); // file.fullpath() 甚至 file.fullpath (getter)`
  - 复杂的操作
    ```
    document.createElement...
    fetch(...).then(...)...
    ...
    xxx.innerxxxx=...
    ```
    ->
    ```
    async function updateXXX(){
      let XXXelem = createXXXElement();
      await getXXXData();
      updateXXXElement(XXXelem); // XXXelem.update()
    }
    ```

- 编写完善的 typescript 注解以尽快排除错误
  - 函数参数必须注解 `function pick_item(index: number) {`
  - 如果函数内部较长或者包含其他复杂函数，请注解返回值
  - 鼓励定义容易阅读的 type 和 interface。 `type ExampleChanges = {name: string, mode: "add" | "remove", delta: number}`
  - 使用 npm run lint 检查错误

- 处理 `npm run lint` 报告的错误
  - 类型错误的成因有多种可能：提供的数据错误，调用的函数（设置的变量，参数）错误，以及类型标注本身错误。需要同时考虑这三种可能。
  - 只有在确保不会出现错误的时候才使用 as Type 和 !。鼓励使用 as Type 或者 as Interface 替代 any。
    ```
    if (index < arr.length) {
      return arr[index]!; // index is an non-negative integer and arr is an Array, no undefined will be return'ed
    }
    ```
  - 如果外部库缺少类型注解，则
    - 尝试安装注解库
    - 没有注解库，则根据外部库内容创建 .d.ts 文件，包含用到的函数的注解。例如 footest 库没有注解，而根据文档/源代码判断用到的函数 footest.create 的参数类型为 (string, TestConfig)，则将其添加到 .d.ts 文件中。
