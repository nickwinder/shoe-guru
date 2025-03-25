import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the shoes list page
  redirect('/shoes');
}
