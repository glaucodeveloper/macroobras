# FFI bindings for webview.h (Microsoft WebView2 backend)
import os

const webviewHeader = currentSourcePath().splitPath().head & "/vendor/webview.h"

when defined(gcc) or defined(clang):
  {.passC: "-Wno-incompatible-pointer-types".}



when defined(windows):
  {.passL: "-lole32 -lshlwapi -lversion -ladvapi32 -luser32".}
elif defined(linux):
  const pkgConfigCheck = gorgeEx("pkg-config --exists webkit2gtk-4.1")
  when pkgConfigCheck.exitCode == 0:
    {.passC: gorge("pkg-config --cflags gtk+-3.0 webkit2gtk-4.1").}
    {.passL: gorge("pkg-config --libs gtk+-3.0 webkit2gtk-4.1").}
  else:
    {.passC: gorge("pkg-config --cflags gtk+-3.0 webkit2gtk-4.0").}
    {.passL: gorge("pkg-config --libs gtk+-3.0 webkit2gtk-4.0").}
elif defined(macosx):
  {.passL: "-framework WebKit".}

# -- TYPES --

type
  Webview* = pointer

  WebviewError* {.size: sizeof(cint).} = enum
    MissingDependency = -5
    Canceled = -4
    InvalidState = -3
    InvalidArgument = -2
    Unspecified = -1
    Ok = 0
    Duplicate = 1
    NotFound = 2

  WebviewNativeHandleKind* {.size: sizeof(cint).} = enum
    UiWindow = 0
    UiWidget = 1
    BrowserController = 2

  WebviewHint* {.size: sizeof(cint).} = enum
    None = 0
    Min = 1
    Max = 2
    Fixed = 3

  WebviewVersion* {.bycopy.} = object
    major*: cuint
    minor*: cuint
    patch*: cuint

  WebviewVersionInfo* {.bycopy.} = object
    version*: WebviewVersion
    versionNumber*: array[32, char]
    preRelease*: array[48, char]
    buildMetadata*: array[48, char]

# -- CALLBACK TYPES --

type
  DispatchFn* = proc (w: Webview, arg: pointer) {.cdecl.}
  BindFn* = proc (seq: cstring, req: cstring, arg: pointer) {.cdecl.}

# -- FUNCTIONS --

proc create*(debug: cint, window: pointer): Webview {.importc: "webview_create", header: webviewHeader.}
proc destroy*(w: Webview): WebviewError {.importc: "webview_destroy", header: webviewHeader, discardable.}
proc run*(w: Webview): WebviewError {.importc: "webview_run", header: webviewHeader, discardable.}
proc terminate*(w: Webview): WebviewError {.importc: "webview_terminate", header: webviewHeader, discardable.}
proc dispatch*(w: Webview, fn: DispatchFn, arg: pointer): WebviewError {.importc: "webview_dispatch", header: webviewHeader, discardable.}
proc getWindow*(w: Webview): pointer {.importc: "webview_get_window", header: webviewHeader.}
proc getNativeHandle*(w: Webview, kind: WebviewNativeHandleKind): pointer {.importc: "webview_get_native_handle", header: webviewHeader.}
proc setTitle*(w: Webview, title: cstring): WebviewError {.importc: "webview_set_title", header: webviewHeader, discardable.}
proc setSize*(w: Webview, width: cint, height: cint, hints: WebviewHint): WebviewError {.importc: "webview_set_size", header: webviewHeader, discardable.}
proc navigate*(w: Webview, url: cstring): WebviewError {.importc: "webview_navigate", header: webviewHeader, discardable.}
proc setHtml*(w: Webview, html: cstring): WebviewError {.importc: "webview_set_html", header: webviewHeader, discardable.}
proc init*(w: Webview, js: cstring): WebviewError {.importc: "webview_init", header: webviewHeader, discardable.}
proc eval*(w: Webview, js: cstring): WebviewError {.importc: "webview_eval", header: webviewHeader, discardable.}
proc bindFn*(w: Webview, name: cstring, fn: BindFn, arg: pointer): WebviewError {.importc: "webview_bind", header: webviewHeader, discardable.}
proc unbindFn*(w: Webview, name: cstring): WebviewError {.importc: "webview_unbind", header: webviewHeader, discardable.}
proc returnResult*(w: Webview, id: cstring, status: cint, result: cstring): WebviewError {.importc: "webview_return", header: webviewHeader, discardable.}
proc getVersion*(): ptr WebviewVersionInfo {.importc: "webview_version", header: webviewHeader.}
