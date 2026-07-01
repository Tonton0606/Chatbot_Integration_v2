import { useNavigate } from "react-router-dom"
import { ShieldAlert, Home, ArrowLeft } from "lucide-react"

const Unauthorized = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />
      
      <div className="text-center relative z-10">
        {/* Icon */}
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <ShieldAlert className="w-12 h-12 text-red-400" />
        </div>
        
        {/* Error Code */}
        <h1 className="text-7xl font-bold text-red-400 mb-2 font-[family-name:var(--ep-font-display)]">
          403
        </h1>
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-4">
          Access Denied
        </h2>
        
        {/* Message */}
        <p className="text-white/60 max-w-md mx-auto mb-8">
          You don't have permission to access this page. 
          Please contact your administrator if you believe this is an error.
        </p>
        
        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-[#c9a84c] text-[#0a0e1a] rounded-lg hover:bg-[#b8953f] transition-colors font-medium"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>
        
        {/* Help Text */}
        <p className="mt-8 text-sm text-white/40">
          Need help? Contact support at{" "}
          <a href="mailto:support@enterprise.com" className="text-[#c9a84c] hover:underline">
            support@enterprise.com
          </a>
        </p>
      </div>
    </div>
  )
}

export default Unauthorized
