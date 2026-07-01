import { useEffect } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';



import {
  requestPasswordReset,
} from '../../services/auth/authActions';

import {
  calculatePasswordStrength,
} from '../../services/auth/authSecurity';

import {
  getInviteTokenFromSearch,
} from '../../services/auth/workspaceInviteAuth';


import ForgotPasswordPanel from './ForgotPasswordPanel.jsx';
import RecoveryPasswordPanel from './RecoveryPasswordPanel.jsx';
import CustomResetPanel from './CustomResetPanel.jsx';
import ChangePasswordPanel from './ChangePasswordPanel.jsx';
import AuthMainContent from './AuthMainContent.jsx';
import useAuthPageState from './useAuthPageState.js';
import useAuthResetFlows from './useAuthResetFlows.js';
import useWorkspaceInviteFlow from './useWorkspaceInviteFlow.js';
import useAuthFormHandlers from './useAuthFormHandlers.js';
import {
} from './authPageHelpers.js';

function Auth() {
  const location = useLocation();
  const navigate = useNavigate();

  const inviteToken = getInviteTokenFromSearch(location.search);
  const isInviteSignup = Boolean(inviteToken);

  const {
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
  } = useAuthPageState({ location, isInviteSignup });


  const {
    handleForgotPassword,
    handleRecoverySubmit,
    handleCustomResetSubmit,
  } = useAuthResetFlows({
    forgotEmail,
    setForgotLoading,
    setError,
    setForgotSent,
    recoveryStrength,
    recoveryPassword,
    recoveryConfirm,
    setRecoveryLoading,
    setRecoverySuccess,
    customResetToken,
    customResetPassword,
    customResetConfirm,
    setCustomResetLoading,
    setCustomResetSuccess,
    setIsRecoveryMode,
    setIsCustomResetMode,
    setCustomResetToken,
    setIsChangePasswordMode,
  });
  const { finishInviteOrRouteUser } = useWorkspaceInviteFlow({
    navigate,
    inviteToken,
    isInviteSignup,
    isChangePasswordMode,
    invitePreview,
    setInvitePreview,
    setInviteLoading,
    setIsLogin,
    setFormData,
    setLoading,
    setError,
    setSuccess,
  });

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const {
    handleInputChange,
    resendVerificationEmail,
    verifyEmailOTP,
    verifyLoginOTP,
    resendLoginOtp,
    sendMagicLink,
    handleSubmit,
    toggleMode,
  } = useAuthFormHandlers({
    isLogin,
    setIsLogin,
    isInviteSignup,
    invitePreview,
    inviteToken,
    inviteLoading,
    formData,
    setFormData,
    setError,
    setSuccess,
    passwordStrength,
    setPasswordStrength,
    setFormStartTime,
    failedAttempts,
    setFailedAttempts,
    progressiveDelay,
    setProgressiveDelay,
    requiresCaptcha,
    setRequiresCaptcha,
    captchaVerified,
    setCaptchaVerified,
    setSecurityWarnings,
    setLoading,
    setVerificationEmail,
    setAuthStep,
    otpCode,
    setOtpCode,
    verificationEmail,
    loginOtpChallengeId,
    setLoginOtpChallengeId,
    loginOtpEmail,
    setLoginOtpEmail,
    resendTimer,
    setResendTimer,
    setTempUserId,
    finishInviteOrRouteUser,
  });

  const submitDisabled =
    loading || inviteLoading || (isInviteSignup && !invitePreview?.email);

  // ── Recovery mode: render password-reset form ─────────────────────────────
  if (isRecoveryMode) {
    return (
      <RecoveryPasswordPanel
        error={error}
        recoveryPassword={recoveryPassword}
        setRecoveryPassword={(value) => {
          setRecoveryPassword(value);
          setError("");
        }}
        recoveryConfirm={recoveryConfirm}
        setRecoveryConfirm={setRecoveryConfirm}
        recoveryStrength={recoveryStrength}
        setRecoveryStrength={setRecoveryStrength}
        showRecoveryPassword={showRecoveryPassword}
        setShowRecoveryPassword={setShowRecoveryPassword}
        showRecoveryConfirm={showRecoveryConfirm}
        setShowRecoveryConfirm={setShowRecoveryConfirm}
        recoveryLoading={recoveryLoading}
        recoverySuccess={recoverySuccess}
        onSubmit={handleRecoverySubmit}
        onSignIn={() => navigate('/auth')}
        calculatePasswordStrength={calculatePasswordStrength}
      />
    );
  }


  // ── Custom reset token mode (server-side flow) ───────────────────────────
  if (isCustomResetMode) {
    return (
      <CustomResetPanel
        error={error}
        customResetPassword={customResetPassword}
        setCustomResetPassword={(value) => {
          setCustomResetPassword(value);
          setError("");
        }}
        customResetConfirm={customResetConfirm}
        setCustomResetConfirm={setCustomResetConfirm}
        customResetStrength={customResetStrength}
        setCustomResetStrength={setCustomResetStrength}
        showCustomResetPassword={showCustomResetPassword}
        setShowCustomResetPassword={setShowCustomResetPassword}
        showCustomResetConfirm={showCustomResetConfirm}
        setShowCustomResetConfirm={setShowCustomResetConfirm}
        customResetLoading={customResetLoading}
        customResetSuccess={customResetSuccess}
        onSubmit={handleCustomResetSubmit}
        onSignIn={() => {
          setIsCustomResetMode(false);
          setCustomResetSuccess(false);
          setCustomResetToken('');
          setCustomResetPassword('');
          setCustomResetConfirm('');
          setCustomResetStrength({ score: 0, label: '', valid: false });
          setError('');
          setIsLogin(true);
          navigate('/auth', { replace: true });
        }}
        calculatePasswordStrength={calculatePasswordStrength}
      />
    );
  }


  // ── Change password panel (requires active session) ──────────────────────
  if (isChangePasswordMode) {
    return (
      <ChangePasswordPanel
        onBack={() => {
          setIsChangePasswordMode(false);
          navigate('/auth', { replace: true });
        }}
        onSuccess={() => {
          setIsChangePasswordMode(false);
          navigate('/auth', { replace: true });
        }}
      />
    );
  }


  // ── Forgot password panel ─────────────────────────────────────────────────
  if (isForgotPassword) {
    return (
      <ForgotPasswordPanel
        error={error}
        forgotEmail={forgotEmail}
        setForgotEmail={(value) => {
          setForgotEmail(value);
          setError("");
        }}
        forgotSent={forgotSent}
        forgotLoading={forgotLoading}
        onSubmit={handleForgotPassword}
        onBack={() => {
          setIsForgotPassword(false);
          setError("");
        }}
        onDone={() => {
          setForgotSent(false);
          setIsForgotPassword(false);
          setForgotEmail("");
        }}
      />
    );
  }

  return (
    <AuthMainContent
      isLogin={isLogin}
      isInviteSignup={isInviteSignup}
      invitePreview={invitePreview}
      error={error}
      success={success}
      navigate={navigate}
      authStep={authStep}
      verificationEmail={verificationEmail}
      loginOtpEmail={loginOtpEmail}
      otpCode={otpCode}
      setOtpCode={setOtpCode}
      loading={loading}
      resendTimer={resendTimer}
      verifyEmailOTP={verifyEmailOTP}
      verifyLoginOTP={verifyLoginOTP}
      resendVerificationEmail={resendVerificationEmail}
      resendLoginOtp={resendLoginOtp}
      sendMagicLink={sendMagicLink}
      setAuthStep={setAuthStep}
      setError={setError}
      setSuccess={setSuccess}
      formData={formData}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      requiresCaptcha={requiresCaptcha}
      captchaVerified={captchaVerified}
      setCaptchaVerified={setCaptchaVerified}
      inviteLoading={inviteLoading}
      submitDisabled={submitDisabled}
      setIsChangePasswordMode={setIsChangePasswordMode}
      setIsForgotPassword={setIsForgotPassword}
      setForgotEmail={setForgotEmail}
      passwordStrength={passwordStrength}
      securityWarnings={securityWarnings}
      toggleMode={toggleMode}
    />
  );
}

export default Auth;
