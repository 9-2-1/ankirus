type RectItem =
  | {
      weight: number;
      mode: "group";
      group: CardGroup;
      cardsOnly: false;
      value: number;
      groupname: string;
    }
  | {
      weight: number;
      mode: "group";
      group: CardGroup;
      cardsOnly: true;
      value: number;
    }
  | {
      weight: number;
      mode: "card";
      card: Card;
      cardgroupname: Array<string>;
      value: number;
    };

class StateMap {
  private svg: SVGSVGElement;
  private lockIndicator: SVGRectElement | null = null;
  public lockedItem: Card | null = null;
  constructor(private app: AnkirusApp) {
    this.svg = document.getElementById(
      "statemap-svg",
    )! as unknown as SVGSVGElement;
  }
  update(group: CardGroup) {
    this.updateLockIndicator(false);
    Array.from(this.svg.children).forEach((element) => {
      this.svg.removeChild(element);
    });
    this.drawGroup(group, [], { x: 0, y: 0 }, { x: 512, y: 512 }, 5);
  }
  drawGroup(
    group: CardGroup,
    cardgroupname: Array<string>,
    pos: { x: number; y: number },
    size: { x: number; y: number },
    layer: number,
    cardsOnly: boolean = false,
  ) {
    // background
    this._createRect(pos, size, null, 0, cardgroupname);
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
          switch (this.app.options.weight) {
            case "difficulty":
              weight = card.stats.weight;
              break;
            case "count":
              weight = 1;
              break;
          }
          switch (this.app.options.value) {
            case "retention":
              value = card.stats.retention;
              break;
            case "stability":
              value = card.stats.stability;
              break;
          }
          rectItems.push({ weight, mode: "card", card, cardgroupname, value });
        });
    } else {
      // groups and an optional "cards" group
      let value = 0;
      switch (this.app.options.value) {
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
            weight:
              this.app.options.weight == "difficulty"
                ? subgroup.stats.weight
                : subgroup.stats.total,
            mode: "group",
            group: subgroup,
            cardsOnly: false,
            value,
            groupname: key,
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
    this.arrange(cardgroupname, rectItems, pos, size, layer, cardsOnly);
    // border
    this._createBorder(pos, size, layer);
  }
  arrange(
    cardgroupname: Array<string>,
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
      for (let k = i; k < j; k++) {
        const item2 = rectItems[k];
        XL = (item2.weight / rowWeight) * size[X];
        size0[X] = XL;
        // item2 => pos: {X0, pos[Y]} size: {XL, YL}
        let cardgroupname2 = cardgroupname;
        if (item2.mode === "group" && !item2.cardsOnly) {
          cardgroupname2 = [...cardgroupname2, item2.groupname];
        }
        this.place(cardgroupname2, item2, pos0, size0, layer);
        pos0[X] += XL;
      }
      pos[Y] += YL;
      size[Y] -= YL;
      totalWeight -= rowWeight;
      i = j;
    }
  }
  place(
    cardgroupname: Array<string>,
    item: RectItem,
    pos: { x: number; y: number },
    size: { x: number; y: number },
    layer: number,
  ) {
    if (item.mode == "card") {
      this._createRect(pos, size, item.card, item.value, cardgroupname);
    } else {
      this.drawGroup(
        item.group,
        cardgroupname,
        pos,
        size,
        layer,
        item.cardsOnly,
      );
    }
  }
  _createRect(
    pos: { x: number; y: number },
    size: { x: number; y: number },
    card: Card | null,
    value: number,
    cardgroupname: Array<string>,
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
          this.app.currentCardGroup = cardgroupname;
          this.app.updateDescription();
        }
      });
      rect.addEventListener("mouseout", () => {
        if (this.lockedItem === null) {
          this.app.currentCard = null;
          this.app.currentCardGroup = cardgroupname;
          this.app.updateDescription();
        }
      });
      const pos0 = { ...pos };
      const size0 = { ...size };
      rect.addEventListener("click", () => {
        if (this.lockedItem !== card) {
          this.app.currentCard = card;
          this.app.currentCardGroup = cardgroupname;
          this.app.updateDescription();
          this.lockedItem = card;
          this.updateLockIndicator(true, pos0, size0);
        } else {
          this.app.currentCard = null;
          this.app.currentCardGroup = cardgroupname;
          this.app.updateDescription();
          this.lockedItem = null;
          this.updateLockIndicator(false);
        }
      });
    }
    this.svg.appendChild(rect);
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
      this.lockIndicator = this._createLockIndicator(pos!, size!);
    }
  }
  _createLockIndicator(
    pos: { x: number; y: number },
    size: { x: number; y: number },
  ): SVGRectElement {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", pos.x.toFixed(1).toString());
    rect.setAttribute("y", pos.y.toFixed(1).toString());
    rect.setAttribute("width", size.x.toFixed(1).toString());
    rect.setAttribute("height", size.y.toFixed(1).toString());
    rect.setAttribute("stroke", "#00aaff");
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
  }
}
