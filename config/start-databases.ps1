# start-replica.ps1

Write-Host "Verificando si MongoDB ya está ejecutándose..." -ForegroundColor Yellow

# Verificar si MongoDB ya está corriendo
$mongoProcesses = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
if ($mongoProcesses) {
    Write-Host "MongoDB ya está ejecutándose. Deteniendo procesos existentes..." -ForegroundColor Yellow
    Stop-Process -Name "mongod" -Force -ErrorAction SilentlyContinue
    Start-Sleep 3
}

Write-Host "Iniciando MongoDB Replica Set..." -ForegroundColor Green

# Verificar que las carpetas existan
$paths = @("C:\data\rs0-0", "C:\data\rs0-1", "C:\data\rs0-2")
foreach ($path in $paths) {
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force
        Write-Host "Creada carpeta: $path" -ForegroundColor Cyan
    }
}

# Inicia las tres instancias en background
Write-Host "Iniciando instancia principal (puerto 27017)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-Command", "mongod --replSet rs0 --port 27017 --dbpath C:\data\rs0-0 --logpath C:\data\rs0-0\mongod.log" -WindowStyle Minimized
Start-Sleep 3

Write-Host "Iniciando instancia secundaria 1 (puerto 27018)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-Command", "mongod --replSet rs0 --port 27018 --dbpath C:\data\rs0-1 --logpath C:\data\rs0-1\mongod.log" -WindowStyle Minimized  
Start-Sleep 3

Write-Host "Iniciando instancia secundaria 2 (puerto 27019)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-Command", "mongod --replSet rs0 --port 27019 --dbpath C:\data\rs0-2 --logpath C:\data\rs0-2\mongod.log" -WindowStyle Minimized

Write-Host "Esperando que las instancias inicien..." -ForegroundColor Yellow
Start-Sleep 12

Write-Host "✅ Replica set iniciado correctamente!" -ForegroundColor Green
Write-Host "Puedes conectarte con: mongosh --port 27017" -ForegroundColor Cyan
Write-Host "Para detener: Stop-Process -Name mongod -Force" -ForegroundColor Cyan
Write-Host "Logs disponibles en: C:\data\rs0-*\mongod.log" -ForegroundColor Gray

exit 0