<#
  نشر إصدار جديد بأمر واحد (Windows PowerShell 5.1):
    .\tools\publish.ps1 -Build 162 -Message "وصف قصير"
    .\tools\publish.ps1 -Build 162 -DryRun        # فحص فقط: الاختبارات + الملفات المتغيّرة، بدون أي تعديل
  الخطوات: (1) الاختبارات السريعة (-Full = الشاملة) (2) رفع الأرقام الثلاثة (core.js / index.html / sw.js)
           (3) commit + push للمصدر على main (4) GitHub Actions بيفحص ويبني (tools/build-site.js) وينشر على Pages
           (5) انتظار حتى يعرض الموقع الإصدار الجديد.
  لا يعدّل بيانات ولا Supabase. يتوقف عند أول خطأ.
#>
param(
  [Parameter(Mandatory = $true)][int]$Build,
  [string]$Message = '',
  [switch]$DryRun,
  [switch]$Full,
  [string]$LiveUrl = 'https://m08ij.github.io/my-study-space/',
  [int]$WaitSeconds = 600
)
$ErrorActionPreference = 'Stop'
$src = Split-Path -Parent $PSScriptRoot
$enc = New-Object System.Text.UTF8Encoding($false)
function Say($m){ Write-Host $m }
function Die($m){ Write-Host "✗ $m" -ForegroundColor Red; exit 1 }

Push-Location $src
try{ $branch = (& git branch --show-current) } finally { Pop-Location }
if($branch -ne 'main'){ Die "لازم تكون على فرع main (إنت على '$branch')" }

# 1) الاختبارات
Say ("1/5 تشغيل الاختبارات " + $(if($Full){"(الشاملة)"}else{"(الأساسية السريعة)"}) + "…")
Push-Location "$src\tests"
try{ $ra = @("run-all.js"); if(-not $Full){ $ra += "quick" }; & node @ra | Select-Object -Last 3 | ForEach-Object { Say "   $_" }; $code = $LASTEXITCODE } finally { Pop-Location }
if($code -ne 0){ Die "الاختبارات فيها فشل — لا نشر." }

# 2) رفع الأرقام الثلاثة
$bumps = @(
  @{ f = 'core.js';    re = "window\.APP_BUILD = '\d+'"; to = "window.APP_BUILD = '$Build'" },
  @{ f = 'index.html'; re = "var BUILD = '\d+'";         to = "var BUILD = '$Build'" },
  @{ f = 'sw.js';      re = "ss-cache-v\d+";             to = "ss-cache-v$Build" }
)
Say ("2/5 رفع الإصدار إلى $Build" + $(if($DryRun){ ' (تجربة — بدون كتابة)' } else { '' }))
foreach($b in $bumps){
  $p = "$src\$($b.f)"; $t = [IO.File]::ReadAllText($p)
  if(-not [regex]::IsMatch($t, $b.re)){ Die "ما لقيت نمط الإصدار في $($b.f)" }
  if(-not $DryRun){ [IO.File]::WriteAllText($p, [regex]::Replace($t, $b.re, $b.to, 'None', [TimeSpan]::FromSeconds(5)), $enc) }
}

# 3) commit + push
Push-Location $src
try{
  $st = @(& git status --porcelain)
  Say ("3/5 تغييرات: " + $st.Count); $st | ForEach-Object { Say "   $_" }
  if($DryRun){ Say "✓ تجربة فقط — لم يُعدَّل أي شيء."; exit 0 }
  if($st.Count -eq 0){ Die "لا تغييرات للنشر." }
  $msg = "Build ${Build}" + $(if($Message){ ": $Message" } else { '' })
  & git add -A | Out-Null
  & git commit -q -m $msg | Out-Null
  if($LASTEXITCODE -ne 0){ Die "فشل git commit" }
  $ErrorActionPreference = 'Continue'
  & git push origin main 2>&1 | ForEach-Object { Say "   $_" }
  $pushCode = $LASTEXITCODE; $ErrorActionPreference = 'Stop'
  if($pushCode -ne 0){ Die "فشل git push" }
  Say ("   " + (& git log --oneline -1))
} finally { Pop-Location }

# 4+5) GitHub Actions بيبني وينشر — ننتظر الموقع
Say "4/5 GitHub Actions: فحص ← بناء ← نشر (تابعه: gh run watch)"
Say "5/5 انتظار الموقع حتى يعرض ss-cache-v$Build (حتى $WaitSeconds ث)…"
$deadline = (Get-Date).AddSeconds($WaitSeconds); $live = ''
while((Get-Date) -lt $deadline){
  try{
    $r = Invoke-WebRequest ("$($LiveUrl)sw.js?x=" + (Get-Random)) -UseBasicParsing -TimeoutSec 20
    $live = [regex]::Match($r.Content, 'ss-cache-v\d+').Value
    if($live -eq "ss-cache-v$Build"){ break }
  }catch{ $live = 'تعذّر الوصول' }
  Start-Sleep -Seconds 15
}
if($live -eq "ss-cache-v$Build"){ Say "✓ منشور: الموقع يعرض $live — اعمل Hard Reload (Ctrl+Shift+R)." }
else { Say "⚠ الـ push تم، لكن الموقع لسه يعرض '$live'. افحص: gh run list"; exit 2 }
