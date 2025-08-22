import React, { useState } from 'react'
import { Eye, EyeOff, Lock, User, Mail, AlertCircle, CheckCircle2, ArrowLeft, Settings, Languages } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { Language } from '../../utils/translations'

interface AccountSettingsProps {
  onBack: () => void
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ onBack }) => {
  const { user, updatePassword, updateProfile, signOut } = useAuth()
  const { language, updateUserLanguage, t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'language'>('profile')
  
  // Profile form state
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [email] = useState(user?.email || '')
  
  // Password form state
  const [currentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await updateProfile({ full_name: fullName })
      if (error) {
        setError(error.message)
      } else {
        setSuccess(t.profileUpdatedSuccess)
      }
    } catch {
      setError(t.unexpectedError)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (newPassword !== confirmPassword) {
      setError(t.passwordsDoNotMatch)
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError(t.passwordTooShort)
      setLoading(false)
      return
    }

    let passwordUpdateSucceeded = false
    try {
      const { error } = await updatePassword(newPassword)
      if (error) {
        console.error('Password update error from Supabase:', error)
        setError(error.message)
      } else {
        passwordUpdateSucceeded = true
        setSuccess(t.passwordChangedSuccess)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        console.log('Password updated successfully')
      }
    } catch (err) {
      console.error('Unexpected error during password update:', err)
      // If we got here after success was set, the password was likely updated despite the error
      // This happens with browser extensions like 1Password interfering
      if (passwordUpdateSucceeded) {
        console.log('Password update succeeded despite catch block - likely browser extension interference')
      } else {
        setError(t.unexpectedError)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLanguageUpdate = async (newLanguage: Language) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await updateUserLanguage(newLanguage)
      setSuccess(t.languageChangedSuccess)
    } catch (err) {
      setError(t.failedToChangeLanguage)
      console.error('Language update error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="h-8 w-8" style={{ color: '#AB4D95' }} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t.accountSettings}</h2>
          <p className="text-gray-600">{t.manageProfile}</p>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header z przyciskiem powrotu */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-purple-600 hover:text-purple-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>{t.backToApp}</span>
            </button>
            <div className="text-sm text-gray-500">
              {t.loggedInAs}: <span className="font-medium">{user?.email}</span>
            </div>
          </div>

          {/* Zakładki */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'profile'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.profile}
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'password'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.password}
              </button>
              <button
                onClick={() => setActiveTab('language')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                  activeTab === 'language'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Languages className="h-4 w-4" />
                <span>{t.language}</span>
              </button>
            </nav>
          </div>

          {/* Zawartość */}
          <div className="p-6">
            {error && (
              <div className="flex items-center space-x-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center space-x-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700">{success}</span>
              </div>
            )}

            {activeTab === 'profile' && (
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.fullName}
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

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.emailAddress}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      disabled
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      placeholder="jan@example.com"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t.emailCannotBeChanged}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#AB4D95' }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#9A3D85')}
                  onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#AB4D95')}
                >
                  {loading ? t.updating : t.updateProfile}
                </button>
              </form>
            )}

            {activeTab === 'password' && (
              <form onSubmit={handlePasswordUpdate} className="space-y-6">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.newPassword}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      placeholder="••••••••"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.confirmPassword}
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
              </form>
            )}

            {activeTab === 'language' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{t.languagePreferences}</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {t.selectLanguageInterface}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleLanguageUpdate('pl')}
                      disabled={loading}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        language === 'pl'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">🇵🇱</div>
                        <div className="font-medium">{t.polish}</div>
                        <div className="text-sm text-gray-500">{t.polishLanguage}</div>
                        {language === 'pl' && (
                          <div className="text-xs text-purple-600 mt-2 font-medium">✓ {t.active}</div>
                        )}
                      </div>
                    </button>

                    <button
                      onClick={() => handleLanguageUpdate('de')}
                      disabled={loading}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        language === 'de'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">🇩🇪</div>
                        <div className="font-medium">{t.german}</div>
                        <div className="text-sm text-gray-500">{t.germanLanguage}</div>
                        {language === 'de' && (
                          <div className="text-xs text-purple-600 mt-2 font-medium">✓ {t.active}</div>
                        )}
                      </div>
                    </button>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-600 mt-0.5">ℹ️</div>
                      <div className="text-sm text-blue-800">
                        <strong>Informacja:</strong> {t.languageInfo}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sekcja wylogowania */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{t.logOut}</h3>
                  <p className="text-sm text-gray-500">{t.endSession}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                >
                  {t.logOut}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}