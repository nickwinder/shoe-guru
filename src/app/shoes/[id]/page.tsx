import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Image as ImageType, Shoe, ShoeGender } from '@prisma/client'

export default async function ShoeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const id = parseInt(resolvedParams.id)

  if (isNaN(id)) {
    notFound()
  }

  const response = await fetch(`/api/shoes/?id=${id}`)

  if (!response.ok) {
    if (response.status === 404) {
      notFound()
    }
    throw new Error(`Failed to fetch shoe data: ${response.statusText}`)
  }

  const shoes = await response.json() as (Shoe & { ShoeGender: (ShoeGender & { images: ImageType[] })[] })[]
  if (!shoes || shoes.length === 0) {
    notFound()
  }
  const shoe = shoes[0]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/shoes"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to all shoes
        </Link>
      </div>

      <div className="card p-8">
        <h1 className="text-3xl font-bold mb-4">
          {shoe.brand} {shoe.model}
        </h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {shoe.intendedUse && (
            <span className="bg-secondary-100 text-secondary-800 px-3 py-1 rounded-full text-sm font-medium">
              {shoe.intendedUse.charAt(0).toUpperCase() + shoe.intendedUse.slice(1)}
            </span>
          )}
        </div>

        {/* Image display */}
        {shoe.ShoeGender.some((gender) => gender.images && gender.images.length > 0) && (
          <div className="mb-8">
            <div className="relative h-64 md:h-80 w-full overflow-hidden rounded-lg bg-neutral-100">
              {/* Find the first gender that has images */}
              {shoe.ShoeGender.find((gender) => gender.images && gender.images.length > 0)?.images && (
                <Image
                  src={`/api/images/${shoe.ShoeGender.find((gender) => gender.images && gender.images.length > 0)?.images[0].id}`}
                  alt={`${shoe.brand} ${shoe.model}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-contain"
                />
              )}
            </div>
          </div>
        )}

        {shoe.description && (
          <div className="mb-8 bg-neutral-50 border border-neutral-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3">Description</h2>
            <p className="whitespace-pre-line text-neutral-700">{shoe.description}</p>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Specifications</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-neutral-50 p-6 rounded-lg border border-neutral-200">
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <span className="block text-sm text-neutral-500 mb-1">Forefoot Stack</span>
              <span className="font-semibold text-lg">{shoe.forefootStackHeightMm}mm</span>
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <span className="block text-sm text-neutral-500 mb-1">Heel Stack</span>
              <span className="font-semibold text-lg">{shoe.heelStackHeightMm}mm</span>
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <span className="block text-sm text-neutral-500 mb-1">Drop</span>
              <span className="font-semibold text-lg">{shoe.dropMm}mm</span>
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <span className="block text-sm text-neutral-500 mb-1">Fit</span>
              <span className="font-semibold text-lg">{shoe.fit}</span>
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <span className="block text-sm text-neutral-500 mb-1">Wide Option</span>
              <span className="font-semibold text-lg">{shoe.wideOption ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {shoe.ShoeGender.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Available for</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shoe.ShoeGender.some((g) => g.gender === 'male') && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-3 text-primary-800">Mens</h3>
                  <div className="space-y-3">
                    {shoe.ShoeGender.filter((g) => g.gender === 'male').map((gender) => (
                      <div key={gender.id} className="space-y-2">
                        {gender.priceRRP && (
                          <div className="flex items-center">
                            <span className="font-medium text-neutral-600 w-24">RRP:</span>
                            <span className="text-neutral-800">${gender.priceRRP.toString()}</span>
                          </div>
                        )}
                        {gender.price && (
                          <div className="flex items-center">
                            <span className="font-medium text-neutral-600 w-24">Current Price:</span>
                            <span className="text-neutral-800">${gender.price.toString()}</span>
                          </div>
                        )}
                        {gender.weightGrams && (
                          <div className="flex items-center">
                            <span className="font-medium text-neutral-600 w-24">Weight:</span>
                            <span className="text-neutral-800">{gender.weightGrams}g</span>
                          </div>
                        )}
                        {gender.url && (
                          <div className="mt-3">
                            <a
                              href={gender.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors"
                            >
                              <span>View Details</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 ml-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {shoe.ShoeGender.some((g) => g.gender === 'female') && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-3 text-primary-800">Womens</h3>
                  <div className="space-y-3">
                    {shoe.ShoeGender.filter((g) => g.gender === 'female').map((gender) => (
                      <div key={gender.id} className="space-y-2">
                        {gender.priceRRP && (
                          <div className="flex items-center">
                            <span className="font-medium text-neutral-600 w-24">RRP:</span>
                            <span className="text-neutral-800">${gender.priceRRP.toString()}</span>
                          </div>
                        )}
                        {gender.price && (
                          <div className="flex items-center">
                            <span className="font-medium text-neutral-600 w-24">Price:</span>
                            <span className="text-neutral-800">${gender.price.toString()}</span>
                          </div>
                        )}
                        {gender.weightGrams && (
                          <div className="flex items-center">
                            <span className="font-medium text-neutral-600 w-24">Weight:</span>
                            <span className="text-neutral-800">{gender.weightGrams}g</span>
                          </div>
                        )}
                        {gender.url && (
                          <div className="mt-3">
                            <a
                              href="https://fave.co/4kxcPiO"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors"
                            >
                              <span>View Prices and Colors</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 ml-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
