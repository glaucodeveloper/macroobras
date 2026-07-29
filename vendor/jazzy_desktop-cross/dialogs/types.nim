type
  MsgBoxType* = enum
    mbInfo
    mbWarning
    mbError
    mbQuestion

  DialogFilter* = object
    name*: string
    extensions*: string
