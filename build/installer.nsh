!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!include "FileFunc.nsh"

Var APPDATADIR
Var DirInput
Var BtnBrowse
Var ConfirmDialog
Var BtnExit

!define REG_KEY "Software\\EarthVisLab"
!define REG_VALUE "AppDir"

; -------------------------------
; 初始化默认路径（优先从注册表读取）
; -------------------------------
!macro preInit
  ; 默认路径
  StrCpy $APPDATADIR "$APPDATA\EarthVisLabApps"

  ; 先读 32 位视图
  SetRegView 32
  ReadRegStr $0 HKLM "${REG_KEY}" "${REG_VALUE}"
  StrCmp $0 "" read64
    StrCpy $APPDATADIR $0

read64:
  ; 再读 64 位视图
  SetRegView 64
  ReadRegStr $0 HKLM "${REG_KEY}" "${REG_VALUE}"
  StrCmp $0 "" done
    StrCpy $APPDATADIR $0

done:
  SetRegView lastused
!macroend

; -------------------------------
; 自定义页面：选择 App 安装目录
; -------------------------------
Function SelectAppDirPage
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ; 标题
  ${NSD_CreateLabel} 0 10u 100% 12u "目录选择"
  Pop $0
  CreateFont $1 "$(^Font)" "14" "700"
  SendMessage $0 ${WM_SETFONT} $1 0

  ; 提示信息
  ${NSD_CreateLabel} 0 40u 100% 15u "选择内部软件的安装目录，请点击 「 浏览(B)... 」。"
  Pop $0

  ${NSD_CreateText} 0 60u 80% 15u "$APPDATADIR"
  Pop $DirInput

  ${NSD_CreateBrowseButton} 82% 60u 18% 15u "浏览(B)..."
  Pop $BtnBrowse
  ${NSD_OnClick} $BtnBrowse BrowseDirFunc

  nsDialogs::Show
FunctionEnd

Function LeaveAppDirPage
  ${NSD_GetText} $DirInput $APPDATADIR
  Call SaveAppDir
  Call CallMerge
FunctionEnd

; -------------------------------
; 确认页面（在 SaveAppDir 和 CallMerge 执行后）
; -------------------------------
Function ConfirmInstallPage
  nsDialogs::Create 1018
  Pop $ConfirmDialog
  ${If} $ConfirmDialog == error
    Abort
  ${EndIf}

  ; 标题
  ${NSD_CreateLabel} 0 20u 100% 12u "继续"
  Pop $0
  CreateFont $1 "$(^Font)" "14" "700"
  SendMessage $0 ${WM_SETFONT} $1 0

  ; 提示信息
  ${NSD_CreateLabel} 0 50u 100% 60u "安装 EarthVisLab 请点击 「 下一步 」。"
  Pop $0

  nsDialogs::Show
FunctionEnd

Function LeaveConfirmInstallPage
  ; 此页面离开时不需要做什么，因为SaveAppDir和CallMerge已经执行过了
FunctionEnd


; -------------------------------
; 浏览按钮回调
; -------------------------------
Function BrowseDirFunc
  nsDialogs::SelectFolderDialog "请选择内部软件的安装目录" $APPDATADIR
  Pop $0
  ${If} $0 != "error"
    ${If} $0 != ""
      StrCpy $APPDATADIR $0
      ${NSD_SetText} $DirInput $APPDATADIR
    ${EndIf}
  ${EndIf}
FunctionEnd


; -------------------------------
; 保存到注册表
; -------------------------------
Function SaveAppDir
  ${GetFileName} "$APPDATADIR" $R0
  StrCmp $R0 "EarthVisLabApps" 0 add_suffix
  Goto create_dir

add_suffix:
  StrCpy $APPDATADIR "$APPDATADIR\EarthVisLabApps"

create_dir:
  CreateDirectory "$APPDATADIR"
  WriteRegStr HKLM "${REG_KEY}" "${REG_VALUE}" "$APPDATADIR"
FunctionEnd


; ================================
; 函数：目录合并
; ================================
Function CallMerge
  IfFileExists "$EXEDIR\EarthVisLabApps" 0 merge_end
  StrCmp "$EXEDIR\EarthVisLabApps" "$APPDATADIR" merge_end
  CopyFiles "$EXEDIR\EarthVisLabApps\*" "$APPDATADIR"
merge_end:
  Return
FunctionEnd

; -------------------------------
; 页面定义
; -------------------------------
Page custom SelectAppDirPage LeaveAppDirPage
Page custom ConfirmInstallPage LeaveConfirmInstallPage

; -------------------------------
; Section 必须有
; -------------------------------
Section

SectionEnd
