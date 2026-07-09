import { redirect } from 'next/navigation';

// Student login lives at /login/student.
export default function StudentLoginRedirect() {
  redirect('/login/student');
}
