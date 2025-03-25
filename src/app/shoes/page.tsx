import {PrismaClient} from '@prisma/client';
import Link from 'next/link';
import SearchForm from './search-form';
import ViewAllButton from './view-all-button';

export default async function ShoesPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
    const resolvedParams = await searchParams;
    const query = resolvedParams?.query || '';

  const prisma = new PrismaClient();

  // Fetch shoes with their specs and versions
  const shoes = await prisma.shoe.findMany({
    where: query
      ? {
          OR: [
            { model: { contains: query, mode: 'insensitive' } },
            { brand: { contains: query, mode: 'insensitive' } },
            { versions: { some: { intendedUse: { contains: query, mode: 'insensitive' } } } },
          ],
        }
      : undefined,
    include: {
      specs: true,
      versions: {
        include: {
          ShoeGender: true,
        }
      },
    },
    orderBy: {
      model: 'asc',
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Running Shoes</h1>
        <p className="text-neutral-600">Find your perfect running companion</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <SearchForm initialQuery={query} />
      </div>

      {shoes.length === 0 ? (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-primary-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">No shoes found</h3>
          <p className="text-neutral-600">Try a different search term or browse all shoes.</p>
          <ViewAllButton />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-neutral-600">{shoes.length} shoes found</p>
            <div className="flex gap-2">
              <span className="text-sm text-neutral-500">Sort by:</span>
              <select className="text-sm border-none bg-transparent text-neutral-700 font-medium focus:ring-0">
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
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-2xl font-semibold">{shoe.brand} {shoe.model}</h2>
                    {shoe.versions[0]?.ShoeGender[0]?.price && (
                      <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                        ${shoe.versions[0].ShoeGender[0].price.toString()}
                      </span>
                    )}
                  </div>

                  <p className="text-neutral-600 mb-4">{shoe.versions[0]?.intendedUse || 'General Running'}</p>

                  {shoe.specs && (
                    <div className="grid grid-cols-3 gap-2 mb-4 bg-neutral-50 p-3 rounded-lg">
                      {shoe.versions[0]?.ShoeGender[0]?.weightGrams !== null && (
                        <div className="text-center">
                          <span className="block text-sm text-neutral-500">Weight</span>
                          <span className="font-medium">{shoe.versions[0].ShoeGender[0].weightGrams}g</span>
                        </div>
                      )}
                      {shoe.specs.stackHeightMm !== null && (
                        <div className="text-center">
                          <span className="block text-sm text-neutral-500">Stack</span>
                          <span className="font-medium">{shoe.specs.stackHeightMm}mm</span>
                        </div>
                      )}
                      {shoe.specs.heelToToeDropMm !== null && (
                        <div className="text-center">
                          <span className="block text-sm text-neutral-500">Drop</span>
                          <span className="font-medium">{shoe.specs.heelToToeDropMm}mm</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {shoe.versions.length > 0 && (
                  <div className="border-t pt-4 mt-2">
                    <h3 className="text-lg font-normal text-neutral-600 mb-2">Versions:</h3>
                    <div className="flex flex-wrap gap-2">
                      {shoe.versions.map((version) => (
                        <Link 
                          key={version.id} 
                          href={`/shoes/versions/${version.id}`} 
                          className="bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1 rounded-full text-sm transition-colors"
                        >
                          {version.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
