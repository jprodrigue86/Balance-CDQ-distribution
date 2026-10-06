@echo off
setlocal
set "CDQ_PC_SETUP_FILE=%~f0"
powershell.exe -NoProfile -Command "$s=Get-Content -LiteralPath $env:CDQ_PC_SETUP_FILE -Raw -Encoding UTF8; $body=($s -split '(?m)^# CDQ_POWERSHELL_V2696\r?$',2)[1]; & ([scriptblock]::Create($body))"
set "CDQ_PC_SETUP_EXIT=%errorlevel%"
if not "%CDQ_PC_SETUP_EXIT%"=="0" pause
exit /b %CDQ_PC_SETUP_EXIT%
# CDQ_POWERSHELL_V2696
$ErrorActionPreference='Stop'
function Install-CdqPcShortcut {
    param(
        [string]$DesktopPath=[Environment]::GetFolderPath('DesktopDirectory'),
        [string[]]$ShortcutRoots=@([Environment]::GetFolderPath('DesktopDirectory'),[Environment]::GetFolderPath('StartMenu'),[Environment]::GetFolderPath('CommonStartMenu')),
        [string]$FallbackBrowser,
        [string]$DataDirectory=(Join-Path $env:LOCALAPPDATA 'BalanceCDQ-PC'),
        [switch]$NoLaunch
    )
    $wsh=New-Object -ComObject WScript.Shell
    $existing=$null
    foreach($root in $ShortcutRoots) {
        if(-not (Test-Path -LiteralPath $root)) {continue}
        foreach($file in Get-ChildItem -LiteralPath $root -Filter '*.lnk' -Recurse -ErrorAction SilentlyContinue) {
            if($file.BaseName -notmatch 'Balance[\s_-]*CDQ.*PC') {continue}
            $item=$wsh.CreateShortcut($file.FullName)
            if([IO.Path]::GetFileName($item.TargetPath) -match '^(chrome|msedge)(_proxy)?\.exe$' -and $item.Arguments -match '--app-id=|--app=.*Balance-CDQ-distribution/pc/') {
                $existing=$item
                break
            }
        }
        if($existing) {break}
    }
    if($existing) {
        $browser=$existing.TargetPath
        $arguments=$existing.Arguments
        $icon=$existing.IconLocation
    } else {
        $paths=@($FallbackBrowser,"${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe","$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe","$env:ProgramFiles\Google\Chrome\Application\chrome.exe","$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
        $browser=$paths | Where-Object {$_ -and (Test-Path -LiteralPath $_)} | Select-Object -First 1
        if(-not $browser) {throw 'Chrome ou Microsoft Edge doit etre installe pour ouvrir Balance CDQ.'}
        $arguments='--app="https://jprodrigue86.github.io/Balance-CDQ-distribution/pc/"'
        $icon=$browser+',0'
    }
    $arguments=($arguments -replace '(?i)(?:^|\s)--start-minimized(?=\s|$)','' -replace '(?i)(?:^|\s)--window-size=\d+,\d+(?=\s|$)','').Trim()
    if($arguments -notmatch '(?:^|\s)--start-maximized(?:\s|$)') {$arguments+=' --start-maximized'}
    $launch=@'
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
public static class CdqPcWindowV2696 {
    public delegate bool Callback(IntPtr handle,IntPtr state);
    [DllImport("user32.dll")] static extern bool EnumWindows(Callback callback,IntPtr state);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr handle);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr handle,StringBuilder text,int length);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr handle,out uint process);
    [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr handle,int command);
    public static List<IntPtr> Find() {
        var found=new List<IntPtr>();
        EnumWindows((handle,state)=>{
            var text=new StringBuilder(512);GetWindowText(handle,text,text.Capacity);
            if(!IsWindowVisible(handle)||text.ToString().IndexOf("Balance CDQ",StringComparison.OrdinalIgnoreCase)<0||text.ToString().IndexOf("PC",StringComparison.OrdinalIgnoreCase)<0)return true;
            uint id;GetWindowThreadProcessId(handle,out id);
            try {var name=Process.GetProcessById((int)id).ProcessName;if(name=="chrome"||name=="msedge")found.Add(handle);}catch{}
            return true;
        },IntPtr.Zero);
        return found;
    }
}
"@
Start-Process -FilePath '__BROWSER__' -ArgumentList '__ARGUMENTS__' -WindowStyle Maximized
for($attempt=0;$attempt -lt 40;$attempt++) {
    $windows=[CdqPcWindowV2696]::Find()
    foreach($handle in $windows) {[void][CdqPcWindowV2696]::ShowWindowAsync($handle,3)}
    if($windows.Count -gt 0) {Start-Sleep -Milliseconds 700;foreach($handle in $windows) {[void][CdqPcWindowV2696]::ShowWindowAsync($handle,3)};break}
    Start-Sleep -Milliseconds 250
}
'@
    $launch=$launch.Replace('__BROWSER__',$browser.Replace("'","''")).Replace('__ARGUMENTS__',$arguments.Replace("'","''"))
    [void][IO.Directory]::CreateDirectory($DataDirectory)
    $launcherPath=Join-Path $DataDirectory 'Start-CDQ-PC.ps1'
    [IO.File]::WriteAllText($launcherPath,$launch,[Text.UTF8Encoding]::new($false))
    # Keep shortcut arguments short: WSH can truncate a long encoded script.
    $bootstrap="& ([scriptblock]::Create((Get-Content -LiteralPath '"+$launcherPath.Replace("'","''")+"' -Raw -Encoding UTF8)))"
    $encoded=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($bootstrap))
    [void][IO.Directory]::CreateDirectory($DesktopPath)
    $path=Join-Path $DesktopPath 'Balance CDQ - PC plein ecran.lnk'
    $shortcut=$wsh.CreateShortcut($path)
    $shortcut.TargetPath=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $shortcut.Arguments='-NoProfile -WindowStyle Hidden -EncodedCommand '+$encoded
    $shortcut.WindowStyle=3
    $shortcut.IconLocation=$icon
    $shortcut.Description='Balance CDQ PC - ouverture agrandie automatique'
    $shortcut.Save()
    if(-not $NoLaunch) {[void]$wsh.Run(('"'+$path+'"'),3,$false)}
    Write-Host 'Le raccourci Balance CDQ - PC plein ecran est pret sur votre bureau.'
    return $path
}
if($env:CDQ_PC_SETUP_TEST -ne '1') {Install-CdqPcShortcut | Out-Null}
