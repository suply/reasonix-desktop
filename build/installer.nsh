!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!include "FileFunc.nsh"

Var APPDATADIR
Var DirInput
Var BtnBrowse
Var CopyOnlyCheckbox
Var CopyOnlyFlag

!define REG_KEY "Software\\EarthVisLab"
!define REG_VALUE "AppDir"

; -------------------------------
; 初始化默认路径（优先从注册表读取）
; -------------------------------
!macro preInit
  ; 默认路径
  StrCpy $APPDATADIR "$APPDATA\EarthVisLabApps"
  StrCpy $CopyOnlyFlag 0

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

  ${NSD_CreateLabel} 0 0 100% 12u "请选择内部软件的安装目录(并非 EarthVisLab 安装目录)："

  ${NSD_CreateText} 0 20u 80% 12u "$APPDATADIR"
  Pop $DirInput

  ${NSD_CreateBrowseButton} 82% 20u 18% 12u "浏览(B)..."
  Pop $BtnBrowse
  ${NSD_OnClick} $BtnBrowse BrowseDirFunc

  ; 添加复选框
  ${NSD_CreateCheckBox} 0 40u 100% 12u "仅复制内部软件，不安装 EarthVisLab"
  Pop $CopyOnlyCheckbox
  ${NSD_SetState} $CopyOnlyCheckbox unchecked

  nsDialogs::Show
FunctionEnd

Function LeaveAppDirPage
  ${NSD_GetText} $DirInput $APPDATADIR
  
  ; 获取复选框状态
  ${NSD_GetState} $CopyOnlyCheckbox $CopyOnlyFlag
  
  Call SaveAppDir
  Call CallMerge
  
  ; 如果选择了仅复制，则退出安装程序
  ${If} $CopyOnlyFlag == 1
    Quit
  ${EndIf}
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

; -------------------------------
; Section 必须有
; -------------------------------
Section
 
SectionEnd
