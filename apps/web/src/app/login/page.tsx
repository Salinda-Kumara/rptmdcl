import { redirect } from 'next/navigation';

// Student login has moved to /student
export default function LoginRedirect() {
  redirect('/student');
}
