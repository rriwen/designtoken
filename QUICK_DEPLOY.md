# 快速部署到 Vercel

## 方法一：通过 Vercel Dashboard（推荐，最简单）

### 步骤：

1. **访问 Vercel**
   - 打开浏览器访问：https://vercel.com
   - 点击右上角 "Sign Up" 或 "Log In"
   - 选择 "Continue with GitHub" 使用 GitHub 账号登录

2. **导入项目**
   - 登录后，点击右上角的 "Add New..." 按钮
   - 选择 "Project"
   - 在项目列表中找到 `rriwen/designtoken` 仓库
   - 点击 "Import" 按钮

3. **配置项目（已自动配置好）**
   - Vercel 会自动检测到这是一个 Vite 项目
   - 确认以下配置（应该已经自动填充）：
     ```
     Framework Preset: Vite
     Root Directory: ./
     Build Command: npm run build
     Output Directory: dist
     Install Command: npm install
     ```

4. **部署**
   - 直接点击 "Deploy" 按钮
   - 等待 1-2 分钟，Vercel 会自动：
     - 安装依赖
     - 构建项目
     - 部署到生产环境

5. **完成**
   - 部署完成后，你会看到一个绿色的 "Success" 提示
   - Vercel 会提供一个 URL，例如：`https://designtoken.vercel.app`
   - 点击 URL 即可访问你的应用

### 自动部署

- ✅ 之后每次你推送代码到 GitHub 的 `main` 分支
- ✅ Vercel 会自动检测并重新部署
- ✅ 无需手动操作

---

## 方法二：通过 Vercel CLI（需要终端交互）

如果你更喜欢使用命令行：

```bash
# 1. 登录 Vercel
cd "/Users/4x/Desktop/DesignToken System"
npx vercel login

# 2. 部署到生产环境
npx vercel --prod
```

按照提示操作即可。

---

## 验证部署

部署成功后，你可以：

1. **访问你的网站**
   - 在 Vercel Dashboard 中点击项目
   - 找到 "Domains" 部分
   - 点击提供的 URL

2. **查看部署日志**
   - 在 Vercel Dashboard 中
   - 点击 "Deployments" 标签
   - 查看构建和部署日志

3. **测试功能**
   - 打开网站
   - 测试所有功能是否正常
   - 检查导出功能是否工作

---

## 常见问题

### Q: 部署失败怎么办？
A: 
1. 检查 Vercel Dashboard 中的构建日志
2. 确保本地可以成功运行 `npm run build`
3. 检查 `package.json` 中的依赖是否正确

### Q: 如何更新部署？
A: 
- 只需推送代码到 GitHub：
  ```bash
  git add .
  git commit -m "更新说明"
  git push origin main
  ```
- Vercel 会自动检测并重新部署

### Q: 如何添加自定义域名？
A:
1. 在 Vercel Dashboard 中进入项目
2. 点击 "Settings" → "Domains"
3. 添加你的域名
4. 按照提示配置 DNS

---

## 项目已准备就绪 ✅

- ✅ 代码已推送到 GitHub
- ✅ `vercel.json` 已配置
- ✅ 构建测试通过
- ✅ 所有文件已提交

**现在只需在 Vercel Dashboard 中点击几下即可完成部署！**
