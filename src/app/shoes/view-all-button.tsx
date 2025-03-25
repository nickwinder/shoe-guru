'use client';

import { useRouter } from 'next/navigation';

export default function ViewAllButton() {
  const router = useRouter();
  
  return (
    <button 
      onClick={() => router.push('/shoes')}
      className="mt-4 btn btn-primary"
    >
      View All Shoes
    </button>
  );
}
