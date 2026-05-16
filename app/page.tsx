'use client'

import Image from 'next/image'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isGuestMode, setIsGuestMode] = useState(false)

async function handlePasswordSignIn(e: FormEvent<HTMLFormElement>) {
  e.preventDefault()

  setMessage('')
  setIsError(false)

  const loginEmail = isGuestMode
    ? 'specialguest@restoreswansea.local'
    : email

  const { error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password,
  })

  if (error) {
    setIsError(true)
    setMessage(error.message)
    return
  }

  setMessage('Signed in successfully. Redirecting to dashboard...')

  router.push('/dashboard')
  router.refresh()
}

  async function handleMagicLink() {
    setMessage('')
    setIsError(false)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setIsError(true)
      setMessage(error.message)
      return
    }

    setMessage('Magic link sent. Check your email inbox.')
  }

  function enableGuestMode() {
    setIsGuestMode(true)
    setPassword('')
    setMessage('Enter the guest password to continue.')
    setIsError(false)
  }

  function disableGuestMode() {
    setIsGuestMode(false)
    setEmail('')
    setPassword('')
    setMessage('')
    setIsError(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#051b3a] px-4 py-10">
      <section className="w-full max-w-3xl rounded-xl bg-white p-6 text-black shadow-xl sm:p-8">
        <div className="flex flex-col items-center border-b pb-8">
          <Image
            src="/images/restore_swansea.png"
            alt="Restore Swansea"
            width={1000}
            height={330}
            priority
            className="h-auto w-full max-w-xl"
          />

          <p className="mt-6 max-w-2xl text-center text-sm leading-6 text-zinc-600">
            This platform coordinates volunteer leafletting activity across
            Swansea wards. Access is restricted to approved campaign members
            and authorised local teams.
          </p>

          <p className="mt-2 text-xs text-zinc-500">
            If you require access, contact your local campaign coordinator.
          </p>
        </div>

        <form
          onSubmit={handlePasswordSignIn}
          className="mx-auto mt-8 w-full max-w-sm space-y-4"
        >
          <div>
            <h1 className="text-xl font-semibold">
              {isGuestMode ? 'Guest organiser access' : 'Sign in'}
            </h1>

            <p className="mt-1 text-sm text-zinc-600">
              {isGuestMode
                ? 'Enter the shared guest password provided by the local team.'
                : 'Use your account details to access the dashboard.'}
            </p>
          </div>

          {!isGuestMode && (
            <input
              className="w-full rounded border px-3 py-2 text-black"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
          <input
            className="w-full rounded border px-3 py-2 text-black"
            type="password"
            placeholder={isGuestMode ? 'Guest password' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            className="w-full rounded bg-[#051b3a] px-4 py-2 text-white"
            type="submit"
          >
            {isGuestMode
              ? 'Enter guest dashboard'
              : 'Sign in with password'}
          </button>

          {!isGuestMode && (
            <>
              <button
                className="w-full rounded border px-4 py-2 text-[#051b3a]"
                type="button"
                onClick={enableGuestMode}
              >
                Guest organiser access
              </button>

              <button
                className="w-full rounded border px-4 py-2 text-[#051b3a]"
                type="button"
                onClick={handleMagicLink}
                disabled={!email}
              >
                Send magic link
              </button>
            </>
          )}

          {isGuestMode && (
            <button
              className="w-full text-sm text-zinc-500 underline"
              type="button"
              onClick={disableGuestMode}
            >
              Use normal sign in instead
            </button>
          )}

          {message && (
            <p
              className={`text-sm ${
                isError ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </section>
    </main>
  )
}