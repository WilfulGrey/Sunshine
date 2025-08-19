import React, { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface AuthFormProps {
  mode: 'signin' | 'signup' | 'reset'
  onModeChange: (mode: 'signin' | 'signup' | 'reset') => void
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode, onModeChange }) => {
  const { signIn, signUp, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName)
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Sprawdź swoją skrzynkę e-mail, aby potwierdzić konto!')
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email)
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Link do resetowania hasła został wysłany na Twój e-mail!')
        }
      }
    } catch (err) {
      setError('Wystąpił nieoczekiwany błąd')
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'signin': return 'Zaloguj się'
      case 'signup': return 'Utwórz konto'
      case 'reset': return 'Resetuj hasło'
    }
  }

  const getButtonText = () => {
    if (loading) return 'Ładowanie...'
    switch (mode) {
      case 'signin': return 'Zaloguj się'
      case 'signup': return 'Utwórz konto'
      case 'reset': return 'Wyślij link'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold" style={{ color: '#AB4D95' }}>M</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Mamamia Tasks</h2>
          <p className="text-gray-600">{getTitle()}</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Imię i nazwisko
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="Jan Kowalski"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adres e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="jan@example.com"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Hasło
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#AB4D95' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#9A3D85')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#AB4D95')}
          >
            {getButtonText()}
          </button>

          <div className="text-center space-y-2">
            {mode === 'signin' && (
              <>
                <button
                  type="button"
                  onClick={() => onModeChange('reset')}
                  className="text-sm text-purple-600 hover:text-purple-800 transition-colors"
                >
                  Zapomniałeś hasła?
                </button>
                <div className="text-sm text-gray-600">
                  Nie masz konta?{' '}
                  <button
                    type="button"
                    onClick={() => onModeChange('signup')}
                    className="text-purple-600 hover:text-purple-800 font-medium transition-colors"
                  >
                    Zarejestruj się
                  </button>
                </div>
              </>
            )}

            {mode === 'signup' && (
              <div className="text-sm text-gray-600">
                Masz już konto?{' '}
                <button
                  type="button"
                  onClick={() => onModeChange('signin')}
                  className="text-purple-600 hover:text-purple-800 font-medium transition-colors"
                >
                  Zaloguj się
                </button>
              </div>
            )}

            {mode === 'reset' && (
              <div className="text-sm text-gray-600">
                Pamiętasz hasło?{' '}
                <button
                  type="button"
                  onClick={() => onModeChange('signin')}
                  className="text-purple-600 hover:text-purple-800 font-medium transition-colors"
                >
                  Zaloguj się
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}