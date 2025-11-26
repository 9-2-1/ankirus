class Options {
  public style: "goldie" | "bluesea" = "goldie";
  public value: "retention" | "stability" | "stability-0" = "retention";
  public weight: "difficulty" | "count" = "difficulty";
  syncChange() {
    this.style = (document.getElementById("options-style") as HTMLSelectElement)
      .value as "goldie" | "bluesea";
    this.value = (document.getElementById("options-value") as HTMLSelectElement)
      .value as "retention" | "stability" | "stability-0";
    this.weight = (
      document.getElementById("options-weight") as HTMLSelectElement
    ).value as "difficulty" | "count";
  }
}
