import { redirect } from 'next/navigation';

// /login no longer exists — the login page is now at /
export default function LoginRedirect() {
  redirect('/');
}
