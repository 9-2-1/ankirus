// 定义数据类型
type RetentionParams = {
  basetime: number;  // Unix Timestamp
  difficulty: number;
  stability: number;
  decay: number;
}

type CardStats = {
  total: number;
  paused: 0 | 1;
  weight: number;
  retention: number;
  stability: number;
}

type Card = {
  cid: number;  // 对应后端的cid
  content: [string, string];
  retention_params: RetentionParams;
  paused: boolean;
  stats: CardStats;
}

type CardGroupStats = {
  total: number;
  paused: number;
  weight: number;
  retention_weight: number;
  stability_weight: number;
}

type CardGroup = {
  cards: Card[];
  groups: Record<string, CardGroup>;
  stats: CardGroupStats;
}

// 主应用类
class AnkirusApp {
  private currentName: string = "";
  private currentGroup: CardGroup | null = null;
  private currentCardIndex: number = 0;
  private cards: Card[] = [];
  private statemapData: any[] = [];

  constructor() {
    // 初始化应用
    this.init();
  }

  async init() {
    // 加载卡片数据
    await this.loadCards();
    // 初始化事件监听
    this.initEventListeners();
    // 渲染第一组卡片
    if (this.cards.length > 0) {
      this.renderCard(this.cards[0]);
    }
    // 初始化状态图
    this.initStatemap();
  }

  // 递归收集组及其子组中的所有卡片
  private flattenCards(group: CardGroup): Card[] {
    let allCards: Card[] = [...group.cards];
    Object.entries(group.groups).forEach(([key, subgroup]) => {
      allCards = [...allCards, ...this.flattenCards(subgroup)];
    });
    return allCards;
  }

  async loadCards(group?: string) {
    try {
      // 显示加载状态
      document.getElementById("question")!.textContent = "Loading...";
      document.getElementById("answer")!.textContent = "";
  
      // 构建API请求URL
      let url = "/cards/";
      if (group) {
        url += `?group=${encodeURIComponent(group)}`;
      }
  
      // 从API获取数据
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      this.currentName = group ?? "";
      this.currentGroup = data;
      // 使用flattenCards方法获取组及其子组中的所有卡片
      this.cards = this.flattenCards(data);
      this.currentCardIndex = 0;
  
      // 更新组信息
      this.updateGroupInfo();
  
      // 如果有卡片，渲染第一张
      if (this.cards.length > 0) {
        this.renderCard(this.cards[0]);
      } else {
        document.getElementById("question")!.textContent = "No cards found";
      }
  
      // 更新状态图数据
      this.updateStatemapData();
    } catch (error) {
      console.error("Error loading cards:", error);
      document.getElementById("question")!.textContent = "Error loading cards";
      document.getElementById("answer")!.textContent = String(error);
    }
  }

  updateGroupInfo() {
    if (!this.currentGroup) return;

    // 更新组名称
    document.getElementById("groupname")!.textContent = this.currentName;

    // 更新组保留率
    document.getElementById("retention")!.textContent =
      `${(this.currentGroup.stats.retention_weight / this.currentGroup.stats.weight * 100).toFixed(1)}%`;

    // 更新子组信息
    const groupsContainer = document.getElementById("descp-groups")!;
    groupsContainer.innerHTML = "";

    Object.entries(this.currentGroup.groups).forEach(([key, subgroup]) => {
      const groupElement = document.createElement("div");
      groupElement.className = "descp-group";

      console.log(subgroup);
      groupElement.innerHTML = `
          <div class="groupname">${this.currentName}::${key}</div>
          <div class="grouplearnt">${subgroup.stats.total}</div>
          <div class="grouptotal">${subgroup.stats.total}</div>
          <div class="groupretention">${(subgroup.stats.retention_weight / subgroup.stats.weight * 100).toFixed(1)}%</div>
      `;

      // 添加点击事件，加载该子组
      groupElement.addEventListener("click", () => {
        if (this.currentName != ""){
          this.loadCards(`${this.currentName}::${key}`);
        }else{
          this.loadCards(key);
        }
      });

      groupsContainer.appendChild(groupElement);
      });
  }

  renderCard(card: Card) {
    // 显示问题
    document.getElementById("question")!.textContent = card.content[0];
    // 隐藏答案
    document.getElementById("answer")!.textContent = "";
  }

  showAnswer() {
    if (this.cards.length === 0 || this.currentCardIndex >= this.cards.length)
      return;

    // 显示答案
    const card = this.cards[this.currentCardIndex];
    document.getElementById("answer")!.textContent = card.content[1];
  }

  initEventListeners() {
    // 显示答案按钮点击事件
    document.getElementById("show-answer")!.addEventListener("click", () => {
      this.showAnswer();
    });

    // 状态图样式选择事件
    document
      .getElementById("statemap-style")!
      .addEventListener("change", () => {
        this.updateStatemap();
      });

    // 状态图颜色选择事件
    document
      .getElementById("statemap-color")!
      .addEventListener("change", () => {
        this.updateStatemap();
      });

    // 状态图权重选择事件
    document
      .getElementById("statemap-weight")!
      .addEventListener("change", () => {
        this.updateStatemap();
      });

    // 状态图时间滑块事件
    document.getElementById("statemap-time")!.addEventListener("input", () => {
      this.updateStatemap();
    });
  }

  initStatemap() {
    // 初始化状态图容器
    const statemapContent = document.getElementById("statemap-content")!;
    statemapContent.innerHTML = '';

    // 创建画布
    const canvas = document.createElement("canvas");
    canvas.id = "statemap-canvas";
    canvas.width = statemapContent.clientWidth;
    canvas.height = statemapContent.clientHeight;
    statemapContent.appendChild(canvas);
  }

  updateStatemapData() {
    // 处理卡片数据生成状态图数据
    if (!this.cards || this.cards.length === 0) {
      this.statemapData = [];
      return;
    }

    // 这里可以根据卡片数据生成状态图所需的数据结构
    // 简单示例：按保留率分组
    const retentionGroups: { [key: string]: number } = {};

    this.cards.forEach((card) => {
      const retentionRange = Math.floor(card.stats.retention * 10) / 10;
      const key = `${retentionRange.toFixed(1)}`;
      retentionGroups[key] = (retentionGroups[key] || 0) + 1;
    });

    this.statemapData = Object.entries(retentionGroups).map(
      ([retention, count]) => ({
        retention: parseFloat(retention),
        count: count,
      }),
    );

    this.updateStatemap();
  }

  updateStatemap() {
    // 获取画布和上下文
    const canvas = document.getElementById(
      "statemap-canvas",
    ) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 获取当前选择的样式、颜色和权重
    const style = (
      document.getElementById("statemap-style") as HTMLSelectElement
    ).value;
    const colorBy = (
      document.getElementById("statemap-color") as HTMLSelectElement
    ).value;
    const weightBy = (
      document.getElementById("statemap-weight") as HTMLSelectElement
    ).value;
    const timeValue = (
      document.getElementById("statemap-time") as HTMLInputElement
    ).value;

    // 简单绘制状态图示例
    if (this.statemapData.length === 0) {
      ctx.fillStyle = "#888";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText("No data available", canvas.width / 2, canvas.height / 2);
      return;
    }

    // 绘制坐标轴
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, canvas.height - 50);
    ctx.lineTo(canvas.width - 50, canvas.height - 50);
    ctx.moveTo(50, canvas.height - 50);
    ctx.lineTo(50, 50);
    ctx.stroke();

    // 绘制数据点
    const maxCount = Math.max(...this.statemapData.map((item) => item.count));
    const xScale = (canvas.width - 100) / (this.statemapData.length - 1);
    const yScale = (canvas.height - 100) / maxCount;

    this.statemapData.forEach((item, index) => {
      const x = 50 + index * xScale;
      const y = canvas.height - 50 - item.count * yScale;
      const radius = 5 + (item.count / maxCount) * 5;

      // 根据样式设置颜色
      if (style === "goldie") {
        ctx.fillStyle = `rgb(${255 - item.retention * 255}, ${215 + item.retention * 40}, ${0})`;
      } else {
        ctx.fillStyle = `rgb(${0}, ${135 + item.retention * 120}, ${255})`;
      }

      // 绘制点
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // 绘制标签
      ctx.fillStyle = "#333";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${item.retention.toFixed(1)}`, x, canvas.height - 30);
    });

    // 绘制图例
    ctx.fillStyle = "#333";
    ctx.font = "14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Style: ${style}`, 60, 30);
    ctx.fillText(`Color: ${colorBy}`, 180, 30);
    ctx.fillText(`Weight: ${weightBy}`, 300, 30);
    ctx.fillText(`Time: ${timeValue} days`, 420, 30);
  }
}

// 当DOM加载完成后初始化应用
document.addEventListener("DOMContentLoaded", () => {
  new AnkirusApp();
});
