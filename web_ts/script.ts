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
  public currentName: string = "";
  public currentGroup: CardGroup | null = null;
  public currentCard: Card | null = null;
  private statemap: StateMap = new StateMap(this);

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
      let url = "cards/";
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
      this.updateDescription();
      this.updateStatemap();
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

  updateDescription() {
    if (this.currentCard !== null) {
      this.showGroup(false);
      this.renderCard(this.currentCard);
    } else {
      this.showGroup(true);
      this.updateGroupInfo();
    }
  }
  updateStatemap() {
    if (this.currentGroup !== null) {
      this.statemap.update(this.currentGroup);
    }
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
    this.showGroup(true);
  }

  showGroup(show: boolean) {
    document.getElementById("descp-groups")!.style.display = show
      ? "block"
      : "none";
    document.getElementById("descp-card")!.style.display = show
      ? "none"
      : "flex";
  }

  renderCard(card: Card) {
    document.getElementById("descp-card-groupname")!.innerHTML =
      this.currentName;
    document.getElementById("descp-card-retention")!.innerHTML =
      `${(card.stats.retention * 100).toFixed(1)}%`;
    document.getElementById("question")!.innerHTML = card.content[0];
    document.getElementById("answer")!.innerHTML = card.content[1];
    document.getElementById("answer")!.style.display = "none";
    document.getElementById("show-answer")!.style.display = "block";
  }

  showAnswer() {
    document.getElementById("answer")!.style.display = "block";
    document.getElementById("show-answer")!.style.display = "none";
  }

  initEventListeners() {
    document
      .getElementById("descp-card-group")!
      .addEventListener("click", () => {
        this.currentCard = null;
        this.updateDescription();
      });
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
  toString(): string {
    return `rgb(${this.r}, ${this.g}, ${this.b})`;
  }
}

function colorLine(colormap: Array<[number, Color]>, value: number): Color {
  if (value <= colormap[0][0]) {
    return colormap[0][1];
  }
  for (let i = 0; i < colormap.length - 1; i++) {
    if (value <= colormap[i + 1][0]) {
      return colormap[i][1].interpolate(
        colormap[i + 1][1],
        (value - colormap[i][0]) / (colormap[i + 1][0] - colormap[i][0]),
      );
    }
  }
  return colormap[colormap.length - 1][1];
}

const colormaps: Record<string, Record<string, Array<[number, Color]>>> = {
  retention: {
    goldie: [
      [0, new Color(0xf0, 0xf0, 0xf0)],
      [0.8, new Color(0xe8, 0xbf, 0xbf)],
      [0.9, new Color(0xff, 0xf7, 0x85)],
      [0.95, new Color(0x59, 0xe1, 0x5e)],
      [1.0, new Color(0x00, 0x88, 0xff)],
    ],
    bluesea: [
      [0, new Color(0xff, 0xff, 0xff)],
      [0.9, new Color(0xc0, 0xe0, 0xff)],
      [1, new Color(0x00, 0x88, 0xff)],
    ],
  },
  stability: {
    goldie: [
      [0, new Color(0xf0, 0xf0, 0xf0)],
      [1, new Color(0xe8, 0xbf, 0xbf)],
      [3, new Color(0xff, 0xf7, 0x85)],
      [7, new Color(0x59, 0xe1, 0x5e)],
      [15, new Color(0x00, 0x88, 0xff)],
    ],
    bluesea: [
      [0, new Color(0xff, 0xff, 0xff)],
      [1, new Color(0xc0, 0xe0, 0xff)],
      [15, new Color(0x00, 0x88, 0xff)],
    ],
  },
};

type RectItem =
  | {
      weight: number;
      mode: "group";
      group: CardGroup;
      cardsOnly: boolean;
      value: number;
    }
  | { weight: number; mode: "card"; card: Card; value: number };

class StateMap {
  private style: "goldie" | "bluesea" = "goldie";
  private color: "retention" | "stability" = "retention";
  private weight: "difficulty" | "count" = "difficulty";
  private time: number = 0;
  private svg: SVGSVGElement;
  public locked: boolean = false;
  constructor(private app: AnkirusApp) {
    this.svg = document.getElementById(
      "statemap-svg",
    )! as unknown as SVGSVGElement;
    this.config_reload();
  }
  config_reload() {
    this.style = (
      document.getElementById("statemap-style") as HTMLSelectElement
    ).value as "goldie" | "bluesea";
    this.color = (
      document.getElementById("statemap-color") as HTMLSelectElement
    ).value as "retention" | "stability";
    this.weight = (
      document.getElementById("statemap-weight") as HTMLSelectElement
    ).value as "difficulty" | "count";
    this.time = Number(
      (document.getElementById("statemap-time") as HTMLInputElement)!.value,
    );
  }

  update(group: CardGroup) {
    this.config_reload();
    Array.from(this.svg.children).forEach((element) => {
      this.svg.removeChild(element);
    });
    this.drawGroup(group, { x: 0, y: 0 }, { x: 512, y: 512 }, 5);
  }
  drawGroup(
    group: CardGroup,
    pos: { x: number; y: number },
    size: { x: number; y: number },
    layer: number,
    cardsOnly: boolean = false,
  ) {
    // background
    this._createRect(pos, size, null, 0);
    // groups and cards
    const rectItems: Array<RectItem> = [];
    if (Object.keys(group.groups).length == 0) {
      cardsOnly = true;
    }
    if (cardsOnly) {
      group.cards
        .sort((a, b) => b.stats.weight - a.stats.weight)
        .forEach((card) => {
          let weight = 0;
          let value = 0;
          switch (this.weight) {
            case "difficulty":
              weight = card.stats.weight;
              break;
            case "count":
              weight = 1;
              break;
          }
          switch (this.color) {
            case "retention":
              value = card.stats.retention;
              break;
            case "stability":
              value = card.stats.stability;
              break;
          }
          rectItems.push({ weight, mode: "card", card, value });
        });
    } else {
      // groups and an optional "cards" group
      let value = 0;
      switch (this.color) {
        case "retention":
          value = group.stats.retention_weight / group.stats.weight;
          break;
        case "stability":
          value = group.stats.stability_weight / group.stats.weight;
          break;
      }
      Object.entries(group.groups)
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .forEach(([key, subgroup]) => {
          rectItems.push({
            weight: subgroup.stats.weight,
            mode: "group",
            group: subgroup,
            cardsOnly: false,
            value,
          });
        });
      if (group.cards.length !== 0) {
        const cardsWeight = group.cards.reduce(
          (acc, cur) => acc + cur.stats.weight,
          0,
        );
        rectItems.push({
          weight: cardsWeight,
          mode: "group",
          group: group,
          cardsOnly: true,
          value,
        });
      }
    }
    // areas arranging
    this.arrange(rectItems, pos, size, layer, cardsOnly);
    // border
    this._createBorder(pos, size, layer);
  }
  arrange(
    rectItems: Array<RectItem>,
    pos: { x: number; y: number },
    size: { x: number; y: number },
    layer: number,
    cardsOnly: boolean,
  ) {
    pos = { ...pos };
    size = { ...size };
    let totalWeight = rectItems.reduce((acc, cur) => acc + cur.weight, 0);
    let X: "x" | "y" = "x";
    let Y: "x" | "y" = "y";
    let i = 0;
    while (i < rectItems.length) {
      if (cardsOnly && size.x > size.y) {
        X = "y";
        Y = "x";
      } else {
        X = "x";
        Y = "y";
      }
      // skip 0s
      while (i < rectItems.length) {
        const item2 = rectItems[i];
        if (item2.weight != 0) {
          break;
        }
        i++;
      }
      // j=i+1
      const item = rectItems[i];
      let rowWeight = item.weight;
      let YL = (rowWeight / totalWeight) * size[Y];
      let XL = (item.weight / rowWeight) * size[X];
      let A = YL > XL ? XL / YL : YL / XL;
      let j = i + 1;
      while (j < rectItems.length) {
        const item2 = rectItems[j];
        if (item2.weight == 0) {
          j++;
          continue;
        }
        rowWeight += item2.weight;
        YL = (rowWeight / totalWeight) * size[Y];
        XL = (item2.weight / rowWeight) * size[X];
        let A2 = YL > XL ? XL / YL : YL / XL;
        if (A2 < A) {
          rowWeight -= item2.weight;
          YL = (rowWeight / totalWeight) * size[Y];
          break;
        }
        A = A2;
        j++;
      }
      let pos0 = { ...pos };
      let size0 = { ...size };
      YL = (rowWeight / totalWeight) * size[Y];
      size0[Y] = YL;
      console.log(i, j);
      for (let k = i; k < j; k++) {
        const item2 = rectItems[k];
        XL = (item2.weight / rowWeight) * size[X];
        size0[X] = XL;
        // item2 => pos: {X0, pos[Y]} size: {XL, YL}
        this.place(item2, pos0, size0, layer);
        pos0[X] += XL;
      }
      pos[Y] += YL;
      size[Y] -= YL;
      totalWeight -= rowWeight;
      i = j;
    }
  }
  place(
    item: RectItem,
    pos: { x: number; y: number },
    size: { x: number; y: number },
    layer: number,
  ) {
    if (item.mode == "card") {
      this._createRect(pos, size, item.card, item.value);
    } else {
      this.drawGroup(item.group, pos, size, layer, item.cardsOnly);
    }
  }
  _createRect(
    pos: { x: number; y: number },
    size: { x: number; y: number },
    card: Card | null,
    value: number,
  ) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", pos.x.toFixed(1).toString());
    rect.setAttribute("y", pos.y.toFixed(1).toString());
    rect.setAttribute("width", size.x.toFixed(1).toString());
    rect.setAttribute("height", size.y.toFixed(1).toString());
    rect.setAttribute("stroke", "grey");
    rect.setAttribute("stroke-width", "0.5");
    rect.setAttribute("fill", "lightgrey");
    if (card !== null) {
      let color = colorLine(colormaps[this.color][this.style], value);
      rect.setAttribute("fill", color.toString());
      rect.setAttribute(
        "stroke",
        color.interpolate(new Color(0, 0, 0), 0.05).toString(),
      );
      rect.addEventListener("mouseover", () => {
        if (!this.locked) {
          this.app.currentCard = card;
          this.app.updateDescription();
        }
      });
      rect.addEventListener("mouseout", () => {
        if (!this.locked) {
          this.app.currentCard = null;
          this.app.updateDescription();
        }
      });
      rect.addEventListener("click", () => {
        if (this.app.currentCard !== card || !this.locked) {
          this.app.currentCard = card;
          this.app.updateDescription();
          this.locked = true;
        } else {
          this.app.currentCard = null;
          this.app.updateDescription();
          this.locked = false;
        }
      });
    }
    this.svg.appendChild(rect);
  }
  _createBorder(
    pos: { x: number; y: number },
    size: { x: number; y: number },
    layer: number,
  ) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", pos.x.toFixed(1).toString());
    rect.setAttribute("y", pos.y.toFixed(1).toString());
    rect.setAttribute("width", size.x.toFixed(1).toString());
    rect.setAttribute("height", size.y.toFixed(1).toString());
    rect.setAttribute("stroke", "white");
    rect.setAttribute("stroke-width", (layer / 2).toFixed(1).toString());
    rect.setAttribute("fill", "none");
    this.svg.appendChild(rect);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new AnkirusApp();
});
