# 班级管理系统（前端原型）

## 功能概览
- 三角色视图：用户端（学生）、老师端、管理端
- 学生课表展示与一键同步默认数据
- 通知中心：老师端发布作业与班级通知，学生端接收
- 通知已读：学生可标记通知已读，状态实时同步
- 定位打卡：记录经纬度与时间，失败时降级为仅时间
- 考勤统计：老师端按班级汇总今日或区间到勤；学生端按日统计个人打卡
- CSV 导出：导出完整出勤记录
- 作业管理：老师发布作业；学生在线提交；老师端查看各班提交进度

## 快速开始
- 直接双击打开 index.html 即可使用（无需安装任何依赖）
- 右上角切换角色以体验不同端的功能
- 所有数据保存在浏览器 localStorage（键名：cms_state_v1）
- 可选：启动后端 API，前端会自动切换到真实数据源
- 实时性：后端提供 SSE 推送端点，前端自动订阅并实时刷新
- 推荐：使用本地静态服务器打开前端
  - 在项目根目录执行 `node server/static.js` 或 `npm run serve`
  - 浏览器访问 `http://localhost:8080/`

## 启动后端 API（可选）
- 环境准备：安装 Node.js（建议 18+）
- 打开终端并进入项目目录：e:\\项目ui
- 启动服务：
  - Windows PowerShell：执行 `node server/server.js`
  - 或执行 `npm start`
- 服务地址：`http://localhost:3000/`（前端自动探测 `http://localhost:3000/api/ping`）
- 数据文件：`server/data.json`（所有新增数据会写入该文件）
- 前端行为：
  - 检测到 API 可用时，读取班级、学生、课表、通知、考勤均来自后端
  - 写入操作（新增班级、学生、通知、打卡）直接请求后端
  - 导出 CSV 使用后端端点 `/api/export/csv`
  - 实时推送使用 `/api/stream`（SSE）

## 部署与实时性
- 前端部署
  - 将 `index.html`、`styles.css`、`app.js` 作为静态资源托管到任意静态服务器或 CDN
  - 生产环境需使用 HTTPS（浏览器地理定位在非 localhost 环境要求 HTTPS）
- 后端部署
  - 使用 `node server/server.js` 启动，或通过进程守护（如 pm2）保持常驻
  - 通过反向代理（Nginx）暴露 `http(s)://your-domain`，并转发到后端 `http://localhost:3000`
  - 开启 TLS 证书（如 Let’s Encrypt）保证 HTTPS，前端即可在公网下正常定位与实时通信
- Nginx 示例（简化）

```nginx
server {
  listen 80;
  server_name your-domain.com;
  return 301 https://$host$request_uri;
}
server {
  listen 443 ssl;
  server_name your-domain.com;
  ssl_certificate /path/fullchain.pem;
  ssl_certificate_key /path/privkey.pem;

  location / {
    root /var/www/class-ui;
    try_files $uri /index.html;
  }
  location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
  }
}
```

- 数据持久化
  - 演示环境使用 `server/data.json` 文件存储
  - 生产建议迁移至数据库（PostgreSQL/MySQL），并使用 WebSocket/SSE 推送事件

## 使用指南
- 管理端
  - 新增班级：输入名称后点击“新增班级”
  - 新增学生：输入姓名并选择班级，点击“新增学生”
- 老师端
  - 发布作业：选择班级、填写标题与内容后点击“发布”
  - 发布班级通知：同上
  - 考勤概览：按班级显示今日或日期区间到勤与未到人数
  - 导出 CSV：点击“导出CSV”，保存 attendance.csv
  - 作业提交情况：查看各班作业的提交人数与进度条
- 学生端
  - 选择学生：下拉选择列表中的学生
  - 同步课表：点击“同步课表”恢复为内置默认课表
  - 打卡：点击“打卡”，允许定位时记录经纬度；拒绝/失败时仍记录时间
  - 作业提交：在“作业列表”中点击“提交”进行上交
  - 通知已读：在“通知中心”中点击“标记已读”

## 自定义与数据初始化
- 修改默认数据：编辑 app.js 中的 defaults 段落（classes、students、timetable）
- 重置本地数据：清空浏览器 localStorage 后刷新页面
- 班级课表：defaults.timetable 采用按班级 ID 分组的数组结构

## 技术说明
- 纯前端实现（HTML/CSS/JS），无需框架或依赖；后端为纯 Node.js 无第三方库
- 数据持久化：localStorage 或 server/data.json（后端模式）
- 定位：浏览器 Geolocation API，含失败降级逻辑
- CSV 导出：前端拼接并生成下载

## 登录与权限
- 访问后端模式时需登录才能执行以下操作：
  - 管理端：新增班级、学生
  - 老师端：发布作业与班级通知
  - 学生端：定位打卡
- 默认演示账号（首次登录会为其生成默认密码 123456）：
  - 管理员：admin / 123456
  - 老师：teacher / 123456
  - 学生：student1 / 123456（绑定学生 s1）
- 环境变量：
  - JWT_SECRET：令牌签名密钥，生产环境请设置为安全值（默认 dev-secret）

## 下一步（后端与生产化建议）
- 身份认证与权限：接入登录、角色鉴权（JWT + RBAC）
- 后端服务：REST API + WebSocket 推送（如 Node.js/NestJS）
- 数据库：PostgreSQL/MySQL 用于存储学生、班级、课表、通知、考勤
- 打卡规则：根据课表时段与地理围栏计算迟到与缺勤
- 报表：周/月统计、图表与导出 Excel
- 部署：前端静态托管（CDN），后端容器化部署（Docker）

