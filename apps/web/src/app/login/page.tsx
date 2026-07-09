import { redirect } from 'next/navigation';

// /login is the staff entry — students sign in at the root page.
export default function LoginRedirect() {
  redirect('/login/staff');
}
