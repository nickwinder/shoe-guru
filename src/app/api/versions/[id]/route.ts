import { NextRequest, NextResponse } from 'next/server';
import {PrismaClient} from "@prisma/client";

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

    const prisma = new PrismaClient();

    const version = await prisma.shoeVersion.findUnique({
      where: { id },
      include: {
        shoe: {
          include: {
            specs: true,
          },
        },
        ShoeGender: true,
        reviews: true,
      },
    });

    if (!version) {
      return NextResponse.json(
        { error: 'Shoe version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(version);
  } catch (error) {
    console.error('Error fetching shoe version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shoe version' },
      { status: 500 }
    );
  }
}
