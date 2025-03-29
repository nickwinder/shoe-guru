"use client";

import Link from 'next/link';
import Image from 'next/image';
import AskExpertForm from './ask-an-expert';
import { useState, useEffect } from 'react';
import { Shoe, ShoeGender, Image as ImageType } from 'node_modules/@prisma/client/default';

// Function to fetch shoes data from the server
async function getShoes() {
  try {
    const response = await fetch(`/api/shoes`);
    if (!response.ok) {
      throw new Error('Failed to fetch shoes');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching shoes:', error);
    return [];
  }
}

export default function ShoesPage() {
  const [shoes, setShoes] = useState<(Shoe & { ShoeGender: (ShoeGender & { images: ImageType[] })[] })[]>([]);
  const [sortOption, setSortOption] = useState('Name (A-Z)');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadShoes() {
      try {
        const shoesData = await getShoes();
        setShoes(shoesData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading shoes:", error);
        setIsLoading(false);
      }
    }

    loadShoes();
  }, []);

  // Function to sort shoes based on selected option
  const sortShoes = (option: string) => {
    const shoesCopy = [...shoes];

    switch(option) {
      case 'Name (A-Z)':
        shoesCopy.sort((a, b) => a.model.localeCompare(b.model));
        break;
      case 'Newest':
        // Assuming newer shoes have higher IDs or there's a createdAt field
        shoesCopy.sort((a, b) => b.id - a.id);
        break;
      case 'Price: Low to High':
        shoesCopy.sort((a, b) => {
          const priceA = a.ShoeGender[0]?.price?.toNumber() || 0;
          const priceB = b.ShoeGender[0]?.price?.toNumber() || 0;
          return priceA - priceB;
        });
        break;
      case 'Price: High to Low':
        shoesCopy.sort((a, b) => {
          const priceA = a.ShoeGender[0]?.price?.toNumber() || 0;
          const priceB = b.ShoeGender[0]?.price?.toNumber() || 0;
          return priceB - priceA;
        });
        break;
      default:
        break;
    }

    setShoes(shoesCopy);
  };

  // Handle sort option change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const option = e.target.value;
    setSortOption(option);
    sortShoes(option);
  };

  if (isLoading) {
    return <div className="min-h-[80vh] flex justify-center items-center">
      <p className="text-lg">Loading shoes...</p>
    </div>;
  }

  return (
    <div>
      {/* Expert form centered in the viewport */}
      <div className="min-h-[80vh] flex flex-col justify-center items-center mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 w-full max-w-3xl">
          <AskExpertForm />
        </div>

        {/* Scroll indicator */}
        <div className="mt-8 text-center animate-bounce">
          <p className="text-neutral-600 mb-2">Scroll to see all shoes</p>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      {shoes.length === 0 ? (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-primary-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14a7 7 0 01-5.468-2.632 1 1 0 00-1.564 0A7 7 0 017 14a1 1 0 00-1 1v3a1 1 0 001 1h12a1 1 0 001-1v-3a1 1 0 00-1-1z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a3 3 0 100-6 3 3 0 000 6z" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">No shoes available</h3>
          <p className="text-neutral-600">Our shoe catalog is currently empty. Please check back later.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">All Shoes</h3>
            <div className="flex gap-2">
              <span className="text-sm text-neutral-500">Sort by:</span>
              <select 
                value={sortOption}
                onChange={handleSortChange}
                className="text-sm border-none bg-transparent text-neutral-700 font-medium focus:ring-0"
              >
                <option>Name (A-Z)</option>
                <option>Newest</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {shoes.map((shoe) => (
              <div key={shoe.id} className="card p-6 flex flex-col h-full">
                <div className="flex-1">
                  {/* Image display */}
                  <div className="mb-4 relative h-48 w-full overflow-hidden rounded-lg bg-neutral-100">
                    {shoe.ShoeGender[0]?.images && shoe.ShoeGender[0]?.images.length > 0 ? (
                      <Image
                        src={`/api/images/${shoe.ShoeGender[0].images[0].id}`}
                        alt={`${shoe.brand} ${shoe.model}`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-neutral-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-2xl font-semibold">{shoe.brand} {shoe.model}</h2>
                    {shoe.ShoeGender[0]?.price && (
                      <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                        ${shoe.ShoeGender[0]?.price.toString()}
                      </span>
                    )}
                  </div>

                  <p className="text-neutral-600 mb-4">{shoe.intendedUse?.replace(/\b\w/g, (char) => char.toUpperCase()) || 'General Running'}</p>

                  <div className="grid grid-cols-3 gap-2 mb-4 bg-neutral-50 p-3 rounded-lg">
                    {shoe.ShoeGender[0]?.weightGrams !== null && (
                      <div className="text-center">
                        <span className="block text-sm text-neutral-500">Weight</span>
                        <span className="font-medium">{shoe.ShoeGender[0]?.weightGrams}g</span>
                      </div>
                    )}
                    {shoe.forefootStackHeightMm !== null && (
                      <div className="text-center">
                        <span className="block text-sm text-neutral-500">Forefoot</span>
                        <span className="font-medium">{shoe.forefootStackHeightMm}mm</span>
                      </div>
                    )}
                    {shoe.heelStackHeightMm !== null && (
                      <div className="text-center">
                        <span className="block text-sm text-neutral-500">Heel</span>
                        <span className="font-medium">{shoe.heelStackHeightMm}mm</span>
                      </div>
                    )}
                    {shoe.forefootStackHeightMm !== null && shoe.heelStackHeightMm !== null && (
                      <div className="text-center">
                        <span className="block text-sm text-neutral-500">Drop</span>
                        <span className="font-medium">{shoe.heelStackHeightMm - shoe.forefootStackHeightMm}mm</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4 mt-2">
                  <Link 
                    href={`/shoes/${shoe.id}`} 
                    className="bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full text-sm transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
