# ankirus

一个基于 Anki 的可视化学习工具，帮助用户更高效地管理和学习记忆卡片。

## 项目简介

ankirus 是一个为 Anki 用户设计的增强工具，它提供了直观的卡片状态可视化界面，帮助用户更好地理解和管理自己的学习进度。通过状态地图(StateMap)，用户可以一目了然地看到所有卡片的难度、稳定性和 retention 等关键指标。

## 项目结构

```
ankirus/
├── ankirus/             # Python 后端代码
│   ├── __main__.py      # 主程序入口
│   └── ...
├── ankirus_nodejs/      # Node.js 后端相关代码
│   └── ...
├── web/                 # HTML, CSS 以及编译后的前端 JavaScript 代码
├── web_ts/              # TypeScript 前端代码 (原版)
│   ├── ankirus.ts       # 主应用类
│   ├── statemap.ts      # 状态地图组件
│   ├── options.ts       # 选项设置
│   └── ...
├── web_new/             # 新版 React + D3.js 前端 (实验性)
│   ├── src/             # TypeScript 源码
│   ├── package.json     # Node.js 依赖
│   └── ...
├── config.json          # 配置文件
├── config-test.json     # 测试配置
└── ankirus.sh           # Docker 运行脚本
```

## 安装说明

### 前提条件

- Python 3.9+
- Node.js 16+
- Anki 已安装并配置

### 步骤

1. 克隆项目到本地

```bash
git clone https://github.com/9-2-1/ankirus.git
cd ankirus
```

2. 安装 Python 依赖

```bash
pip install aiohttp anki
```

3. 安装 Node.js 依赖

```bash
cd ankirus_nodejs
npm install
```

4. 编译 TypeScript 代码

```bash
# 在 web_ts 目录下
tsc
```

## 配置说明

复制 `config-test.json` 为 `config.json` 并根据你的系统修改配置：

```json
{
  "media": "collection.media/",          # Anki 媒体文件目录
  "userprofile": "/path/to/anki/profile/",  # Anki 用户配置目录
  "tmp_db": "tmp-collection.anki2",      # 临时数据库文件
  "port": 24032,                          # 服务端口
  "cache_ttl": 86400                      # 缓存有效期(秒)
}
```

## 使用方法

1. 启动服务

```bash
python -m ankirus
```

2. 在浏览器中访问打开 http://127.0.0.1:24032

## 功能特点

- 卡片状态可视化
- 按组查看卡片
- 卡片难度和稳定性分析
- 自定义视图选项

## 开发说明

### 前端开发

#### 原版前端 (web_ts/)

前端代码位于 `web_ts/` 目录，使用 TypeScript 编写。修改代码后需要重新编译：

```bash
cd web_ts
tsc
```

#### 新版前端 (web_new/)

实验性的新版前端使用 React + D3.js，提供 TreeMap 可视化：

```bash
cd web_new
npm install
npm run dev  # 开发模式
npm run build  # 生产构建
```

### 后端开发

后端代码位于 `ankirus/` 目录，使用 Python 编写。

## 许可证

本项目采用 MIT 许可证。
