# Builds a release APK on Windows when the user profile path contains spaces.
# Maps the Android SDK to X: so NDK/CMake paths stay space-free.

$ErrorActionPreference = "Stop"

$frontendRoot = Split-Path $PSScriptRoot -Parent
$androidRoot = Join-Path $frontendRoot "android"
$sdkPath = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }

if (-not (Test-Path $sdkPath)) {
  throw "Android SDK not found at: $sdkPath"
}

subst X: /d 2>$null | Out-Null
subst X: $sdkPath

$env:ANDROID_HOME = "X:\"
$env:ANDROID_SDK_ROOT = "X:\"
$env:GRADLE_USER_HOME = "C:\gradle-home"
New-Item -ItemType Directory -Force -Path $env:GRADLE_USER_HOME | Out-Null

"sdk.dir=X:\\" | Set-Content -Path (Join-Path $androidRoot "local.properties") -Encoding Ascii

Set-Location $androidRoot
$gradle = Join-Path $env:USERPROFILE ".gradle\wrapper\dists\gradle-9.3.1-bin\23ovyewtku6u96viwx3xl3oks\gradle-9.3.1\bin\gradle.bat"
if (-not (Test-Path $gradle)) {
  & .\gradlew.bat assembleRelease --no-daemon
} else {
  & $gradle assembleRelease --no-daemon --max-workers=1
}

$apk = Get-ChildItem -Path (Join-Path $androidRoot "app\build\outputs\apk\release") -Filter *.apk -ErrorAction SilentlyContinue
if ($apk) {
  Write-Host ""
  Write-Host "APK ready:" $apk.FullName
} else {
  throw "Release APK was not produced. Check the Gradle output above."
}
