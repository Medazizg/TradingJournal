// src/App.tsx
import { useState, useEffect } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import type { User } from "firebase/auth";
import TradingJournal from "./components/TradingJournal";
import { LogOutIcon, MenuIcon, XIcon, MoonIcon, SunIcon } from "lucide-react";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import catLogo from "./assets/catpdp.jpg";
import "./index.css";

function AppContent() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  
  // Password validation states
  const [passwordError, setPasswordError] = useState<string>("");
  const [passwordSuccess, setPasswordSuccess] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [emailSuccess, setEmailSuccess] = useState<string>("");
  const [showPasswordValidation, setShowPasswordValidation] = useState<boolean>(false);

  // Listen to authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Password validation function
  const validatePassword = (password: string) => {
    const minLength = password.length >= 6;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const requirements = [
      { test: minLength, text: "At least 6 characters" },
      { test: hasUppercase, text: "One uppercase letter" },
      { test: hasLowercase, text: "One lowercase letter" },
      { test: hasNumber, text: "One number" },
      { test: hasSpecial, text: "One special character" }
    ];
    
    const passedRequirements = requirements.filter(req => req.test).length;
    const isStrong = passedRequirements >= 4;
    
    return { requirements, passedRequirements, isStrong, minLength };
  };
  
  // Email validation function
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  // Handle password change with validation
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setShowPasswordValidation(true);
    
    if (value.length === 0) {
      setPasswordError("");
      setPasswordSuccess("");
      setShowPasswordValidation(false);
      return;
    }
    
    const validation = validatePassword(value);
    
    if (!validation.minLength) {
      setPasswordError("❌ Password is too short (minimum 6 characters)");
      setPasswordSuccess("");
    } else if (validation.isStrong) {
      setPasswordError("");
      setPasswordSuccess("✅ Password is strong and correct!");
    } else if (validation.passedRequirements >= 2) {
      setPasswordError("");
      setPasswordSuccess("⚠️ Password is acceptable but could be stronger");
    } else {
      setPasswordError("❌ Password is not strong enough");
      setPasswordSuccess("");
    }
  };
  
  // Handle email change with validation
  const handleEmailChange = (value: string) => {
    setEmail(value);
    
    if (value.length === 0) {
      setEmailError("");
      setEmailSuccess("");
      return;
    }
    
    if (validateEmail(value)) {
      setEmailError("");
      setEmailSuccess("✅ Email format is correct");
    } else {
      setEmailSuccess("");
      setEmailError("❌ Email format is not correct");
    }
  };
  
  // ---------- Register ----------
  const handleRegister = async () => {
    // Validate before submitting
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.minLength) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      setUser(res.user);
      setEmail("");
      setPassword("");
      setError("");
      setPasswordError("");
      setPasswordSuccess("");
      setEmailError("");
      setEmailSuccess("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Customize Firebase error messages
        if (err.message.includes('email-already-in-use')) {
          setError("❌ This email is already registered. Please use a different email or sign in instead.");
        } else if (err.message.includes('weak-password')) {
          setError("❌ Password is too weak. Please choose a stronger password.");
        } else if (err.message.includes('invalid-email')) {
          setError("❌ Email format is not correct. Please enter a valid email.");
        } else {
          setError(`❌ ${err.message}`);
        }
      } else {
        setError("❌ Something went wrong. Please try again.");
      }
    }
  };

  // ---------- Login ----------
  const handleLogin = async () => {
    // Basic validation for login
    if (!email || !password) {
      setError("❌ Please enter both email and password");
      return;
    }
    
    if (!validateEmail(email)) {
      setError("❌ Please enter a valid email address");
      return;
    }
    
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      setUser(res.user);
      setEmail("");
      setPassword("");
      setError("");
      setPasswordError("");
      setPasswordSuccess("");
      setEmailError("");
      setEmailSuccess("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Customize Firebase error messages
        if (err.message.includes('user-not-found')) {
          setError("❌ No account found with this email. Please check your email or sign up.");
        } else if (err.message.includes('wrong-password')) {
          setError("❌ Password is not correct. Please try again.");
        } else if (err.message.includes('invalid-email')) {
          setError("❌ Email format is not correct. Please enter a valid email.");
        } else if (err.message.includes('too-many-requests')) {
          setError("❌ Too many failed attempts. Please try again later.");
        } else {
          setError(`❌ ${err.message}`);
        }
      } else {
        setError("❌ Something went wrong. Please try again.");
      }
    }
  };

  // ---------- Logout ----------
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // ---------- Dashboard ----------
  if (user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F3F4F6] dark:bg-gray-900">
        {/* Left Sidebar with Logout */}
        <div className="fixed left-0 top-0 h-full w-16 bg-white dark:bg-gray-800 shadow-lg border-r border-[#F3F4F6] dark:border-gray-700 z-50 flex flex-col justify-between py-4">
          {/* Logo at top */}
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-lg overflow-hidden ring-2 ring-[#2563EB]/20">
              <img 
                src={catLogo} 
                alt="Logo" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Logout Button at bottom */}
          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="bg-[#F59E0B] hover:bg-[#D97706] dark:bg-[#F59E0B] dark:hover:bg-[#D97706] text-white p-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
              title="Logout"
            >
              <LogOutIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {/* Main Content with left margin */}
        <div className="ml-16 flex-1 relative">
          <TradingJournal />
          
          {/* Smart Floating Add Trade Button */}
          <div className="fixed bottom-6 right-6 z-50" id="smart-add-button">
            {/* Button will be controlled by TradingJournal component */}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Login/Register Form ----------
  const loginForm = (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F3F4F6] via-white to-[#F3F4F6] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 transition-all duration-300">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 shadow-lg">
            <img 
              src={catLogo} 
              alt="Trading Journal Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Trading Journal
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Professional Trading Platform
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-[#F3F4F6]/50 dark:border-gray-700/50 p-8">
          <h2 className="text-center text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                📧 Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleEmailChange(e.target.value)
                }
                placeholder="trader@example.com"
                className={`w-full border p-3 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all duration-200 ${
                  emailError 
                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500' 
                    : emailSuccess 
                    ? 'border-green-300 dark:border-green-600 focus:ring-green-500'
                    : 'border-[#F3F4F6] dark:border-gray-600 focus:ring-[#2563EB]'
                }`}
              />
              {/* Email validation messages */}
              {emailError && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {emailError}
                  </p>
                </div>
              )}
              {emailSuccess && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {emailSuccess}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                🔐 Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handlePasswordChange(e.target.value)
                }
                placeholder={isLogin ? "Enter your password" : "Create a strong password"}
                className={`w-full border p-3 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all duration-200 ${
                  passwordError 
                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500' 
                    : passwordSuccess 
                    ? 'border-green-300 dark:border-green-600 focus:ring-green-500'
                    : 'border-[#F3F4F6] dark:border-gray-600 focus:ring-[#2563EB]'
                }`}
              />
              
              {/* Password validation messages */}
              {passwordError && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">
                    {passwordError}
                  </p>
                </div>
              )}
              
              {passwordSuccess && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {passwordSuccess}
                  </p>
                </div>
              )}
              
              {/* Password requirements (only for registration) */}
              {!isLogin && showPasswordValidation && password.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">
                    Password Requirements:
                  </p>
                  {validatePassword(password).requirements.map((req, index) => (
                    <div key={index} className={`flex items-center space-x-2 text-xs ${
                      req.test 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      <span>{req.test ? '✅' : '⭕'}</span>
                      <span>{req.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={isLogin ? handleLogin : handleRegister}
              className="w-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLogin ? "Sign In" : "Create Account"}
            </button>

            <div className="text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#2563EB] dark:text-[#3B82F6] text-sm hover:text-[#1D4ED8] dark:hover:text-[#2563EB] transition-colors duration-200"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>Secure • Professional • Reliable</p>
        </div>
      </div>
    </div>
  );

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB] mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-900 transition-colors duration-300">
      {user ? (
        <div className="flex flex-col min-h-screen">
          {/* Top Navigation Bar */}
          <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-[#F3F4F6] dark:border-gray-700 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Logo and Title */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shadow-md">
                    <img 
                      src={catLogo} 
                      alt="Trading Journal Logo" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                      Trading Journal
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Professional Trading Platform
                    </p>
                  </div>
                </div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center space-x-4">
                  {/* Dark Mode Toggle */}
                  <button
                    onClick={toggleDarkMode}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                  >
                    {isDarkMode ? (
                      <SunIcon className="h-5 w-5" />
                    ) : (
                      <MoonIcon className="h-5 w-5" />
                    )}
                  </button>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {(user as any)?.email || 'Trader'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Active Trader
                    </p>
                  </div>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden flex items-center">
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {isMobileMenuOpen ? (
                      <XIcon className="h-6 w-6" />
                    ) : (
                      <MenuIcon className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile Menu */}
              {isMobileMenuOpen && (
                <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
                  <div className="py-4 space-y-1">
                    {/* User Info */}
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {(user as any)?.email || 'Trader'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Active Trader
                      </p>
                    </div>
                    
                    {/* Dark Mode Toggle */}
                    <button
                      onClick={() => {
                        toggleDarkMode();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {isDarkMode ? (
                        <SunIcon className="h-5 w-5" />
                      ) : (
                        <MoonIcon className="h-5 w-5" />
                      )}
                      <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                  </div>
                  
                  {/* Logout Button - At Bottom */}
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors font-medium"
                    >
                      <LogOutIcon className="h-5 w-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </nav>
            
            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              <TradingJournal />
            </main>

            {/* Footer with Logout Button */}
            <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                  {/* Footer Info */}
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-lg overflow-hidden">
                      <img 
                        src={catLogo} 
                        alt="Trading Journal Logo" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Trading Journal
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        © 2024 Professional Trading Platform
                      </p>
                    </div>
                  </div>

                  {/* Logout Section */}
                  <div className="flex items-center space-x-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Logged in as
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {(user as any)?.email || 'Trader'}
                      </p>
                    </div>
                    
                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 dark:from-red-600 dark:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <LogOutIcon className="h-5 w-5" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        ) : (
          loginForm
        )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
