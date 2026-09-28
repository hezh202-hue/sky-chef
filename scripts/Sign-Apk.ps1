param(
    [Parameter(Mandatory)][string]$UnsignedApk,
    [Parameter(Mandatory)][string]$OutputApk,
    [Parameter(Mandatory)][string]$BuildTools,
    [Parameter(Mandatory)][string]$Keystore,
    [Parameter(Mandatory)][string]$PasswordFile
)
$ErrorActionPreference = 'Stop'
$unsignedPath = (Resolve-Path -LiteralPath $UnsignedApk).Path
$keyPath = (Resolve-Path -LiteralPath $Keystore).Path
$passwordPath = (Resolve-Path -LiteralPath $PasswordFile).Path
$outputPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputApk)
$toolsPath = (Resolve-Path -LiteralPath $BuildTools).Path
if (Test-Path -LiteralPath $outputPath) { throw '输出文件已存在，请选择新的文件名。' }
$signerJar = Join-Path $toolsPath 'lib/apksigner.jar'
$zipalignExe = Join-Path $toolsPath 'zipalign.exe'
& $zipalignExe -c -P 16 4 $unsignedPath
if ($LASTEXITCODE -ne 0) { throw 'APK 对齐校验失败，不继续签名。' }
& java -jar $signerJar sign --ks $keyPath --ks-key-alias sky-chef --ks-pass "file:$passwordPath" --out $outputPath $unsignedPath
if ($LASTEXITCODE -ne 0) { throw 'APK 签名失败。' }
& java -jar $signerJar verify --verbose --print-certs $outputPath
if ($LASTEXITCODE -ne 0) { throw 'APK 签名验证失败。' }
Get-FileHash -LiteralPath $outputPath -Algorithm SHA256
