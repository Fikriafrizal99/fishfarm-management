$ErrorActionPreference = "Stop"

Write-Host "FishFarm Development Database Bootstrap" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example" -ForegroundColor Green
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker CLI tidak ditemukan. Pastikan Docker Desktop sudah terpasang dan aktif."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm tidak ditemukan. Gunakan Node.js sesuai versi pada package.json."
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..." -ForegroundColor Yellow
  npm install
}

Write-Host "Starting PostgreSQL and preparing schema..." -ForegroundColor Yellow
npm run db:bootstrap

Write-Host "" 
Write-Host "Development database ready." -ForegroundColor Green
Write-Host "PostgreSQL: localhost:5432 / fishfarm_dev"
Write-Host "Run 'npm run prisma:studio' to inspect data."
Write-Host "Run 'npm run dev' to start the application."
