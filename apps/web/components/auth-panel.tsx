'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Camera,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import type { UserRole } from '@/lib/types';

const loginSchema = z.object({
  email: z.string().email('Introduce un email válido.'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Escribe tu nombre.'),
    email: z.string().email('Introduce un email válido.'),
    district: z.string().min(2, 'Selecciona tu distrito.'),
    password: z
      .string()
      .min(10, 'Usa al menos 10 caracteres.')
      .regex(/[A-Z]/, 'Añade una mayúscula.')
      .regex(/[0-9]/, 'Añade un número.'),
    confirmPassword: z.string(),
    terms: z.literal(true, {
      message: 'Debes aceptar las normas de préstamo.',
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function AuthPanel() {
  const params = useSearchParams();
  const router = useRouter();
  const { login, loginAsDemo, register: registerUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(
    params.get('modo') === 'registro' ? 'register' : 'login',
  );
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      district: '',
      password: '',
      confirmPassword: '',
      terms: true,
    },
  });

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview],
  );

  async function submitLogin(values: LoginValues) {
    try {
      await login(values.email, values.password);
      toast.success('Sesión iniciada.');
      router.push('/cuenta');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo iniciar sesión.',
      );
    }
  }

  async function submitRegister(values: RegisterValues) {
    const formData = new FormData();
    formData.set('name', values.name);
    formData.set('email', values.email);
    formData.set('district', values.district);
    formData.set('password', values.password);
    if (avatar) formData.set('image', avatar);
    try {
      await registerUser(formData);
      toast.success('Cuenta creada con rol de miembro.');
      router.push('/cuenta');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo crear la cuenta.',
      );
    }
  }

  function enterDemo(role: UserRole) {
    loginAsDemo(role);
    toast.success(
      `Modo demostración: ${role === 'member' ? 'miembro' : role === 'manager' ? 'responsable' : 'administración'}.`,
    );
    router.push(role === 'member' ? '/cuenta' : '/gestion');
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-tabs" role="tablist" aria-label="Acceso a ReNodo">
        <button
          className={mode === 'login' ? 'is-active' : undefined}
          role="tab"
          aria-selected={mode === 'login'}
          type="button"
          onClick={() => setMode('login')}
        >
          Entrar
        </button>
        <button
          className={mode === 'register' ? 'is-active' : undefined}
          role="tab"
          aria-selected={mode === 'register'}
          type="button"
          onClick={() => setMode('register')}
        >
          Crear cuenta
        </button>
      </div>

      {mode === 'login' ? (
        <div role="tabpanel">
          <div className="auth-heading">
            <span>
              <KeyRound aria-hidden="true" />
            </span>
            <h1 id="auth-title">Qué alegría verte.</h1>
            <p>Entra para reservar y seguir tus préstamos.</p>
          </div>
          <form
            className="form-stack"
            onSubmit={loginForm.handleSubmit(submitLogin)}
            noValidate
          >
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                {...loginForm.register('email')}
              />
              {loginForm.formState.errors.email && (
                <small>{loginForm.formState.errors.email.message}</small>
              )}
            </label>
            <label>
              Contraseña
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...loginForm.register('password')}
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <small>{loginForm.formState.errors.password.message}</small>
              )}
            </label>
            <Button
              type="submit"
              size="lg"
              disabled={loginForm.formState.isSubmitting}
            >
              {loginForm.formState.isSubmitting
                ? 'Entrando…'
                : 'Entrar en ReNodo'}
            </Button>
          </form>
          <div className="demo-access">
            <div>
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>Prueba la aplicación</strong>
                <small>Accesos locales, sin contraseña ni datos reales.</small>
              </span>
            </div>
            <div className="demo-buttons">
              <button type="button" onClick={() => enterDemo('member')}>
                Miembro
              </button>
              <button type="button" onClick={() => enterDemo('manager')}>
                Responsable
              </button>
              <button type="button" onClick={() => enterDemo('admin')}>
                Admin
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div role="tabpanel">
          <div className="auth-heading">
            <span>
              <UserRound aria-hidden="true" />
            </span>
            <h1 id="auth-title">Tu barrio ya comparte.</h1>
            <p>
              Todos los registros nuevos se crean de forma segura como miembros.
            </p>
          </div>
          <form
            className="form-stack register-form"
            onSubmit={registerForm.handleSubmit(submitRegister)}
            noValidate
          >
            <label className="avatar-upload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setAvatar(file);
                  if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                  setAvatarPreview(file ? URL.createObjectURL(file) : null);
                }}
              />
              <span
                className="avatar-preview"
                style={
                  avatarPreview
                    ? { backgroundImage: `url(${avatarPreview})` }
                    : undefined
                }
              >
                <Camera aria-hidden="true" />
              </span>
              <span>
                <strong>Foto de perfil</strong>
                <small>JPG, PNG o WebP · máximo 4 MB</small>
              </span>
            </label>
            <div className="form-grid">
              <label>
                Nombre completo
                <input autoComplete="name" {...registerForm.register('name')} />
                {registerForm.formState.errors.name && (
                  <small>{registerForm.formState.errors.name.message}</small>
                )}
              </label>
              <label>
                Distrito
                <select {...registerForm.register('district')}>
                  <option value="">Selecciona…</option>
                  <option>Centro</option>
                  <option>Arganzuela</option>
                  <option>Chamberí</option>
                  <option>Tetuán</option>
                  <option>Retiro</option>
                  <option>Carabanchel</option>
                </select>
                {registerForm.formState.errors.district && (
                  <small>
                    {registerForm.formState.errors.district.message}
                  </small>
                )}
              </label>
            </div>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                {...registerForm.register('email')}
              />
              {registerForm.formState.errors.email && (
                <small>{registerForm.formState.errors.email.message}</small>
              )}
            </label>
            <div className="form-grid">
              <label>
                Contraseña
                <input
                  type="password"
                  autoComplete="new-password"
                  {...registerForm.register('password')}
                />
                {registerForm.formState.errors.password && (
                  <small>
                    {registerForm.formState.errors.password.message}
                  </small>
                )}
              </label>
              <label>
                Repite la contraseña
                <input
                  type="password"
                  autoComplete="new-password"
                  {...registerForm.register('confirmPassword')}
                />
                {registerForm.formState.errors.confirmPassword && (
                  <small>
                    {registerForm.formState.errors.confirmPassword.message}
                  </small>
                )}
              </label>
            </div>
            <label className="terms-check">
              <input type="checkbox" {...registerForm.register('terms')} />
              <span>
                <Check aria-hidden="true" />
              </span>
              Acepto cuidar los objetos y respetar las fechas de devolución.
            </label>
            {registerForm.formState.errors.terms && (
              <small className="form-error">
                {registerForm.formState.errors.terms.message}
              </small>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={registerForm.formState.isSubmitting}
            >
              {registerForm.formState.isSubmitting
                ? 'Creando cuenta…'
                : 'Crear mi cuenta'}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
