# 合并fusion分支功能并添加配置开关

## 1. 合并策略

- 从main分支创建新的合并分支

- 将fusion分支的变更合并到新分支

- 添加配置开关控制功能

- 测试通过后合并到main分支

## 2. 功能分析

fusion分支新增了以下功能：

- **敏感词过滤**：从配置文件读取敏感词列表，对卡片内容进行过滤

- **统计功能**：添加了SQLite缓存数据库和ms-clarity.js统计脚本

- **缓存机制**：对处理结果进行缓存，提高性能

## 3. 配置开关设计

在配置文件中添加以下开关：

- `enable_sensitive_word_filter`：控制敏感词过滤功能

- `enable_statistics`：控制统计功能

- `enable_cache`：控制缓存机制

## 4. 代码修改点

### 4.1 配置文件修改

- 在`config.json`和`config-test.json`中添加开关配置项

### 4.2 主程序修改

- 在`App.__init__`中，根据配置决定是否加载敏感词列表

- 在`sanitize_cached`方法中，根据配置决定是否执行敏感词过滤

- 在`web/index.html`中，根据配置决定是否加载ms-clarity.js脚本

### 4.3 向后兼容性

- 确保如果配置项不存在，使用默认值

- 保持现有功能的正常运行

## 5. 合并步骤

1. 创建合并分支：`git checkout -b merge-fusion main`
2. 合并fusion分支：`git merge fusion`
3. 实现配置开关功能
4. 测试所有功能
5. 合并到main分支：`git checkout main && git merge merge-fusion`
6. 推送
