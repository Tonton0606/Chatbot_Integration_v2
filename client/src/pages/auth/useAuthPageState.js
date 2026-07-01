import { useState } from "react";
import { shouldStartInLoginMode } from "../../services/auth/authRouting";

export default function useAuthPageState({ location, isInviteSignup }) {
  const [isChangePasswordMode, setIsChangePasswordMode] = useState(
    () => new URLSearchParams(window.location.search).get("type") === "change-password"
  );

  const [isLogin, setIsLogin] = useState(
    shouldStartInLoginMode({
      pathname: location.pathname,
      search: location.search,
      hasInvite: isInviteSignup,
    })
  );

  const [loading, setLoading] = useState(false);
  const [invitePreview, setInvitePreview] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(Boolean(isInviteSignup));

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    companyName: "",
    website: "",
    phone_confirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "",
    valid: false,
  });

  const [formStartTime, setFormStartTime] = useState(Date.now());
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [progressiveDelay, setProgressiveDelay] = useState(0);
  const [securityWarnings, setSecurityWarnings] = useState([]);

  const [authStep, setAuthStep] = useState("form");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [tempUserId, setTempUserId] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  const [loginOtpChallengeId, setLoginOtpChallengeId] = useState("");
  const [loginOtpEmail, setLoginOtpEmail] = useState("");

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirm, setRecoveryConfirm] = useState("");
  const [recoveryStrength, setRecoveryStrength] = useState({
    score: 0,
    label: "",
    valid: false,
  });
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [showRecoveryConfirm, setShowRecoveryConfirm] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const [isCustomResetMode, setIsCustomResetMode] = useState(false);
  const [customResetToken, setCustomResetToken] = useState("");
  const [customResetPassword, setCustomResetPassword] = useState("");
  const [customResetConfirm, setCustomResetConfirm] = useState("");
  const [customResetStrength, setCustomResetStrength] = useState({
    score: 0,
    label: "",
    valid: false,
  });
  const [showCustomResetPassword, setShowCustomResetPassword] = useState(false);
  const [showCustomResetConfirm, setShowCustomResetConfirm] = useState(false);
  const [customResetLoading, setCustomResetLoading] = useState(false);
  const [customResetSuccess, setCustomResetSuccess] = useState(false);

  return {
    isChangePasswordMode,
    setIsChangePasswordMode,
    isLogin,
    setIsLogin,
    loading,
    setLoading,
    invitePreview,
    setInvitePreview,
    inviteLoading,
    setInviteLoading,
    formData,
    setFormData,
    showPassword,
    setShowPassword,
    error,
    setError,
    success,
    setSuccess,
    passwordStrength,
    setPasswordStrength,
    formStartTime,
    setFormStartTime,
    failedAttempts,
    setFailedAttempts,
    requiresCaptcha,
    setRequiresCaptcha,
    captchaVerified,
    setCaptchaVerified,
    progressiveDelay,
    setProgressiveDelay,
    securityWarnings,
    setSecurityWarnings,
    authStep,
    setAuthStep,
    verificationEmail,
    setVerificationEmail,
    otpCode,
    setOtpCode,
    tempUserId,
    setTempUserId,
    resendTimer,
    setResendTimer,
    loginOtpChallengeId,
    setLoginOtpChallengeId,
    loginOtpEmail,
    setLoginOtpEmail,
    isForgotPassword,
    setIsForgotPassword,
    forgotEmail,
    setForgotEmail,
    forgotSent,
    setForgotSent,
    forgotLoading,
    setForgotLoading,
    isRecoveryMode,
    setIsRecoveryMode,
    recoveryPassword,
    setRecoveryPassword,
    recoveryConfirm,
    setRecoveryConfirm,
    recoveryStrength,
    setRecoveryStrength,
    showRecoveryPassword,
    setShowRecoveryPassword,
    showRecoveryConfirm,
    setShowRecoveryConfirm,
    recoveryLoading,
    setRecoveryLoading,
    recoverySuccess,
    setRecoverySuccess,
    isCustomResetMode,
    setIsCustomResetMode,
    customResetToken,
    setCustomResetToken,
    customResetPassword,
    setCustomResetPassword,
    customResetConfirm,
    setCustomResetConfirm,
    customResetStrength,
    setCustomResetStrength,
    showCustomResetPassword,
    setShowCustomResetPassword,
    showCustomResetConfirm,
    setShowCustomResetConfirm,
    customResetLoading,
    setCustomResetLoading,
    customResetSuccess,
    setCustomResetSuccess,
  };
}
