@echo off
chcp 65001 >nul
echo ============================================
echo   AI 知识库工作台 - GitHub Pages 一键部署
echo ============================================
echo.
echo 请确保已开启梯子/代理！
echo.
pause
echo.

cd /d "%~dp0"

echo [1/3] 检查 Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未找到 Git，请先安装 https://git-scm.com
    pause
    exit /b 1
)

echo [2/3] 安装 GitHub CLI...
winget install --id GitHub.cli --source winget --accept-source-agreements --accept-package-agreements

echo.
echo [3/3] 登录 GitHub（会打开浏览器）...
gh auth login --hostname github.com --web --git-protocol https

echo.
echo 请输入你的 GitHub 用户名：
set /p GH_USER=

echo.
echo 创建仓库并推送代码...
gh repo create ai-knowledge-base --public --push --source=. --remote=origin

echo.
echo 开启 GitHub Pages...
gh api repos/%GH_USER%/ai-knowledge-base/pages -X POST -f "source[branch]=master" 2>nul
if %errorlevel% neq 0 (
    echo Pages API 调用失败，请手动开启：
    echo 打开 https://github.com/%GH_USER%/ai-knowledge-base/settings/pages
    echo Source 选择 "Deploy from a branch"，Branch 选 "master"，点 Save
)

echo.
echo ============================================
echo   部署完成！
echo   手机访问：
echo   https://%GH_USER%.github.io/ai-knowledge-base
echo ============================================
echo.
echo （可能需要等 1-2 分钟生效）
pause
