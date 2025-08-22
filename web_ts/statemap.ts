type RectItem =
  | {
      mode: "group";
      weight: number;
      value: number;
      group: CardGroup;
      cardsOnly: false;
      groupname: string;
    }
  | {
      mode: "group";
      weight: number;
      value: number;
      group: CardGroup;
      cardsOnly: true;
    }
  | {
      mode: "card";
      weight: number;
      value: number;
      card: Card;
    };

class StateMap {
  private svg: SVGSVGElement;
  private legend_svg: SVGSVGElement;
  private lockIndicator: SVGRectElement | null = null;
  public lockedItem: Card | null = null;
  constructor(private app: AnkirusApp) {
    this.svg = document.getElementById(
      "statemap-svg",
    )! as unknown as SVGSVGElement;
    this.legend_svg = document.getElementById(
      "statemap-legend-svg",
    )! as unknown as SVGSVGElement;
  }
  update(group: CardGroup) {
    this.updateLockIndicator(false);
    Array.from(this.svg.children).forEach((element) => {
      this.svg.removeChild(element);
    });
    this.drawGroup(group, { x: 0, y: 0 }, { x: 512, y: 512 }, 5);
    this.updateLegend();
  }
  updateLegend() {
    Array.from(this.legend_svg.children).forEach((element) => {
      this.legend_svg.removeChild(element);
    });
    const colorline = colormaps[this.app.options.value][this.app.options.style];
    const max = colorline[colorline.length - 1][0];
    for (let a = 0; a < 512; a++) {
      const v = (a / 512) * max;
      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      rect.setAttribute("x", a.toString());
      rect.setAttribute("y", "0");
      rect.setAttribute("width", "1");
      rect.setAttribute("height", "16");
      const color = colorLine(colorline, v).toString();
      rect.setAttribute("fill", color);
      rect.setAttribute("stroke", color);
      rect.setAttribute("stroke-width", "0.5");
      this.legend_svg.appendChild(rect);
    }
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", "512");
    rect.setAttribute("height", "16");
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke", "white");
    rect.setAttribute("stroke-width", "5");
    this.legend_svg.appendChild(rect);
    for (let i = 0; i < colorline.length; i++) {
      const v = colorline[i][0];
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.setAttribute("x", ((v / max) * 512).toString());
      text.setAttribute("y", "26");
      const color = colorLine(colorline, v)
        .interpolate(new Color(0, 0, 0), 0.2)
        .toString();
      text.setAttribute("font-size", "12");
      text.setAttribute("font-weight", "bold");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", color);
      text.textContent = v.toString();
      this.legend_svg.appendChild(text);
    }
  }
  drawGroup(
    group: CardGroup,
    pos: { x: number; y: number },
    size: { x: number; y: number },
    layer: number,
    cardsOnly: boolean = false,
  ) {
    // background
    const value = group.st_value_weight / group.st_weight;
    this._createRect(pos, size, null, group.st_value_weight / group.st_weight);
    // groups and cards
    const rectItems: Array<RectItem> = [];
    if (group.groups.size == 0) {
      cardsOnly = true;
    }
    if (cardsOnly) {
      [...group.cards]
        .sort((a, b) => b.st_weight - a.st_weight)
        .forEach((card) => {
          rectItems.push({
            mode: "card",
            weight: card.st_weight,
            value: card.st_value,
            card,
          });
        });
    } else {
      // groups and an optional "cards" group
      Array.from(group.groups.entries())
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .forEach(([key, subgroup]) => {
          rectItems.push({
            mode: "group",
            weight: subgroup.st_weight,
            value: subgroup.st_value_weight / subgroup.st_weight,
            group: subgroup,
            cardsOnly: false,
            groupname: key,
          });
        });
      if (group.cards.length !== 0) {
        const cardsWeight = group.cards.reduce(
          (acc, cur) => acc + cur.st_weight,
          0,
        );
        const cardsWeightValue = group.cards.reduce(
          (acc, cur) => acc + cur.st_value * cur.st_weight,
          0,
        );
        rectItems.push({
          mode: "group",
          weight: cardsWeight,
          value: cardsWeightValue / cardsWeight,
          group: group,
          cardsOnly: true,
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
    // Squared Treemap
    pos = { ...pos };
    size = { ...size };
    let totalWeight = rectItems.reduce((acc, cur) => acc + cur.weight, 0);
    let X: "x" | "y" = "x";
    let Y: "x" | "y" = "y";
    let i = 0;
    while (i < rectItems.length) {
      if (
        cardsOnly &&
        this.app.options.weight == "difficulty" &&
        size.x > size.y
      ) {
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
      for (let k = i; k < j; k++) {
        const item2 = rectItems[k];
        XL = (item2.weight / rowWeight) * size[X];
        size0[X] = XL;
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
      if (item.card.paused) {
        this._createIndicator(pos!, size!, new Color(0xff, 0x00, 0x00));
      }
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
      let color = colorLine(
        colormaps[this.app.options.value][this.app.options.style],
        value,
      );
      rect.setAttribute("fill", color.toString());
      rect.setAttribute(
        "stroke",
        color.interpolate(new Color(0, 0, 0), 0.05).toString(),
      );
      rect.addEventListener("mouseover", () => {
        if (this.lockedItem === null) {
          this.app.currentCard = card;
          this.app.updateDescription();
        }
      });
      rect.addEventListener("mouseout", () => {
        if (this.lockedItem === null) {
          this.app.currentCard = null;
          this.app.updateDescription();
        }
      });
      const pos0 = { ...pos };
      const size0 = { ...size };
      rect.addEventListener("click", () => {
        if (this.lockedItem !== card) {
          this.app.currentCard = card;
          this.app.updateDescription();
          this.lockedItem = card;
          this.updateLockIndicator(true, pos0, size0);
        } else {
          this.app.currentCard = null;
          this.app.updateDescription();
          this.lockedItem = null;
          this.updateLockIndicator(false);
        }
      });
    }
    this.svg.appendChild(rect);
    return rect;
  }
  updateLockIndicator(locked: false): void;
  updateLockIndicator(
    locked: true,
    pos: { x: number; y: number },
    size: { x: number; y: number },
  ): void;
  updateLockIndicator(
    locked: boolean,
    pos?: { x: number; y: number },
    size?: { x: number; y: number },
  ) {
    if (this.lockIndicator !== null) {
      this.svg.removeChild(this.lockIndicator);
      this.lockIndicator = null;
    }
    if (locked) {
      this.lockIndicator = this._createIndicator(
        pos!,
        size!,
        new Color(0x00, 0x88, 0xff),
      );
    }
  }
  _createIndicator(
    pos: { x: number; y: number },
    size: { x: number; y: number },
    color: Color,
  ): SVGRectElement {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", (pos.x + 1.5).toFixed(1).toString());
    rect.setAttribute("y", (pos.y + 1.5).toFixed(1).toString());
    rect.setAttribute("width", (size.x - 3).toFixed(1).toString());
    rect.setAttribute("height", (size.y - 3).toFixed(1).toString());
    rect.setAttribute("stroke", color.toString());
    rect.setAttribute("stroke-width", "3");
    rect.setAttribute("fill", "none");
    this.svg.appendChild(rect);
    return rect;
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
    return rect;
  }
}
