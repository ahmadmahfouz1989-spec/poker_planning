const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// roomId -> { participants: Map<socketId, { name, avatar, vote }>, revealed: bool }
const rooms = new Map()

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { participants: new Map(), revealed: false })
    console.log(`[room-created] room=${roomId}`)
  }
  return rooms.get(roomId)
}

function getRoomState(room) {
  return {
    participants: Array.from(room.participants.entries()).map(([id, p]) => ({
      id,
      name: p.name,
      avatar: p.avatar,
      voted: p.vote !== null,
      vote: room.revealed ? p.vote : null,
    })),
    revealed: room.revealed,
  }
}

function cleanupSocket(socket, io) {
  if (!socket._roomId) return
  const room = rooms.get(socket._roomId)
  if (!room) return
  room.participants.delete(socket.id)
  if (room.participants.size === 0) {
    rooms.delete(socket._roomId)
    console.log(`[room-closed] room=${socket._roomId}`)
  } else {
    io.to(socket._roomId).emit('room-state', getRoomState(room))
  }
  socket._roomId = null
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer)

  io.on('connection', (socket) => {
    socket._roomId = null

    socket.on('join-room', ({ roomId, name, avatar }) => {
      if (!roomId || !name) return

      // Leave previous room if switching
      if (socket._roomId && socket._roomId !== roomId) {
        cleanupSocket(socket, io)
        socket.leave(socket._roomId)
      }

      socket._roomId = roomId
      socket.join(roomId)

      const room = getOrCreateRoom(roomId)

      // Same name already active in this room from another connection
      // (e.g. the same browser opened in a second tab) — evict it so
      // only one live entry per name remains.
      for (const [id, p] of room.participants) {
        if (id !== socket.id && p.name === name) {
          room.participants.delete(id)
          const staleSocket = io.sockets.sockets.get(id)
          if (staleSocket) {
            staleSocket._roomId = null
            staleSocket.leave(roomId)
            staleSocket.emit('session-replaced')
            staleSocket.disconnect(true)
          }
        }
      }

      // Preserve vote if rejoining (e.g., page refresh)
      if (!room.participants.has(socket.id)) {
        room.participants.set(socket.id, { name, avatar: avatar || '🙂', vote: null })
        console.log(`[join] room=${roomId} name="${name}"`)
      } else {
        const participant = room.participants.get(socket.id)
        participant.name = name
        participant.avatar = avatar || '🙂'
      }

      io.to(roomId).emit('room-state', getRoomState(room))
    })

    socket.on('pick-card', ({ roomId, value }) => {
      const room = rooms.get(roomId)
      if (!room || room.revealed) return
      const participant = room.participants.get(socket.id)
      if (!participant) return
      participant.vote = value ?? null
      console.log(`[vote] room=${roomId} name="${participant.name}" vote=${value ?? 'null'}`)
      io.to(roomId).emit('room-state', getRoomState(room))
    })

    socket.on('reveal-votes', ({ roomId }) => {
      const room = rooms.get(roomId)
      if (!room || room.revealed) return
      room.revealed = true
      const votes = Array.from(room.participants.values()).map((p) => `${p.name}=${p.vote ?? '-'}`).join(', ')
      console.log(`[reveal] room=${roomId} votes=[${votes}]`)
      io.to(roomId).emit('room-state', getRoomState(room))
    })

    socket.on('reset-round', ({ roomId }) => {
      const room = rooms.get(roomId)
      if (!room) return
      room.revealed = false
      for (const p of room.participants.values()) p.vote = null
      console.log(`[reset] room=${roomId}`)
      io.to(roomId).emit('room-state', getRoomState(room))
    })

    socket.on('disconnect', () => cleanupSocket(socket, io))
  })

  const port = process.env.PORT || 3000
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
