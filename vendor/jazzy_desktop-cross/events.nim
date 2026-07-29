import jazzy, json, locks

var wsLock: Lock
var wsClients {.guard: wsLock.}: seq[JazzyWebSocket] = @[]

initLock(wsLock)

proc initEventServer*() =
  Route.ws("/_jazzy/events", proc(ws: JazzyWebSocket, event: WsEvent, msg: WsMessage) =
    {.cast(gcsafe).}:
      case event
      of OpenEvent:
        withLock wsLock:
          wsClients.add(ws)
      of MessageEvent:
        discard
      of CloseEvent, ErrorEvent:
        withLock wsLock:
          let idx = wsClients.find(ws)
          if idx >= 0:
            wsClients.del(idx)
  )

proc emit*(eventName: string, payload: JsonNode = %*{}) =
  {.cast(gcsafe).}:
    let eventData = %*{
      "event": eventName,
      "payload": payload
    }
    let strData = $eventData
    
    var clients: seq[JazzyWebSocket]
    withLock wsLock:
      clients = wsClients
    
    for ws in clients:
      try:
        ws.send(strData)
      except:
        discard
