import { HttpTypes } from "@medusajs/types"
import Image from "next/image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  title: string
}

// Grid cells: the product template lays them out two across on wider screens.
const ImageGallery = ({ images, title }: ImageGalleryProps) => {
  return (
    <>
      {images.map((image, index) =>
        image.url ? (
          <div
            key={image.id}
            id={image.id}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-ui-bg-subtle"
          >
            <Image
              src={image.url}
              priority={index < 2}
              alt={`${title}, picture ${index + 1}`}
              fill
              sizes="(max-width: 640px) 100vw, 720px"
              className="object-cover"
            />
          </div>
        ) : null
      )}
    </>
  )
}

export default ImageGallery
