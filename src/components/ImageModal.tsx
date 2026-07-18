import { useEffect } from 'react';
import { X } from 'lucide-react';

type Props = {
  src: string;
  alt?: string;
  onClose: () => void;
};

export default function ImageModal({ src, alt, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-white rounded-full p-2 shadow hover:bg-gray-100"
          aria-label="Close image"
        >
          <X className="w-5 h-5 text-gray-800" />
        </button>
        <img src={src} alt={alt} className="w-full h-auto rounded-md max-h-[80vh] object-contain" />
      </div>
    </div>
  );
}
