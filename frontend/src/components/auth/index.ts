export { RegisterForm } from './register-form';
export { LoginForm } from './login-form';
export { ForgotPasswordForm } from './forgot-password-form';
export { ResetPasswordForm } from './reset-password-form';
export * from "./auth-provider";
// Экспортируем useAuth как useUser для совместимости
export { useAuth as useUser } from "./auth-provider"; 