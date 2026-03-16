'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const sb = createClient()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-white">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl font-bold">S</div>
        <CardTitle className="text-2xl text-white">Simply Transport</CardTitle>
        <CardDescription className="text-slate-400">Sign in to your fleet dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Email</Label>
            <Input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com.au" required
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Password</Label>
            <Input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-slate-400 text-sm">
          No account?{' '}
          <Link href="/register" className="text-blue-400 hover:underline">Create one free</Link>
        </p>
      </CardFooter>
    </Card>
  )
}
