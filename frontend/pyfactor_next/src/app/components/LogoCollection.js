'use client';


import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';

// Fallback image URL
const FALLBACK_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTQwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNGOEY5RkEiLz48cGF0aCBkPSJNNDUuOTkyIDE5LjEwNEg0OC42NEw1My41MDQgMjguMDMySDUwLjU2TDQ5LjU4NCAyNS44SDQ0Ljk5Mkw0NC4wNDggMjguMDMySDQxLjE2TDQ1Ljk5MiAxOS4xMDRaTTQ4Ljg5NiAyMy41MzZMNDcuMjggMjAuNDQ4TDQ1LjY5NiAyMy41MzZINDguODk2Wk01OS42MTIgMTkuMDRDNjAuODA0IDE5LjA0IDYxLjgxNSAxOS4yOTYgNjIuNjQ0IDE5LjgwOEM2My40ODggMjAuMzIgNjQuMTEyIDIxLjAyNCA2NC41MTYgMjEuOTJDNjQuOTM2IDIyLjgxNiA2NS4xNDggMjMuODMyIDY1LjE0OCAyNC45NkM2NS4xNDggMjYuMDcyIDY0LjkzNiAyNy4wOCA2NC41MTYgMjcuOTc2QzY0LjExMiAyOC44NzIgNjMuNDg4IDI5LjU3NiA2Mi42NDQgMzAuMDg4QzYxLjgxNSAzMC42IDYwLjgwNCAzMC44NTYgNTkuNjEyIDMwLjg1NkM1OC40MzYgMzAuODU2IDU3LjQxNiAzMC42IDU2LjU1MiAzMC4wODhDNTUuNzA0IDI5LjU3NiA1NS4wNzIgMjguODcyIDU0LjY1NiAyNy45NzZDNTQuMjU2IDI3LjA4IDU0LjA1NiAyNi4wNzIgNTQuMDU2IDI0Ljk2QzU0LjA1NiAyMy44MzIgNTQuMjU2IDIyLjgxNiA1NC42NTYgMjEuOTJDNTUuMDcyIDIxLjAyNCA1NS43MDQgMjAuMzIgNTYuNTUyIDE5LjgwOEM1Ny40MTYgMTkuMjk2IDU4LjQzNiAxOS4wNCA1OS42MTIgMTkuMDRaTTU5LjYxMiAyMC45OTJDNTguODYgMjAuOTkyIDU4LjI2OCAyMS4yOTYgNTcuODM2IDIxLjkwNEM1Ny40MDQgMjIuNDk2IDU3LjE4OCAyMy41NTIgNTcuMTg4IDI0Ljk3NkM1Ny4xODggMjYuMzY4IDU3LjQwNCAyNy40MDggNTcuODM2IDI4LjA5NkM1OC4yNjggMjguNzY4IDU4Ljg2IDI5LjEwNCA1OS42MTIgMjkuMTA0QzYwLjM2NCAyOS4xMDQgNjAuOTY0IDI4Ljc2OCA2MS40MTIgMjguMDk2QzYxLjg2IDI3LjQwOCA2Mi4wODQgMjYuMzY4IDYyLjA4NCAyNC45NzZDNjIuMDg0IDIzLjU1MiA2MS44NiAyMi40OTYgNjEuNDEyIDIxLjkwNEM2MC45NjQgMjEuMjk2IDYwLjM2NCAyMC45OTIgNTkuNjEyIDIwLjk5MlpNNjcuNDc1IDE5LjEwNEg3MC45MjNDNzIuMDY3IDE5LjEwNCA3My4wMTkgMTkuMzQ0IDczLjc3OSAxOS44MjRDNzQuNTM5IDIwLjI4OCA3NS4wOTkgMjAuOTQ0IDc1LjQ1OSAyMS43OTJDNzUuODM1IDIyLjY0IDc2LjAyMyAyMy42NSA3Ni4wMjMgMjQuODI0Qzc2LjAyMyAyNS45ODIgNzUuODM1IDI2Ljk5MiA3NS40NTkgMjcuODU2Qzc1LjA5OSAyOC43MDQgNzQuNTM5IDI5LjM2OCA3My43NzkgMjkuODQ4QzczLjAxOSAzMC4zMTIgNzIuMDY3IDMwLjU0NCA3MC45MjMgMzAuNTQ0SDY3LjQ3NVYxOS4xMDRaTTcwLjg0MyAyOC4wMzJDNzEuMzg3IDI4LjAzMiA3MS44NDMgMjcuOTE2IDcyLjIxMSAyNy42ODRDNzIuNTk1IDI3LjQ1MiA3Mi44OTEgMjcuMDggNzMuMDk5IDI2LjU2OEM3My4zMDcgMjYuMDU2IDczLjQxMSAyNS4zOTIgNzMuNDExIDI0LjU3NkM3My40MTEgMjMuODA4IDczLjMwNyAyMy4xODQgNzMuMDk5IDIyLjcwNEM3Mi44OTEgMjIuMjA4IDcyLjU5NSAyMS44NDggNzIuMjExIDIxLjYyNEM3MS44NDMgMjEuNCA3MS4zODcgMjEuMjg4IDcwLjg0MyAyMS4yODhINjkuOTk1VjI4LjAzMkg3MC44NDNaTTc3LjE2NCAxOS4xMDRIODIuOTRDODMuODg0IDE5LjEwNCA4NC42ODQgMTkuMzM2IDg1LjM0OCAxOS44Qzg2LjAxMiAyMC4yNjQgODYuMzQ0IDIwLjk2IDg2LjM0NCAyMS44ODhDODYuMzQ0IDIyLjQzMiA4Ni4yMzIgMjIuODk2IDg2LjAwOCAyMy4yODhDODUuNzg0IDIzLjY4IDg1LjQ4OCAyMy45ODQgODUuMTIgMjQuMkM4NC43NTIgMjQuNCAuLi4=';

// Define logos with fallback handling
const logos = [
  { id: 1, src: '/static/images/logos/logo1.png', alt: 'Company 1', fallback: FALLBACK_IMAGE },
  { id: 2, src: '/static/images/logos/logo2.png', alt: 'Company 2', fallback: FALLBACK_IMAGE },
  { id: 3, src: '/static/images/logos/logo3.png', alt: 'Company 3', fallback: FALLBACK_IMAGE },
  { id: 4, src: '/static/images/logos/logo4.png', alt: 'Company 4', fallback: FALLBACK_IMAGE },
  { id: 5, src: '/static/images/logos/logo5.png', alt: 'Company 5', fallback: FALLBACK_IMAGE },
  { id: 6, src: '/static/images/logos/logo6.png', alt: 'Company 6', fallback: FALLBACK_IMAGE },
];

export default function LogoCollection() {
  const { t } = useTranslation();

  // Track which images have errored
  const [erroredImages, setErroredImages] = useState({});
  
  // Handle image loading errors
  const handleImageError = (logoId) => {
    setErroredImages(prev => ({
      ...prev,
      [logoId]: true
    }));
  };

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-lg font-medium text-gray-600">
            {t('logoCollection.title', 'Trusted by innovative companies worldwide')}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {logos.map((logo) => (
            <div 
              key={logo.id}
              className="flex justify-center items-center col-span-1 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              <Image
                src={erroredImages[logo.id] ? logo.fallback : logo.src}
                alt={logo.alt}
                width={120}
                height={60}
                className="object-contain h-12"
                onError={() => handleImageError(logo.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
