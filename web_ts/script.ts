// 定义数据类型
type RetentionParams = {
  basetime: number; // Unix Timestamp
  difficulty: number;
  stability: number;
  decay: number;
};

type CardStats = {
  total: number;
  paused: 0 | 1;
  weight: number;
  retention: number;
  stability: number;
};

type Card = {
  cid: number; // 对应后端的cid
  content: [string, string];
  retention_params: RetentionParams;
  paused: boolean;
  stats: CardStats;
};

type CardGroupStats = {
  total: number;
  paused: number;
  weight: number;
  retention_weight: number;
  stability_weight: number;
};

type CardGroup = {
  cards: Card[];
  groups: Record<string, CardGroup>;
  stats: CardGroupStats;
};

// 主应用类
class AnkirusApp {
  private currentName: string = "";
  private currentGroup: CardGroup | null = null;
  private currentCard: Card | null = null;
  private statemap: StateMap = new StateMap();

  private rootGroup: CardGroup | null = null;

  constructor() {
    this.init();
  }

  async init() {
    await this.loadCards();
    this.initEventListeners();
  }

  async loadCards(group?: string) {
    try {
      let url = "/cards/";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.rootGroup = data;
      this.currentName = group ?? "";
      this.currentGroup = this.rootGroup;
      const groupPath = this.currentName.split("::");
      for (const name of groupPath) {
        if (name != "") {
          this.currentGroup = this.currentGroup!.groups[name];
        }
      }
      this.updateGroupInfo();
    } catch (error) {
      console.error("Error loading cards:", error);
    }
  }

  _createDiv(classname: string, content: string): HTMLDivElement {
    const div = document.createElement("div");
    div.className = classname;
    div.textContent = content;
    div.title = content;
    return div;
  }

  _groupElement(
    indent: string,
    name: string,
    linkname: string | null,
    subgroup: CardGroup | null,
  ): HTMLDivElement {
    const groupElement = document.createElement("div");
    groupElement.className = "descp-group";
    const indentElement = this._createDiv("groupindent", indent);
    groupElement.appendChild(indentElement);
    const nameElement = this._createDiv("groupname", name);
    groupElement.appendChild(nameElement);
    if (linkname !== null) {
      indentElement.addEventListener("click", () => {
        this.loadCards(linkname);
      });
      nameElement.addEventListener("click", () => {
        this.loadCards(linkname);
      });
    }
    if (subgroup !== null) {
      const groupretention = (
        (subgroup.stats.retention_weight / subgroup.stats.weight) *
        100
      ).toFixed(1);
      groupElement.appendChild(
        this._createDiv("grouptotal", `${subgroup.stats.total}`),
      );
      groupElement.appendChild(
        this._createDiv("groupretention", `${groupretention}%`),
      );
    }
    return groupElement;
  }

  updateGroupInfo() {
    if (this.currentGroup === null) {
      return;
    }
    const groupsContainer = document.getElementById("descp-groups")!;
    Array.from(groupsContainer.children).forEach((element) => {
      groupsContainer.removeChild(element);
    });
    if (this.currentName != "") {
      let parentName;
      if (this.currentName.includes("::")) {
        parentName = this.currentName.substring(
          0,
          this.currentName.lastIndexOf("::"),
        );
      } else {
        parentName = "";
      }
      groupsContainer.appendChild(
        this._groupElement("←", parentName, parentName, null),
      );
    }
    groupsContainer.appendChild(
      this._groupElement("  ", this.currentName, null, this.currentGroup),
    );
    Object.entries(this.currentGroup.groups)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .forEach(([key, subgroup]) => {
        groupsContainer.appendChild(
          this._groupElement(
            "  → ",
            key,
            this.currentName != "" ? `${this.currentName}::${key}` : key,
            subgroup,
          ),
        );
      });
  }

  renderCard(card: Card) {
    document.getElementById("question")!.textContent = card.content[0];
    document.getElementById("answer")!.textContent = "";
  }

  showAnswer() {
    document.getElementById("answer")!.textContent = "1";
  }

  initEventListeners() {
    document.getElementById("show-answer")!.addEventListener("click", () => {
      this.showAnswer();
    });
    document
      .getElementById("statemap-style")!
      .addEventListener("change", () => {
        this.updateStatemap();
      });
    document
      .getElementById("statemap-color")!
      .addEventListener("change", () => {
        this.updateStatemap();
      });
    document
      .getElementById("statemap-weight")!
      .addEventListener("change", () => {
        this.updateStatemap();
      });
    document.getElementById("statemap-time")!.addEventListener("input", () => {
      this.updateStatemap();
    });
  }

  updateStatemap() {}
}

class Color {
  constructor(
    public r: number,
    public g: number,
    public b: number,
  ) {}
  RGB(): [number, number, number] {
    return [this.r, this.g, this.b];
  }
  interpolate(other: Color, t: number): Color {
    return new Color(
      this.r + (other.r - this.r) * t,
      this.g + (other.g - this.g) * t,
      this.b + (other.b - this.b) * t,
    );
  }
}
class StateMap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imgdata: ImageData;
  public segments: Array<[number, Color]> = [];
  static readonly rp: Array<[number, number, boolean, number]> = [
    [0, 0, true, 1],
    [0, 1, false, 0],
    [1, 1, false, 0],
    [1, 0, true, 3],
  ];
  constructor() {
    this.canvas = document.getElementById(
      "statemap-canvas",
    )! as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    this.imgdata = this.ctx.createImageData(512, 512);
  }
  paint(x: number, y: number, i: number): void {
    const index = (x + y * 512) * 4;
    const pos = i / (512 * 512);
    for (let j = 0; j < this.segments.length; j++) {
      if (pos > this.segments[j][0]) {
        const c = this.segments[j][1];
        this.imgdata.data[index] = c.r;
        this.imgdata.data[index + 1] = c.g;
        this.imgdata.data[index + 2] = c.b;
        this.imgdata.data[index + 3] = 255;
        return;
      }
    }
  }
  itermap(
    x: number,
    y: number,
    a: number,
    flip: boolean,
    rotate: number,
    i: number,
  ): void {
    if (a < 1) {
      this.paint(x, y, i);
    } else {
      for (let j = 0; j < 4; j++) {
        const c = ((flip ? 3 - j : j) + rotate) % 4;
        const xv = StateMap.rp[c][0],
          yv = StateMap.rp[c][1],
          fv = StateMap.rp[j][2], // j, not c
          rv = StateMap.rp[j][3];
        this.itermap(
          x + xv * a,
          y + yv * a,
          a / 2,
          flip != fv,
          (rotate + (flip ? 4 - rv : rv)) % 4,
          i + j * a * a,
        );
      }
    }
  }
  drawmap(i: number): void {
    const testmap = [2, 5, 7, 8, 14];
    for (let i = 0; i < this.imgdata.data.length; i += 4) {
      this.imgdata.data[i] = 0;
      this.imgdata.data[i + 1] = 0;
      this.imgdata.data[i + 2] = 0;
      this.imgdata.data[i + 3] = 255;
    }
    this.ctx.clearRect(0, 0, 512, 512);
    this.itermap(0, 0, 256, i >= 4, i % 4, 0);
    this.ctx.putImageData(this.imgdata, 0, 0);
  }
}

// 当DOM加载完成后初始化应用
document.addEventListener("DOMContentLoaded", () => {
  new AnkirusApp();
});
