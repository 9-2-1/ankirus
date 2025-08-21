class AnkirusApp {
  public currentGroupName: Array<string> = [];
  public currentGroup: CardGroup | null = null;
  public currentCard: Card | null = null;
  public currentCardGroup: Array<string> = [];
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

  async loadCards(group?: Array<string>) {
    try {
      let url = "cards/";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.rootGroup = data;
      this.currentGroupName = group ?? [];
      this.currentGroup = this.rootGroup;
      for (const name of this.currentGroupName) {
        if (name != "") {
          this.currentGroup = this.currentGroup!.groups[name]!;
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
        this.loadCards(linkname);
      });
      nameElement.addEventListener("click", () => {
        this.loadCards(linkname);
      });
    }
    if (subgroup !== null) {
      let value = 0;
      let groupstat = "";
      let groupcolor: Color = new Color(0, 0, 0);
      const colorline = colormaps[this.options.value][this.options.style];
      switch (this.options.value) {
        case "retention":
          value = subgroup.stats.retention_weight / subgroup.stats.weight;
          groupstat = (value * 100).toFixed(1) + "%";

          break;
        case "stability":
          value = subgroup.stats.stability_weight / subgroup.stats.weight;
          groupstat = value.toFixed(1) + "d";
          break;
      }
      groupElement.appendChild(
        this._createDiv(
          "grouptotal",
          this.options.weight == "difficulty"
            ? subgroup.stats.weight.toFixed(1)
            : subgroup.stats.total.toString(),
        ),
      );
      const statElement = this._createDiv("groupretention", groupstat);
      statElement.style.color = colorLine(colorline, value)
        .interpolate(new Color(0, 0, 0), 0.2)
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
    if (this.currentGroupName.length > 0) {
      const parentName = this.currentGroupName.slice(0, -1);
      groupsContainer.appendChild(
        this._groupElement("←", parentName.join("::"), parentName, null),
      );
    }
    groupsContainer.appendChild(
      this._groupElement(
        "  ",
        this.currentGroupName.join("::"),
        this.currentGroupName,
        this.currentGroup,
      ),
    );
    Object.entries(this.currentGroup.groups)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .forEach(([key, subgroup]) => {
        groupsContainer.appendChild(
          this._groupElement(
            "  → ",
            key,
            [...this.currentGroupName, key],
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
      this.currentCardGroup.join("::");
    document.getElementById("descp-card-groupname")!.title =
      this.currentCardGroup.join("::");
    switch (this.options.value) {
      case "retention":
        document.getElementById("descp-card-retention")!.textContent =
          `${(card.stats.retention * 100).toFixed(1)}%`;
        document.getElementById("descp-card-retention")!.style.color =
          colorLine(colorline, card.stats.retention)
            .interpolate(new Color(0, 0, 0), 0.2)
            .toString();
        break;
      case "stability":
        document.getElementById("descp-card-retention")!.textContent =
          `${card.stats.stability.toFixed(1)}d`;
        document.getElementById("descp-card-retention")!.style.color =
          colorLine(colorline, card.stats.stability)
            .interpolate(new Color(0, 0, 0), 0.2)
            .toString();
        break;
    }
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
        this.statemap.lockedItem = null;
        this.updateDescription();
        this.updateStatemap();
      });
    document.getElementById("show-answer")!.addEventListener("click", () => {
      this.showAnswer();
    });
    document.getElementById("options-style")!.addEventListener("change", () => {
      this.options.syncChange();
      this.updateStatemap();
      this.updateDescription();
    });
    document.getElementById("options-value")!.addEventListener("change", () => {
      this.options.syncChange();
      this.updateStatemap();
      this.updateDescription();
    });
    document
      .getElementById("options-weight")!
      .addEventListener("change", () => {
        this.options.syncChange();
        this.updateStatemap();
        this.updateDescription();
      });
    document.getElementById("options-time")!.addEventListener("input", () => {
      this.options.syncChange();
      this.updateStatemap();
      // no need to update description
    });
  }
}
