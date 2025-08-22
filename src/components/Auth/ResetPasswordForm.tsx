import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'

export const ResetPasswordForm: React.FC = () => {
  const { updatePassword } = useAuth()
  const { t } = useLanguage()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasAccessToken, setHasAccessToken] = useState(false)

  useEffect(() => {
    // Sprawdź czy mamy access_token w URL (z Supabase email link)
    const urlParams = new URLSearchParams(window.location.search)
    const accessToken = urlParams.get('access_token')
    
    if (accessToken) {
      setHasAccessToken(true)
    } else {
      setError('Nieprawidłowy lub wygasły link. Poproś o nowy link resetujący hasło.')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError(t.passwordsNotIdentical)
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError(t.passwordMinLength)
      setLoading(false)
      return
    }

    try {
      const { error } = await updatePassword(password)
      if (error) {
        setError(error.message)
      } else {
        setSuccess(t.passwordResetSuccess)
        // Przekieruj do logowania po 3 sekundach
        setTimeout(() => {
          window.location.href = '/'
        }, 3000)
      }
    } catch (err) {
      setError(t.unexpectedError)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold" style={{ color: '#AB4D95' }}>M</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Mamamia Tasks</h2>
          <p className="text-gray-600">Ustaw nowe hasło</p>
        </div>

        {!hasAccessToken ? (
          <div className="text-center space-y-4">
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
            <button
              onClick={handleBackToLogin}
              className="w-full py-3 px-4 text-white font-medium rounded-lg transition-colors"
              style={{ backgroundColor: '#AB4D95' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#9A3D85')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#AB4D95')}
            >
              Powrót do logowania
            </button>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Nowe hasło
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
                    minLength={6}
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

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Potwierdź nowe hasło
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
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
              {loading ? t.changing : t.changePassword}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-sm text-purple-600 hover:text-purple-800 transition-colors"
              >
                {t.backToLogin}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}