import std/json
import webview_ffi

when defined(gcc) or defined(clang):
  {.passC: "-Wno-incompatible-pointer-types".}

proc windowCloseCb*(seqId, req: cstring, arg: pointer) {.cdecl.} =
  let w = cast[Webview](arg)
  w.terminate()

proc windowSetTitleCb*(seqId, req: cstring, arg: pointer) {.cdecl.} =
  let w = cast[Webview](arg)
  try:
    let args = parseJson($req)
    if args.len > 0 and args[0].kind == JString:
      w.setTitle(cstring(args[0].getStr()))
  except:
    discard

proc windowSetSizeCb*(seqId, req: cstring, arg: pointer) {.cdecl.} =
  let w = cast[Webview](arg)
  try:
    let args = parseJson($req)
    if args.len >= 2 and args[0].kind == JInt and args[1].kind == JInt:
      w.setSize(cint(args[0].getInt()), cint(args[1].getInt()), WebviewHint.None)
  except:
    discard

# Helper proc declarations for platform-specific window APIs
proc winMinimize*(w: Webview)
proc winMaximize*(w: Webview)
proc winRestore*(w: Webview)
proc winHide*(w: Webview)
proc winShow*(w: Webview)
proc winCenter*(w: Webview)

proc windowMinimizeCb*(seqId, req: cstring, arg: pointer) {.cdecl.} = 
  let w = cast[Webview](arg)
  winMinimize(w)
  discard w.returnResult(seqId, 0, "{}")

proc windowMaximizeCb*(seqId, req: cstring, arg: pointer) {.cdecl.} = 
  let w = cast[Webview](arg)
  winMaximize(w)
  discard w.returnResult(seqId, 0, "{}")

proc windowRestoreCb*(seqId, req: cstring, arg: pointer) {.cdecl.} = 
  let w = cast[Webview](arg)
  winRestore(w)
  discard w.returnResult(seqId, 0, "{}")

proc windowHideCb*(seqId, req: cstring, arg: pointer) {.cdecl.} = 
  let w = cast[Webview](arg)
  winHide(w)
  discard w.returnResult(seqId, 0, "{}")

proc windowShowCb*(seqId, req: cstring, arg: pointer) {.cdecl.} = 
  let w = cast[Webview](arg)
  winShow(w)
  discard w.returnResult(seqId, 0, "{}")

proc windowCenterCb*(seqId, req: cstring, arg: pointer) {.cdecl.} = 
  let w = cast[Webview](arg)
  winCenter(w)
  discard w.returnResult(seqId, 0, "{}")

proc bindNativeWindowControls*(w: Webview) =
  discard w.bindFn("jazzyClose", windowCloseCb, w)
  discard w.bindFn("jazzySetTitle", windowSetTitleCb, w)
  discard w.bindFn("jazzySetSize", windowSetSizeCb, w)
  discard w.bindFn("jazzyWindowMinimize", windowMinimizeCb, w)
  discard w.bindFn("jazzyWindowMaximize", windowMaximizeCb, w)
  discard w.bindFn("jazzyWindowRestore", windowRestoreCb, w)
  discard w.bindFn("jazzyWindowHide", windowHideCb, w)
  discard w.bindFn("jazzyWindowShow", windowShowCb, w)
  discard w.bindFn("jazzyWindowCenter", windowCenterCb, w)

when defined(windows):
  type
    HWND = pointer
    LONG_PTR = int
    DWORD = uint32
    HRESULT = int32
  
  const
    GWL_STYLE = -16
    WS_CAPTION = 0x00C00000
    WS_THICKFRAME = 0x00040000
    
    DWMWA_USE_IMMERSIVE_DARK_MODE = 20
    DWMWA_SYSTEMBACKDROP_TYPE = 38
    DWMSBT_MAINWINDOW = 2'u32
    
  when hostCPU == "amd64":
    proc GetWindowLongPtrW(hWnd: HWND, nIndex: cint): LONG_PTR {.stdcall, dynlib: "user32.dll", importc: "GetWindowLongPtrW".}
    proc SetWindowLongPtrW(hWnd: HWND, nIndex: cint, dwNewLong: LONG_PTR): LONG_PTR {.stdcall, dynlib: "user32.dll", importc: "SetWindowLongPtrW".}
  else:
    proc GetWindowLongPtrW(hWnd: HWND, nIndex: cint): LONG_PTR {.stdcall, dynlib: "user32.dll", importc: "GetWindowLongW".}
    proc SetWindowLongPtrW(hWnd: HWND, nIndex: cint, dwNewLong: LONG_PTR): LONG_PTR {.stdcall, dynlib: "user32.dll", importc: "SetWindowLongW".}
    
  proc SetWindowPos(hWnd: HWND, hWndInsertAfter: HWND, X: cint, Y: cint, cx: cint, cy: cint, uFlags: uint32): bool {.stdcall, dynlib: "user32.dll", importc: "SetWindowPos".}
  proc DwmSetWindowAttribute(hwnd: HWND, dwAttribute: DWORD, pvAttribute: pointer, cbAttribute: DWORD): HRESULT {.stdcall, dynlib: "dwmapi.dll", importc: "DwmSetWindowAttribute".}
  
  type RECT = object
    left, top, right, bottom: int32
    
  const
    SW_HIDE = 0
    SW_RESTORE = 9
    SW_MINIMIZE = 6
    SW_MAXIMIZE = 3
    SM_CXSCREEN = 0
    SM_CYSCREEN = 1
    
  proc ShowWindow(hWnd: HWND, nCmdShow: cint): bool {.stdcall, dynlib: "user32.dll", importc: "ShowWindow".}
  proc GetWindowRect(hWnd: HWND, lpRect: ptr RECT): bool {.stdcall, dynlib: "user32.dll", importc: "GetWindowRect".}
  proc GetSystemMetrics(nIndex: cint): cint {.stdcall, dynlib: "user32.dll", importc: "GetSystemMetrics".}
  proc GetAncestor(hwnd: HWND, gaFlags: uint32): HWND {.stdcall, dynlib: "user32.dll", importc: "GetAncestor".}

proc getTopLevelWindow(w: Webview): pointer {.used.} =
  when defined(windows):
    let hwnd = w.getWindow()
    if hwnd != nil:
      return GetAncestor(hwnd, 2) # GA_ROOT = 2
    return nil
  else:
    return w.getWindow()

proc applyFramelessAndMica*(w: Webview) =
  when defined(windows):
    let hwnd = getTopLevelWindow(w)
    if hwnd != nil:
      let style = GetWindowLongPtrW(hwnd, GWL_STYLE)
      let newStyle = style and not (WS_CAPTION or WS_THICKFRAME)
      discard SetWindowLongPtrW(hwnd, GWL_STYLE, newStyle)
      
      # SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER
      discard SetWindowPos(hwnd, nil, 0, 0, 0, 0, 0x0020 or 0x0002 or 0x0001 or 0x0004)
      
      # Apply Mica
      var backdropType: DWORD = DWMSBT_MAINWINDOW
      discard DwmSetWindowAttribute(hwnd, DWMWA_SYSTEMBACKDROP_TYPE, addr backdropType, cast[DWORD](sizeof(DWORD)))
      
      # Dark mode for title bar (if any)
      var darkMode: DWORD = 1
      discard DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, addr darkMode, cast[DWORD](sizeof(DWORD)))
  elif defined(macosx):
    discard # macOS implementation pending
  elif defined(linux):
    discard # Linux implementation pending

when defined(linux):
  proc gtk_window_iconify(window: pointer) {.importc, cdecl.}
  proc gtk_window_maximize(window: pointer) {.importc, cdecl.}
  proc gtk_window_unmaximize(window: pointer) {.importc, cdecl.}
  proc gtk_widget_hide(widget: pointer) {.importc, cdecl.}
  proc gtk_widget_show_all(widget: pointer) {.importc, cdecl.}
  proc gtk_window_set_position(window: pointer, position: cint) {.importc, cdecl.}


proc winMinimize*(w: Webview) =
  when defined(windows):
    let hwnd = getTopLevelWindow(w)
    if hwnd != nil: discard ShowWindow(hwnd, SW_MINIMIZE)
  elif defined(linux):
    gtk_window_iconify(w.getWindow())

proc winMaximize*(w: Webview) =
  when defined(windows):
    let hwnd = getTopLevelWindow(w)
    if hwnd != nil: discard ShowWindow(hwnd, SW_MAXIMIZE)
  elif defined(linux):
    gtk_window_maximize(w.getWindow())

proc winRestore*(w: Webview) =
  when defined(windows):
    let hwnd = getTopLevelWindow(w)
    if hwnd != nil: discard ShowWindow(hwnd, SW_RESTORE)
  elif defined(linux):
    gtk_window_unmaximize(w.getWindow())

proc winHide*(w: Webview) =
  when defined(windows):
    let hwnd = getTopLevelWindow(w)
    if hwnd != nil: discard ShowWindow(hwnd, SW_HIDE)
  elif defined(linux):
    gtk_widget_hide(w.getWindow())

proc winShow*(w: Webview) =
  when defined(windows):
    let hwnd = getTopLevelWindow(w)
    if hwnd != nil: discard ShowWindow(hwnd, SW_RESTORE)
  elif defined(linux):
    gtk_widget_show_all(w.getWindow())

proc winCenter*(w: Webview) =
  when defined(windows):
    let hwnd = getTopLevelWindow(w)
    if hwnd != nil:
      var rect: RECT
      if GetWindowRect(hwnd, addr rect):
        let width = rect.right - rect.left
        let height = rect.bottom - rect.top
        let screenWidth = GetSystemMetrics(SM_CXSCREEN)
        let screenHeight = GetSystemMetrics(SM_CYSCREEN)
        let x = (screenWidth - width) div 2
        let y = (screenHeight - height) div 2
        # SWP_NOZORDER = 0x0004, SWP_NOSIZE = 0x0001
        discard SetWindowPos(hwnd, nil, x, y, 0, 0, 0x0001 or 0x0004)
  elif defined(linux):
    # GTK_WIN_POS_CENTER = 1
    gtk_window_set_position(w.getWindow(), 1)

