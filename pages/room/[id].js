import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { io } from 'socket.io-client'

const CARDS = ['1', '2', '3', '5', '8', '13', '21', '?', '☕']
const AVATARS = [
  '🙂', '🦊', '🐼', '🐸', '🐵', '🐧',
  '🦁', '🐨', '🐯', '🐙', '🦄', '🐝',
  '🐶', '🐱', '🐰', '🐻', '🐮', '🐷',
  '🐔', '🦉', '🐢', '🦋', '🐳', '🦒',
  '🐺', '🐹', '🐭', '🐴', '🦌', '🐐',
  '🐑', '🦏', '🐍', '🦑', '🦀', '🦆', '🦓',
  '😎', '🤖', '👽', '👻', '🎃', '🥷',
  '🧙', '🦸', '🐲', '🔥', '⭐', '🍕',
]

export default function Room() {
  const router = useRouter()
  const { id: roomId } = router.query

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [avatarInput, setAvatarInput] = useState(AVATARS[0])
  const [roomState, setRoomState] = useState(null)
  const [myVote, setMyVote] = useState(null)
  const [socketId, setSocketId] = useState(null)
  const [copied, setCopied] = useState(false)
  const [replaced, setReplaced] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const socketRef = useRef(null)

  // Load saved name + avatar
  useEffect(() => {
    const saved = localStorage.getItem('poker-planning-name')
    if (saved) setName(saved)
    const savedAvatar = localStorage.getItem('poker-planning-avatar')
    if (savedAvatar) {
      setAvatar(savedAvatar)
      setAvatarInput(savedAvatar)
    }
  }, [])

  // Connect once we have a roomId
  useEffect(() => {
    if (!roomId) return

    const socket = io()
    socketRef.current = socket

    socket.on('connect', () => setSocketId(socket.id))

    socket.on('room-state', (state) => {
      setRoomState(state)
      const me = state.participants.find(p => p.id === socket.id)
      if (state.revealed) {
        // Show my actual vote from server during reveal
        if (me) setMyVote(me.vote)
      } else if (me && !me.voted) {
        // Round was reset (e.g. someone else clicked "Next Story") —
        // clear my local pick so it doesn't linger from the last story
        setMyVote(null)
      }
    })

    socket.on('session-replaced', () => setReplaced(true))

    return () => {
      socket.disconnect()
      socketRef.current = null
      setSocketId(null)
      setRoomState(null)
    }
  }, [roomId])

  // (Re)join the room whenever our identity changes — same socket, so an
  // in-progress vote is preserved (see server's rejoin handling).
  useEffect(() => {
    if (!name || !socketId || !socketRef.current) return
    socketRef.current.emit('join-room', { roomId, name, avatar })
  }, [name, avatar, socketId, roomId])

  const handleNameSubmit = (e) => {
    e.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) return
    localStorage.setItem('poker-planning-name', trimmed)
    localStorage.setItem('poker-planning-avatar', avatarInput)
    setName(trimmed)
    setAvatar(avatarInput)
  }

  const openProfileEditor = () => {
    setEditName(name)
    setEditAvatar(avatar)
    setEditOpen(true)
  }

  const saveProfile = (e) => {
    e.preventDefault()
    const trimmed = editName.trim()
    if (!trimmed) return
    localStorage.setItem('poker-planning-name', trimmed)
    localStorage.setItem('poker-planning-avatar', editAvatar)
    setName(trimmed)
    setAvatar(editAvatar)
    setEditOpen(false)
  }

  const pickCard = (value) => {
    if (roomState?.revealed || !socketRef.current) return
    setMyVote(value)
    socketRef.current.emit('pick-card', { roomId, value })
  }

  const reveal = () => socketRef.current?.emit('reveal-votes', { roomId })

  const reset = () => {
    setMyVote(null)
    socketRef.current?.emit('reset-round', { roomId })
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Name entry screen
  if (replaced) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#07060d] flex items-center justify-center p-4">
        <Head><title>Joined elsewhere · Poker Planning</title></Head>

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[-12%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]" />
          <div className="absolute bottom-[-18%] right-[-12%] h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/20 blur-[120px]" />
        </div>

        <div className="relative w-full max-w-sm animate-fadeInUp rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-3 text-3xl">👋</div>
          <h1 className="mb-1 text-2xl font-bold text-white">Joined in another tab</h1>
          <p className="mb-6 text-sm text-slate-400">
            This room was opened as <span className="text-slate-300">{name}</span> in a different tab or window, so this one has been disconnected.
          </p>
          <button
            onClick={() => {
              setReplaced(false)
              socketRef.current?.connect()
            }}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-3 font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110"
          >
            Reconnect here instead
          </button>
        </div>
      </div>
    )
  }

  if (!name) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#07060d] flex items-center justify-center p-4">
        <Head><title>Join Room · Poker Planning</title></Head>

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[-12%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]" />
          <div className="absolute bottom-[-18%] right-[-12%] h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/20 blur-[120px]" />
        </div>

        <div className="relative w-full max-w-sm animate-fadeInUp rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-3 text-3xl">🃏</div>
          <h1 className="mb-1 text-2xl font-bold text-white">Join Room</h1>
          <p className="mb-6 text-sm text-slate-400">Enter your name to start estimating</p>
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-3">
            <input
              autoFocus
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Your name"
              maxLength={30}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition focus:border-indigo-400/60 focus:bg-white/[0.07] focus:outline-none"
            />

            <p className="mt-1 text-left text-xs font-medium text-slate-500">Pick an avatar</p>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map(a => {
                const selected = avatarInput === a
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatarInput(a)}
                    aria-label={`Avatar ${a}`}
                    className={`
                      flex h-11 w-11 items-center justify-center rounded-xl border-2 text-xl transition
                      ${selected
                        ? 'border-transparent bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-900/40'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }
                    `}
                  >
                    {a}
                  </button>
                )
              })}
            </div>

            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-3 font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/5 disabled:text-slate-500 disabled:shadow-none"
            >
              Join
            </button>
          </form>
        </div>
      </div>
    )
  }

  const voteCount = roomState?.participants.filter(p => p.voted).length ?? 0
  const totalCount = roomState?.participants.length ?? 0
  const average = getAverage(roomState)

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07060d] text-white flex flex-col">
      <Head><title>Poker Planning</title></Head>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-12%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-18%] right-[-12%] h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/15 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#07060d]/70 px-6 py-4 flex items-center justify-between shrink-0 backdrop-blur-xl">
        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-lg font-bold text-white transition hover:text-indigo-300">
          <span>🃏</span> Poker Planning
        </button>
        <div className="flex items-center gap-3">
          <code className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm tracking-wider text-slate-400">
            {roomId}
          </code>
          <button
            onClick={copyLink}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
          <div className="relative">
            <button
              onClick={() => (editOpen ? setEditOpen(false) : openProfileEditor())}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
            >
              <span className="text-base leading-none">{avatar || '🙂'}</span>
              <span className="max-w-[80px] truncate">{name}</span>
            </button>

            {editOpen && (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-72 rounded-2xl border border-white/10 bg-[#0d0b16] p-4 shadow-2xl shadow-black/50">
                <form onSubmit={saveProfile} className="flex flex-col gap-3">
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Your name"
                    maxLength={30}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 transition focus:border-indigo-400/60 focus:bg-white/[0.07] focus:outline-none"
                  />
                  <div className="grid grid-cols-6 gap-1.5">
                    {AVATARS.map(a => {
                      const selected = editAvatar === a
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setEditAvatar(a)}
                          aria-label={`Avatar ${a}`}
                          className={`
                            flex h-9 w-9 items-center justify-center rounded-lg border-2 text-lg transition
                            ${selected
                              ? 'border-transparent bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-900/40'
                              : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                            }
                          `}
                        >
                          {a}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditOpen(false)}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!editName.trim()}
                      className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/5 disabled:text-slate-500 disabled:shadow-none"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-[1] flex-1 max-w-5xl mx-auto w-full px-6 py-8 flex flex-col gap-8">

        {/* Participants + actions */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-300">
              Players
              {roomState && !roomState.revealed && (
                <span className="ml-3 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-normal text-slate-400">
                  {voteCount} / {totalCount} voted
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              {!roomState?.revealed ? (
                <button
                  onClick={reveal}
                  disabled={voteCount === 0}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/5 disabled:text-slate-500 disabled:shadow-none"
                >
                  Reveal Votes
                </button>
              ) : (
                <button
                  onClick={reset}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-amber-900/30 transition hover:brightness-110"
                >
                  Next Story
                </button>
              )}
            </div>
          </div>

          {/* Player cards */}
          <div className="flex flex-wrap gap-4">
            {roomState?.participants.map(p => (
              <PlayerCard
                key={p.id}
                participant={p}
                revealed={roomState.revealed}
                isMe={p.id === socketId}
              />
            ))}
            {!roomState && (
              <p className="text-slate-500 text-sm">Connecting...</p>
            )}
          </div>
        </section>

        {/* Results panel */}
        {roomState?.revealed && (
          <section className="animate-fadeInUp rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <h2 className="font-semibold text-slate-300 mb-5">Results</h2>
            <div className="flex flex-wrap items-end gap-10">
              {average !== null && (
                <div>
                  <div className="bg-gradient-to-br from-indigo-300 to-fuchsia-300 bg-clip-text text-5xl font-extrabold tabular-nums text-transparent">
                    {average}
                  </div>
                  <div className="text-slate-400 text-sm mt-1">Average</div>
                </div>
              )}
              <VoteDistribution participants={roomState.participants} />
            </div>
          </section>
        )}

        {/* Card picker */}
        {!roomState?.revealed && (
          <section className="mt-auto pt-4">
            <h2 className="font-semibold text-slate-300 mb-4">
              Your vote
              {myVote && (
                <span className="ml-2 text-indigo-400 font-normal text-sm">— picked {myVote}</span>
              )}
            </h2>
            <div className="flex flex-wrap gap-3">
              {CARDS.map(card => {
                const selected = myVote === card
                return (
                  <button
                    key={card}
                    onClick={() => pickCard(card)}
                    className={`
                      relative h-24 w-16 shrink-0 rounded-xl border-2 text-xl font-bold transition-all duration-200
                      ${selected
                        ? '-translate-y-2 scale-105 border-transparent bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-xl shadow-indigo-900/50'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10'
                      }
                    `}
                  >
                    <span className="absolute left-2 top-1.5 text-[10px] font-semibold opacity-60">{card}</span>
                    <span>{card}</span>
                    <span className="absolute bottom-1.5 right-2 rotate-180 text-[10px] font-semibold opacity-60">{card}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function PlayerCard({ participant, revealed, isMe }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="[perspective:800px]">
        <div
          className={`relative h-20 w-14 transition-transform duration-500 [transform-style:preserve-3d] ${
            revealed ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* Back of card — shown before reveal */}
          <div
            className={`
              absolute inset-0 flex items-center justify-center rounded-xl border-2 [backface-visibility:hidden]
              ${isMe ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#07060d]' : ''}
              ${participant.voted
                ? 'border-transparent bg-gradient-to-br from-indigo-600 to-fuchsia-600 shadow-lg shadow-indigo-900/40'
                : 'border-dashed border-white/15 bg-white/5'
              }
            `}
          >
            <span className={`text-lg font-bold ${participant.voted ? 'text-white' : 'text-slate-700'}`}>
              {participant.voted ? '✓' : '·'}
            </span>
          </div>

          {/* Front of card — shown after reveal */}
          <div
            className={`
              absolute inset-0 flex items-center justify-center rounded-xl border-2 [backface-visibility:hidden] [transform:rotateY(180deg)]
              ${isMe ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#07060d]' : ''}
              ${participant.vote
                ? 'border-slate-200 bg-gradient-to-br from-white to-slate-200 text-slate-900'
                : 'border-white/10 bg-white/5 text-slate-500'
              }
            `}
          >
            <span className="text-lg font-extrabold">{participant.vote ?? '–'}</span>
          </div>
        </div>
      </div>
      <span className={`flex items-center gap-1 max-w-[80px] text-xs ${isMe ? 'text-indigo-400 font-semibold' : 'text-slate-400'}`}>
        <span className="text-sm leading-none">{participant.avatar || '🙂'}</span>
        <span className="truncate">{isMe ? 'You' : participant.name}</span>
      </span>
    </div>
  )
}

function VoteDistribution({ participants }) {
  const counts = {}
  participants.forEach(p => {
    if (p.vote != null) counts[p.vote] = (counts[p.vote] || 0) + 1
  })

  const sorted = Object.entries(counts).sort(([a], [b]) => {
    const na = Number(a), nb = Number(b)
    if (!isNaN(na) && !isNaN(nb)) return na - nb
    return a.localeCompare(b)
  })

  const max = Math.max(...Object.values(counts))

  return (
    <div className="flex items-end gap-3">
      {sorted.map(([vote, count]) => (
        <div key={vote} className="flex flex-col items-center gap-1.5">
          <span className="text-slate-400 text-xs font-medium">{count}×</span>
          <div
            className={`w-12 h-16 rounded-xl flex items-center justify-center text-lg font-bold border-2 transition-all
              ${count === max
                ? 'border-transparent bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-900/40'
                : 'border-white/10 bg-white/5 text-slate-300'
              }`}
          >
            {vote}
          </div>
        </div>
      ))}
    </div>
  )
}

function getAverage(roomState) {
  if (!roomState?.revealed) return null
  const nums = roomState.participants
    .map(p => p.vote)
    .filter(v => v && !isNaN(Number(v)))
    .map(Number)
  if (!nums.length) return null
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)
}
