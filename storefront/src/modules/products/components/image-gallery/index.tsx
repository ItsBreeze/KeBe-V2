import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { productImageAlt } from "@lib/util/image-alt"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  title: string
  // How many pictures load first (next/image's priority, which preloads them
  // in the <head>). The template passes 0 when the model leads, since then
  // every picture is below the fold (6 Oct 2026).
  priorityCount?: number
}

// Grid cells: the product template lays them out two across on wider screens.
const ImageGallery = ({
  images,
  title,
  priorityCount = 2,
}: ImageGalleryProps) => {
  return (
    <>
      {images.map((image, index) =>
        image.url ? (
          <div
            key={image.id}
            id={image.id}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-kebe-line bg-kebe-raised"
          >
            <Image
              src={image.url}
              priority={index < priorityCount}
              alt={productImageAlt(image, title, index)}
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
