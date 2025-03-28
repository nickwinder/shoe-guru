import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from "@prisma/client";
import { prisma } from 'src/lib/prisma'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt(await context.params.then(params => params.id));
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid image ID' },
        { status: 400 }
      );
    }

    // Fetch the image from the database
    const image = await prisma.image.findUnique({
      where: {
        id: id,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Return the image data with appropriate content type
    // The content type is set to image/jpeg as a default, but could be adjusted based on image type
    return new NextResponse(image.data, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}
