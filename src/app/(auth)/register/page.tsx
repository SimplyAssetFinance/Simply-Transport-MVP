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

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const sb = createClient()
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { name, company_name: company } },
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Account created! Signing you in…')
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-white">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl font-bold">S</div>
        <CardTitle className="text-2xl text-white">Create Account</CardTitle>
        <CardDescription className="text-slate-400">Start your free trial — no credit card required</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-slate-300">Your Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Aaron"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" required />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Company</Label>
              <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Haulage Pty Ltd"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com.au"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" required />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
              className="bg-slate-800 border-slate-700 text-white" required minLength={6} />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Free Account'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-slate-400 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:underline">Sign in</Link>
        </p>
      </CardFooter>
    </Card>
  )
}
