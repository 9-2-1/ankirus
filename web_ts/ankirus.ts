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
      let groupstat = "";
      if (this.options.value == "retention") {
        groupstat =
          (
            (subgroup.stats.retention_weight / subgroup.stats.weight) *
            100
          ).toFixed(1) + "%";
      } else {
        groupstat =
          (subgroup.stats.stability_weight / subgroup.stats.weight).toFixed(1) +
          "d";
      }
      groupElement.appendChild(
        this._createDiv(
          "grouptotal",
          this.options.weight == "difficulty"
            ? subgroup.stats.weight.toFixed(1)
            : subgroup.stats.total.toString(),
        ),
      );
      groupElement.appendChild(this._createDiv("groupretention", groupstat));
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
    document.getElementById("descp-card-groupname")!.innerHTML =
      this.currentCardGroup.join("::");
    document.getElementById("descp-card-groupname")!.title =
      this.currentCardGroup.join("::");
    document.getElementById("descp-card-retention")!.innerHTML =
      this.options.value == "retention"
        ? `${(card.stats.retention * 100).toFixed(1)}%`
        : `${card.stats.stability.toFixed(1)}d`;
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
    document.getElementById("options-color")!.addEventListener("change", () => {
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
