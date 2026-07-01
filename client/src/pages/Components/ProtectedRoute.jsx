import { useState, useEffect } from "react"
import { Navigate } from "react-router-dom"
import { supabase } from "../../config/supabaseClient.js"
import { isMfaVerified } from "../../services/auth/authActions"

const ProtectedRoute = ({ children, requiredRole }) => {
    const [user, setUser] = useState(null)
    const [userRole, setUserRole] = useState(null)
    const [loading, setLoading] = useState(true)
    const [mfaOk, setMfaOk] = useState(false)

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                setLoading(false)
                return
            }
            setUser(session.user)
            setMfaOk(isMfaVerified())

            const { data: userData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
            setUserRole(userData?.role || null)
        } catch (error) {
            console.error('Auth check error:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary, #0a0e1a)', color: 'var(--text-secondary, #9ca3af)', fontFamily: 'sans-serif' }}>
          Verifying session…
        </div>
      )
    }

    if (!user) {
      return <Navigate to="/auth" replace />
    }

    // Require MFA to be completed — prevents bypassing OTP by navigating directly
    if (!mfaOk) {
      return <Navigate to="/auth" replace />
    }
    // Role hierarchy: SuperAdmin > Admin > User > Client
    const roleHierarchy = {
      SuperAdmin: 4,
      Admin: 3,
      User: 2,
      Client: 1
    }

    // Check role access
    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
      const userRoleLevel = roleHierarchy[userRole] || 0
      const minRequiredLevel = Math.min(...allowedRoles.map(r => roleHierarchy[r] || 0))
      
      const hasPermission = allowedRoles.includes(userRole) || userRoleLevel >= minRequiredLevel
      
      if (!hasPermission) {
        console.warn(`Access denied: '${userRole}' cannot access roles:`, allowedRoles)
        return <Navigate to="/unauthorized" replace />
      }
    }
    
    return children
}

export default ProtectedRoute