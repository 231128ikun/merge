# CF Workers SUB

基于 Cloudflare Workers 的代理订阅管理器，支持多种代理协议和客户端格式转换。

## ✨ 特性

- 🔄 **格式自动转换** - 支持 Base64、Clash、Surge、SingBox 等格式
- 📱 **客户端自适应** - 根据 User-Agent 自动返回对应格式
- 🔗 **订阅聚合** - 支持多个订阅链接合并
- 🎨 **美观管理界面** - 现代化的 Web 管理面板
- 🔒 **访问控制** - 支持 Token 和每日密钥访问
- 📊 **实时统计** - 显示节点数量和配置信息
- 📚 **多协议支持** - vmess、ss、trojan、ssr 等

## 🚀 快速开始

### 1. 部署到 Cloudflare Workers

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 `Workers & Pages` → `Create application` → `Create Worker`
3. 复制本项目代码[_worker.js](https://github.com/231128ikun/merge/blob/main/_worker.js)到编辑器中
4. 点击 `Save and Deploy`

### 2. 环境变量配置

在 Workers 设置中添加以下环境变量：

| 变量名 | 必填 | 说明 | 默认值 |
|--------|------|------|--------|
| `TOKEN` | ✅ | 访问令牌 | `auto` |
| `SUB_NAME` | ❌ | 订阅名称 | `CF-Workers-SUB` |
| `SUBSCRIPTIONS` | ❌ | 初始订阅内容 | 使用默认节点 |
| `SUB_API` | ❌ | 订阅转换API | `sub.cmliussss.net` |
| `SUB_CONFIG` | ❌ | 订阅配置文件 | ACL4SSR配置 |
| `REDIRECT_URL` | ❌ | 未授权访问重定向地址 | 显示nginx页面 |

### 3. KV 存储（可选）

为了持久化存储订阅数据，建议绑定 KV 命名空间：

1. 创建 KV 命名空间：`wrangler kv:namespace create "KV"`
2. 在 Workers 设置中绑定变量名为 `KV`

## 📖 使用方法

### 访问管理界面

```
https://your-worker-domain.workers.dev/your-token
```

### 获取订阅

**基础订阅地址：**
```
https://your-worker-domain.workers.dev/your-token
```

**指定格式：**
```
# Base64 格式
https://your-worker-domain.workers.dev/your-token?b64=true

# Clash 格式
https://your-worker-domain.workers.dev/your-token?clash=true

# SingBox 格式
https://your-worker-domain.workers.dev/your-token?singbox=true

# Surge 格式
https://your-worker-domain.workers.dev/your-token?surge=true
```

## 🔧 配置说明

### 支持的节点格式

- `vmess://` - V2Ray VMess 协议
- `ss://` - Shadowsocks 协议
- `trojan://` - Trojan 协议
- `ssr://` - ShadowsocksR 协议
- `http://` 或 `https://` - 订阅链接

## 🛠️ 高级配置

### 自定义订阅转换

修改 `SUB_API` 和 `SUB_CONFIG` 环境变量来使用自定义的订阅转换服务：

```javascript
SUB_API=your-api-domain.com
SUB_CONFIG=https://your-domain.com/config.ini
```

### 访问控制

系统支持两种访问方式：

1. **固定 Token**：使用环境变量中设置的 `TOKEN`
2. **每日密钥**：基于当前日期生成的动态密钥

### 反屏蔽机制

内置多种 User-Agent 和请求策略，提高订阅获取成功率。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## ⚠️ 免责声明

本项目仅供学习和技术研究使用，请勿用于非法用途。使用者应遵守当地法律法规，因使用本项目产生的任何问题，作者不承担任何责任。

## 🙏 致谢

- [Cloudflare Workers](https://workers.cloudflare.com/) - 提供免费的边缘计算服务
- [CMLiussss](https://github.com/cmliu/CF-Workers-SUB) - 参考大佬的代码，使用ai修改所得

---

如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！
