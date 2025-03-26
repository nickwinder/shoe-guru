import {PrismaClient} from '@prisma/client';
import Link from 'next/link';
import {notFound} from 'next/navigation';

export default async function ShoeDetailsPage({
                                                  params,
                                              }: {
    params: Promise<{ id: string }>;
}) {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
        notFound();
    }

    const prisma = new PrismaClient();

    const shoe = await prisma.shoe.findUnique({
        where: {
            id,
        },
        include: {
            ShoeGender: {
                where: {
                    gender: 'male',
                },
            },
            reviews: true,
        },
    });

    if (!shoe) {
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <Link href="/shoes"
                      className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
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
                        <span
                            className="bg-secondary-100 text-secondary-800 px-3 py-1 rounded-full text-sm font-medium">
              {shoe.intendedUse}
            </span>
                    )}
                    {shoe.trueToSize && (
                        <span
                            className="bg-secondary-100 text-secondary-800 px-3 py-1 rounded-full text-sm font-medium">
              Fit: {shoe.trueToSize}
            </span>
                    )}
                    {shoe.releaseDate && (
                        <span className="bg-neutral-100 text-neutral-800 px-3 py-1 rounded-full text-sm">
              Released: {new Date(shoe.releaseDate).toLocaleDateString()}
            </span>
                    )}
                    {shoe.previousModel && (
                        <span className="bg-neutral-100 text-neutral-800 px-3 py-1 rounded-full text-sm">
              Previous: {shoe.previousModel}
            </span>
                    )}
                    {shoe.nextModel && (
                        <span className="bg-neutral-100 text-neutral-800 px-3 py-1 rounded-full text-sm">
              Next: {shoe.nextModel}
            </span>
                    )}
                </div>

                {shoe.changes && (
                    <div className="mb-8 bg-neutral-50 border border-neutral-200 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-3">Changes from previous version</h2>
                        <p className="whitespace-pre-line text-neutral-700">{shoe.changes}</p>
                    </div>
                )}

                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Specifications</h2>
                    <div
                        className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-neutral-50 p-6 rounded-lg border border-neutral-200">
                        {shoe.ShoeGender[0]?.weightGrams !== null && (
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <span className="block text-sm text-neutral-500 mb-1">Weight</span>
                                <span className="font-semibold text-lg">{shoe.ShoeGender[0].weightGrams}g</span>
                            </div>
                        )}
                        {shoe.stackHeightMm !== null && (
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <span className="block text-sm text-neutral-500 mb-1">Stack Height</span>
                                <span className="font-semibold text-lg">{shoe.stackHeightMm}mm</span>
                            </div>
                        )}
                        {shoe.heelToToeDropMm !== null && (
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <span className="block text-sm text-neutral-500 mb-1">Drop</span>
                                <span className="font-semibold text-lg">{shoe.heelToToeDropMm}mm</span>
                            </div>
                        )}
                        {shoe.width && (
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <span className="block text-sm text-neutral-500 mb-1">Width</span>
                                <span className="font-semibold text-lg">{shoe.width}</span>
                            </div>
                        )}
                        {shoe.depth && (
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                <span className="block text-sm text-neutral-500 mb-1">Depth</span>
                                <span className="font-semibold text-lg">{shoe.depth}</span>
                            </div>
                        )}
                    </div>
                </div>

                {shoe.ShoeGender.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Available for</h2>
                        <div className="flex gap-2">
                            {shoe.ShoeGender.map((gender) => (
                                <span
                                    key={gender.id}
                                    className="bg-primary-100 text-primary-800 px-4 py-2 rounded-full text-sm font-medium"
                                >
                  {gender.gender} {gender.price && `- $${gender.price.toString()}`}
                </span>
                            ))}
                        </div>
                    </div>
                )}

                {shoe.reviews.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Reviews</h2>
                        <div className="space-y-6">
                            {shoe.reviews.map((review) => (
                                <div key={review.id}
                                     className="bg-white border border-neutral-200 rounded-lg p-5 shadow-sm">
                                    {review.fit && (
                                        <p className="mb-2"><span
                                            className="font-medium text-neutral-600">Fit:</span> {review.fit}</p>
                                    )}
                                    {review.feel && (
                                        <p className="mb-2"><span
                                            className="font-medium text-neutral-600">Feel:</span> {review.feel}</p>
                                    )}
                                    {review.durability && (
                                        <p className="mb-2"><span
                                            className="font-medium text-neutral-600">Durability:</span> {review.durability}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
