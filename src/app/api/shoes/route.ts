import { NextResponse } from 'next/server';
import {PrismaClient} from "@prisma/client";
import { prisma } from 'src/lib/prisma'

export async function GET(request: Request) {
  try {
    // Get the search query from the URL
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';

    // Fetch shoes with their gender information
    const shoes = await prisma.shoe.findMany({
      where: query
        ? {
            OR: [
              { model: { contains: query, mode: 'insensitive' } },
              { brand: { contains: query, mode: 'insensitive' } },
              { intendedUse: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        ShoeGender: {
          where: {
            gender: 'male',
          },
          include: {
            images: true,
          }
        },
        reviews: true,
      },
      orderBy: {
        model: 'asc',
      },
    });

    return NextResponse.json(shoes);
  } catch (error) {
    console.error('Error fetching shoes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shoes' },
      { status: 500 }
    );
  }
}
