// src/components/WoodGallery.jsx
import Image from 'next/image';

export default function WoodGallery() {
  const images = [
    '/wood1.png', 
    '/wood2.png',
    '/wood3.png',
    '/wood4.png'
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {images.map((src, index) => (
        <div key={index} className="relative h-64 w-full overflow-hidden rounded-lg">
          <Image 
            src={src}
            alt={`Wood slab ${index + 1}`}
            fill
            style={{ objectFit: 'cover' }}
            className="hover:scale-105 transition-transform duration-300"
          />
        </div>
      ))}
    </div>
  );
}