import { useRouter } from 'next/router'
import { useState } from 'react'
import Head from 'next/head'

export default function Home() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')

  const createRoom = () => {
    const id = crypto.randomUUID().slice(0, 8)
    router.push(`/room/${id}`)
  }

  const joinRoom = (e) => {
    e.preventDefault()
    const input = joinCode.trim()
    if (!input) return
    // Accept full URL or just the code
    const match = input.match(/\/room\/([a-zA-Z0-9-]+)/)
    const roomId = match ? match[1] : input
    router.push(`/room/${roomId}`)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07060d] flex items-center justify-center p-4">
      <Head>
        <title>Poker Planning</title>
      </Head>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-12%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]" />
        <div className="absolute bottom-[-18%] right-[-12%] h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm animate-fadeInUp text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-3xl shadow-lg shadow-indigo-900/50">
          🃏
        </div>
        <h1 className="bg-gradient-to-br from-white to-slate-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          Poker Planning
        </h1>
        <p className="mt-3 mb-10 text-slate-400">Effortless estimation for agile teams</p>

        <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <button
            onClick={createRoom}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 py-3 text-lg font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110 active:scale-[0.98]"
          >
            Create New Room
          </button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-slate-600">
            <div className="h-px flex-1 bg-white/10" />
            or join existing
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={joinRoom} className="flex flex-col gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              placeholder="Paste room link or code"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition focus:border-indigo-400/60 focus:bg-white/[0.07] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
