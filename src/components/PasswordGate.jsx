import { useState } from 'react'
import { storage } from '../lib/storage'
import { LogoWithText } from './Logo'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card } from './ui/Card'

const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD || 'hopscotch2024'

const STORAGE_KEY = 'hopscotch_authenticated'

export function usePasswordAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const authenticate = (password) => {
    if (password === SITE_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'true')
      setIsAuthenticated(true)
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    storage.clearUserData()
    setIsAuthenticated(false)
  }

  return { isAuthenticated, authenticate, logout }
}

export function PasswordGate({ children }) {
  const { isAuthenticated, authenticate } = usePasswordAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (authenticate(password)) {
      setError(false)
    } else {
      setError(true)
      setPassword('')
    }
  }

  if (isAuthenticated) {
    return children
  }

  return (
    <div className="min-h-screen bg-hop-pebble px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <LogoWithText size="large" />
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="font-display text-xl text-hop-forest font-semibold">
                Staff Access
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Enter the password to continue
              </p>
            </div>

            <Input
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Enter password"
              required
            />

            {error && (
              <p className="text-hop-marmalade-dark text-sm text-center">
                Incorrect password. Please try again.
              </p>
            )}

            <Button type="submit" color="forest" fullWidth>
              Enter
            </Button>
          </form>
        </Card>

        <p className="text-center text-gray-400 text-xs mt-6 px-2 leading-relaxed">
          By using this tool, staff acknowledge that their name and signature will be recorded against compliance checks. This data is processed under legal obligation (food safety and Ofsted regulations) and retained for 1 year. For queries contact your manager.
        </p>

        <p className="text-center text-gray-400 text-xs mt-3">
          Hopscotch Children's Nurseries
        </p>
      </div>
    </div>
  )
}
