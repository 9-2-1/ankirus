class AnkirusApp {
  public curGroupName: Array<string> = [];
  public curGroup: CardGroup | null = null;
  public currentCard: Card | null = null;
  public options: Options = new Options();

  private statemap: StateMap = new StateMap(this);
  private rootGroup: CardGroup | null = null;

  constructor() {
    this.init();
  }

  async init() {
    this.options.syncChange();
    await this.loadCards();
    this.initEventListeners();
  }

  async loadCards() {
    try {
      let url = "cards/";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = (await response.json()) as Array<ReplyCard | ReplyGroup>;
      this.rootGroup = this._parseReply(data);
      this.selectGroup(this.curGroupName);
    } catch (error) {
      console.error("Error loading cards:", error);
    }
  }

  selectGroup(group: Array<string>) {
    this.curGroupName = group;
    this.curGroup = this.rootGroup;
    for (const name of this.curGroupName) {
      if (this.curGroup === null) {
        break;
      }
      this.curGroup = this.curGroup.groups.get(name) ?? null;
    }
    this.updateStat();
  }

  _retention(card: Card, timestamp: number) {
    const S = card.stability;
    const T = card.time;
    const DECAY = card.decay;
    if (S === 0) {
      return 0;
    }
    const factor = Math.pow(0.9, 1.0 / -DECAY) - 1.0;
    const days_elapsed = (timestamp - T) / 86400.0;
    const reta = Math.pow((days_elapsed / S) * factor + 1.0, -DECAY);
    if (typeof reta === "number") {
      return reta;
    }
    throw new Error("retrievability is not a float");
  }

  updateGroupStat(group: CardGroup) {
    const curTime = Date.now() / 1000;
    group.st_weight = 0;
    group.st_value_weight = 0;
    group.groups.forEach((subgroup) => {
      this.updateGroupStat(subgroup);
      group.st_weight += subgroup.st_weight;
      group.st_value_weight += subgroup.st_value_weight;
    });
    for (const card of group.cards) {
      switch (this.options.weight) {
        case "count":
          card.st_weight = 1;
          break;
        case "difficulty":
          card.st_weight = card.difficulty;
          break;
      }
      switch (this.options.value) {
        case "retention":
          card.st_value = this._retention(card, curTime);
          break;
        case "stability":
          card.st_value =
            card.stability - Math.max(curTime - card.time, 0) / 86400;
          break;
        case "stability-0":
          card.st_value = card.stability / 86400;
          break;
      }
      group.st_weight += card.st_weight;
      group.st_value_weight += card.st_value * card.st_weight;
    }
  }

  updateStat() {
    if (this.rootGroup === null) {
      return;
    }
    this.updateGroupStat(this.rootGroup);
    this.updateDescription();
    this.updateStatemap();
  }

  _parseReply(data: Array<ReplyCard | ReplyGroup>): CardGroup {
    const root: CardGroup = {
      cards: [],
      groups: new Map(),
      st_weight: 0,
      st_value_weight: 0,
    };
    let curGroup: CardGroup = root;
    let curGroupName: Array<string> = [];
    for (const item of data) {
      if ("group" in item) {
        curGroup = root;
        curGroupName = item.group;
        curGroupName.forEach((name) => {
          if (!curGroup.groups.has(name)) {
            curGroup.groups.set(name, {
              cards: [],
              groups: new Map(),
              st_weight: 0,
              st_value_weight: 0,
            });
          }
          curGroup = curGroup.groups.get(name)!;
        });
      } else {
        let card: Card = Object.assign({}, item, {
          group: curGroupName,
          st_weight: 0,
          st_value: 0,
        });
        curGroup.cards.push(card);
      }
    }
    return root;
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
    linkname: Array<string> | null,
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
        this.selectGroup(linkname);
      });
      nameElement.addEventListener("click", () => {
        this.selectGroup(linkname);
      });
    }
    if (subgroup !== null) {
      let str_value = "";
      let str_weight = "";
      const colorline = colormaps[this.options.value][this.options.style];
      const value = subgroup.st_value_weight / subgroup.st_weight;
      switch (this.options.weight) {
        case "count":
          str_weight = subgroup.st_weight.toString();
          break;
        case "difficulty":
          str_weight = subgroup.st_weight.toFixed(1);
          break;
      }
      switch (this.options.value) {
        case "retention":
          str_value = (value * 100).toFixed(1) + "%";
          break;
        case "stability":
        case "stability-0":
          str_value = value.toFixed(1) + "d";
          break;
      }
      groupElement.appendChild(this._createDiv("groupweight", str_weight));
      const statElement = this._createDiv("groupvalue", str_value);
      statElement.style.color = colorLine(colorline, value)
        .interpolate(Color.rgb(0, 0, 0), 0.2)
        .toString();
      groupElement.appendChild(statElement);
    }
    return groupElement;
  }

  updateDescription() {
    if (this.currentCard !== null) {
      this.showGroup(false);
      this.renderCard(this.currentCard);
    } else {
      this.showGroup(true);
      this.renderGroup();
    }
  }

  updateStatemap() {
    if (this.curGroup !== null) {
      this.statemap.update(this.curGroup);
    }
  }

  renderGroup() {
    if (this.curGroup === null) {
      return;
    }
    const groupsContainer = document.getElementById("descp-groups")!;
    Array.from(groupsContainer.children).forEach((element) => {
      groupsContainer.removeChild(element);
    });
    let parent = this.rootGroup;
    let parentName = [];
    for (const name of this.curGroupName) {
      if (parent === null) {
        break;
      }
      groupsContainer.appendChild(
        this._groupElement("←", parentName.join("::"), [...parentName], parent),
      );
      parent = parent.groups.get(name) ?? null;
      parentName.push(name);
    }
    groupsContainer.appendChild(
      this._groupElement(
        "  ",
        this.curGroupName.join("::"),
        this.curGroupName,
        this.curGroup,
      ),
    );
    Array.from(this.curGroup.groups.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .forEach(([key, subgroup]) => {
        groupsContainer.appendChild(
          this._groupElement(
            "  → ",
            key,
            [...this.curGroupName, key],
            subgroup,
          ),
        );
      });
    this.showGroup(true);
  }

  showGroup(show: boolean) {
    document.getElementById("descp-groups")!.style.display = show
      ? "flex"
      : "none";
    document.getElementById("descp-card")!.style.display = show
      ? "none"
      : "flex";
  }

  renderCard(card: Card) {
    const colorline = colormaps[this.options.value][this.options.style];
    document.getElementById("descp-card-groupname")!.textContent =
      card.group.join("::");
    document.getElementById("descp-card-groupname")!.title =
      card.group.join("::");
    let str_weight = "";
    let str_value = "";
    switch (this.options.weight) {
      case "count":
        str_weight = "";
        document.getElementById("descp-card-weight")!.style.display = "none";
        break;
      case "difficulty":
        str_weight = card.st_weight.toFixed(1);
        document.getElementById("descp-card-weight")!.textContent = str_weight;
        document.getElementById("descp-card-weight")!.style.display = "block";
        break;
    }
    switch (this.options.value) {
      case "retention":
        str_value = (card.st_value * 100).toFixed(1) + "%";
        break;
      case "stability":
      case "stability-0":
        str_value = card.st_value.toFixed(1) + "d";
        break;
    }
    document.getElementById("descp-card-value")!.textContent = str_value;
    document.getElementById("descp-card-value")!.style.color = colorLine(
      colorline,
      card.st_value,
    )
      .interpolate(Color.rgb(0, 0, 0), 0.2)
      .toString();
    const to_typeset = ["#question", "#answer"];
    MathJax.typesetClear(to_typeset);
    document.getElementById("question")!.innerHTML = card.front;
    document.getElementById("answer")!.innerHTML = card.back;
    document.getElementById("answer")!.style.display = "none";
    document.getElementById("show-answer")!.style.display = "block";
    MathJax.typeset(to_typeset);
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
        this.statemap.lockedItem = null;
        this.updateDescription();
        this.updateStatemap();
      });
    document.getElementById("show-answer")!.addEventListener("click", () => {
      this.showAnswer();
    });
    document.getElementById("options-style")!.addEventListener("change", () => {
      this.options.syncChange();
      this.updateStat();
    });
    document.getElementById("options-value")!.addEventListener("change", () => {
      this.options.syncChange();
      this.updateStat();
    });
    const reloadElement = document.getElementById(
      "options-reload",
    )! as HTMLButtonElement;
    reloadElement.addEventListener("click", () => {
      reloadElement.disabled = true;
      this.loadCards().finally(() => {
        reloadElement.disabled = false;
      });
    });
    document
      .getElementById("options-weight")!
      .addEventListener("change", () => {
        this.options.syncChange();
        this.updateStat();
      });
  }
}
