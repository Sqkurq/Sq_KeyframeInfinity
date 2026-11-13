# Sq_KeyframeInfinity を ZXP にビルドする
# 使い方: ./build.ps1   (ZXPSignCmd.exe は tools/ に置くか、環境変数 ZXPSIGNCMD で指定)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sign = if ($env:ZXPSIGNCMD) { $env:ZXPSIGNCMD } else { Join-Path $root 'tools\ZXPSignCmd.exe' }
if (-not (Test-Path $sign)) { throw "ZXPSignCmd.exe が見つかりません: $sign" }

[xml]$m = Get-Content (Join-Path $root 'extension\CSXS\manifest.xml') -Encoding UTF8
$ver = $m.ExtensionManifest.ExtensionBundleVersion
$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null
$out = Join-Path $dist "Sq_KeyframeInfinity-$ver.zxp"
if (Test-Path $out) { Remove-Item $out -Confirm:$false }

# 自己署名証明書(初回だけ作る。パスワードはランダムに生成して .certpass に保存。どちらもコミットしない)
$cert = Join-Path $root 'cert.p12'
$passFile = Join-Path $root '.certpass'
if (-not (Test-Path $cert) -or -not (Test-Path $passFile)) {
  $pass = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
  Set-Content -Path $passFile -Value $pass -Encoding ascii -NoNewline
  if (Test-Path $cert) { Remove-Item $cert -Confirm:$false }
  & $sign -selfSignedCert JP Tokyo Sqkurq 'Sq_KeyframeInfinity' $pass $cert
  if ($LASTEXITCODE -ne 0) { throw '証明書の作成に失敗しました' }
}
$pass = Get-Content $passFile -Raw

& $sign -sign (Join-Path $root 'extension') $out $cert $pass
if ($LASTEXITCODE -ne 0) { throw '署名に失敗しました' }
& $sign -verify $out
if ($LASTEXITCODE -ne 0) { throw '検証に失敗しました' }
Write-Output "OK: $out"
