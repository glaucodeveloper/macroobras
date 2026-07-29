import strutils, types

type
  HWND = int
  HINSTANCE = int
  LPCWSTR = WideCString
  LPWSTR = WideCString
  DWORD = int32
  WORD = int16
  UINT = int32
  LPARAM = int

  OPENFILENAMEW {.pure, final.} = object
    lStructSize: DWORD
    hwndOwner: HWND
    hInstance: HINSTANCE
    lpstrFilter: LPCWSTR
    lpstrCustomFilter: LPWSTR
    nMaxCustFilter: DWORD
    nFilterIndex: DWORD
    lpstrFile: LPWSTR
    nMaxFile: DWORD
    lpstrFileTitle: LPWSTR
    nMaxFileTitle: DWORD
    lpstrInitialDir: LPCWSTR
    lpstrTitle: LPCWSTR
    Flags: DWORD
    nFileOffset: WORD
    nFileExtension: WORD
    lpstrDefExt: LPCWSTR
    lCustData: LPARAM
    lpfnHook: pointer
    lpTemplateName: LPCWSTR
    pvReserved: pointer
    dwReserved: DWORD
    FlagsEx: DWORD

const
  OFN_FILEMUSTEXIST    = 0x00001000'i32
  OFN_PATHMUSTEXIST    = 0x00000800'i32
  OFN_OVERWRITEPROMPT  = 0x00000002'i32
  OFN_HIDEREADONLY     = 0x00000004'i32
  OFN_ALLOWMULTISELECT = 0x00000200'i32
  OFN_EXPLORER         = 0x00080000'i32

  MB_OK = 0x00000000'i32
  MB_ICONERROR = 0x00000010'i32
  MB_ICONQUESTION = 0x00000020'i32
  MB_ICONWARNING = 0x00000030'i32
  MB_ICONINFORMATION = 0x00000040'i32

proc GetOpenFileNameW(lpofn: ptr OPENFILENAMEW): bool {.stdcall, dynlib: "comdlg32.dll", importc: "GetOpenFileNameW".}
proc GetSaveFileNameW(lpofn: ptr OPENFILENAMEW): bool {.stdcall, dynlib: "comdlg32.dll", importc: "GetSaveFileNameW".}
proc MessageBoxW(hWnd: HWND, lpText: LPCWSTR, lpCaption: LPCWSTR, uType: UINT): int32 {.stdcall, dynlib: "user32.dll", importc: "MessageBoxW".}

proc buildWinFilter(filters: seq[DialogFilter]): seq[int16] =
  var res: seq[int16] = @[]
  if filters.len == 0: return res
  for f in filters:
    let wName = newWideCString(f.name)
    var i = 0
    while int(wName[i]) != 0:
      res.add(cast[int16](wName[i]))
      inc(i)
    res.add(0'i16)
    
    let wExt = newWideCString(f.extensions)
    i = 0
    while int(wExt[i]) != 0:
      res.add(cast[int16](wExt[i]))
      inc(i)
    res.add(0'i16)
  res.add(0'i16)
  return res

proc selectFileDialog*(title: string, filters: seq[DialogFilter] = @[], multiSelect: bool = false, forSave: bool = false): string =
  const bufSize = 8192
  var ofn: OPENFILENAMEW
  ofn.lStructSize = cast[DWORD](sizeof(OPENFILENAMEW))
  
  var fileName = newWideCString(newString(bufSize))
  ofn.lpstrFile = fileName
  ofn.nMaxFile = bufSize
  
  var wTitle = newWideCString(title)
  ofn.lpstrTitle = wTitle
  
  var filterBuf = buildWinFilter(filters)
  if filterBuf.len > 0:
    ofn.lpstrFilter = cast[LPCWSTR](filterBuf[0].addr)
  
  if forSave:
    ofn.Flags = OFN_PATHMUSTEXIST or OFN_OVERWRITEPROMPT or OFN_HIDEREADONLY
    if GetSaveFileNameW(addr ofn): return $ofn.lpstrFile
  else:
    ofn.Flags = OFN_PATHMUSTEXIST or OFN_FILEMUSTEXIST or OFN_HIDEREADONLY
    if multiSelect:
      ofn.Flags = ofn.Flags or OFN_ALLOWMULTISELECT or OFN_EXPLORER
    if GetOpenFileNameW(addr ofn):
      if not multiSelect:
        return $ofn.lpstrFile
      # Multi-select result: directory\0file1\0file2\0\0
      # If only one file was selected, the buffer contains the full path directly.
      var results: seq[string] = @[]
      var pos = 0
      var parts: seq[string] = @[]
      while pos < bufSize:
        var s = ""
        while pos < bufSize and int(cast[ptr int16](cast[int](fileName) + pos * 2)[]) != 0:
          s.add(char(int(cast[ptr int16](cast[int](fileName) + pos * 2)[])))
          inc(pos)
        if s.len == 0: break
        parts.add(s)
        inc(pos) # skip null
      if parts.len == 1:
        # Single file selected
        results.add(parts[0])
      else:
        # parts[0] = directory, rest = filenames
        let dir = parts[0]
        for i in 1 ..< parts.len:
          results.add(dir & "\\" & parts[i])
      return results.join("\n")
    
  return ""

proc showMessageBox*(title: string, message: string, msgType: MsgBoxType = mbInfo) =
  var flags = MB_OK
  case msgType
  of mbInfo: flags = flags or MB_ICONINFORMATION
  of mbWarning: flags = flags or MB_ICONWARNING
  of mbError: flags = flags or MB_ICONERROR
  of mbQuestion: flags = flags or MB_ICONQUESTION

  discard MessageBoxW(0, newWideCString(message), newWideCString(title), flags)
