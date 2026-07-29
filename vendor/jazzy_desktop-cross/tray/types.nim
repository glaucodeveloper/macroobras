type
  TrayMenuCallback* = proc()
  TrayMenuItem* = object
    id*: int
    label*: string
    callback*: TrayMenuCallback
