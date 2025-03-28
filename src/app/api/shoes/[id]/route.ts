import { NextRequest, NextResponse } from 'next/server';
import {PrismaClient} from "@prisma/client";
import { prisma } from 'src/lib/prisma'

export async function GET(
  request: NextRequest,
  context: any
) {
  const { params } = context;
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const shoe = await prisma.shoe.findUnique({
      where: { id },
      include: {
        ShoeGender: true,
        reviews: true,
      },
    });

    if (!shoe) {
      return NextResponse.json(
        { error: 'Shoe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(shoe);
  } catch (error) {
    console.error('Error fetching shoe:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shoe' },
      { status: 500 }
    );
  }
}
