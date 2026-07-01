import AuthPageShell from "./AuthPageShell.jsx";
import LoginForm from "./LoginForm.jsx";
import SignupForm from "./SignupForm.jsx";
import VerifyEmailStep from "./VerifyEmailStep.jsx";
import LoginOtpStep from "./LoginOtpStep.jsx";

export default function AuthMainContent({
  isLogin,
  isInviteSignup,
  invitePreview,
  error,
  success,
  navigate,
  authStep,
  verificationEmail,
  loginOtpEmail,
  otpCode,
  setOtpCode,
  loading,
  resendTimer,
  verifyEmailOTP,
  verifyLoginOTP,
  resendVerificationEmail,
  resendLoginOtp,
  sendMagicLink,
  setAuthStep,
  setError,
  setSuccess,
  formData,
  handleInputChange,
  handleSubmit,
  showPassword,
  setShowPassword,
  requiresCaptcha,
  captchaVerified,
  setCaptchaVerified,
  inviteLoading,
  submitDisabled,
  setIsChangePasswordMode,
  setIsForgotPassword,
  setForgotEmail,
  passwordStrength,
  securityWarnings,
  toggleMode,
}) {
  const authFooter =
    authStep === "form" && (!isInviteSignup || invitePreview?.email) ? (
      <div className={`mt-6 text-center ${isLogin ? "" : "font-inter"}`}>
        <p className="text-[rgba(245,240,232,0.6)]">
          {isLogin
            ? isInviteSignup
              ? "Need to create a new invited account?"
              : "Don't have an account?"
            : isInviteSignup
              ? "Already have an account for this invited email?"
              : "Already have an account?"}{" "}
          <button
            onClick={toggleMode}
            className="text-[#c9a84c] hover:text-[#e2c07a] font-medium transition-colors"
          >
            {isLogin ? "Create account" : "Sign in"}
          </button>
        </p>
      </div>
    ) : null;

  return (
    <AuthPageShell
      isLogin={isLogin}
      isInviteSignup={isInviteSignup}
      invitePreview={invitePreview}
      error={error}
      success={success}
      navigate={navigate}
      footer={authFooter}
    >
      {authStep === "loginOtp" && (
        <LoginOtpStep
          loginOtpEmail={loginOtpEmail}
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          loading={loading}
          resendTimer={resendTimer}
          onSubmit={verifyLoginOTP}
          onResend={resendLoginOtp}
          onMagicLink={sendMagicLink}
          onBack={() => {
            setAuthStep("form");
            setOtpCode("");
            setError("");
            setSuccess("");
          }}
        />
      )}

      {authStep === "verifyEmail" && (
        <VerifyEmailStep
          verificationEmail={verificationEmail}
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          loading={loading}
          resendTimer={resendTimer}
          onSubmit={verifyEmailOTP}
          onResend={resendVerificationEmail}
          onBack={() => {
            setAuthStep("form");
            setOtpCode("");
            setError("");
            setSuccess("");
          }}
          isLogin={isLogin}
        />
      )}

      {authStep === "form" &&
        (isLogin ? (
          <LoginForm
            formData={formData}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            isInviteSignup={isInviteSignup}
            invitePreview={invitePreview}
            requiresCaptcha={requiresCaptcha}
            captchaVerified={captchaVerified}
            setCaptchaVerified={setCaptchaVerified}
            loading={loading}
            inviteLoading={inviteLoading}
            submitDisabled={submitDisabled}
            setIsChangePasswordMode={setIsChangePasswordMode}
            setIsForgotPassword={setIsForgotPassword}
            setError={setError}
            setForgotEmail={setForgotEmail}
          />
        ) : (
          <SignupForm
            formData={formData}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            passwordStrength={passwordStrength}
            isInviteSignup={isInviteSignup}
            invitePreview={invitePreview}
            securityWarnings={securityWarnings}
            requiresCaptcha={requiresCaptcha}
            captchaVerified={captchaVerified}
            setCaptchaVerified={setCaptchaVerified}
            loading={loading}
            inviteLoading={inviteLoading}
            submitDisabled={submitDisabled}
          />
        ))}
    </AuthPageShell>
  );
}
