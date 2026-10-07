import { useEffect, useRef, useState } from 'react';

interface Props {
  images: File[];
  onChange: (images: File[]) => void;
  max?: number;
  label?: string;
  existingUrls?: string[];
  onRemoveExisting?: (url: string) => void;
}

export default function ImageUploader({
  images,
  onChange,
  max = 5,
  existingUrls = [],
  onRemoveExisting,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const totalCount = images.length + existingUrls.length;
  const canAddMore = totalCount < max;

  function addFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    const available = max - totalCount;
    onChange([...images, ...imageFiles.slice(0, available)]);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div>
      {/* Drop zone */}
      {canAddMore && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragging
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
          }`}
        >
          <div className="text-3xl mb-2">📷</div>
          <p className="text-sm font-medium text-gray-700">
            Drag & drop photos, or <span className="text-teal-600">browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {max > 1 ? `Up to ${max} images` : 'Single image'} · {totalCount}/
            {max} added
          </p>
        </div>
      )}

      {/* Previews */}
      {(images.length > 0 || existingUrls.length > 0) && (
        <div className="flex flex-wrap gap-3 mt-3">
          {existingUrls.map((url) => (
            <div
              key={url}
              className="relative w-24 h-24 rounded-lg overflow-hidden border group"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(url)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {images.map((file, i) => (
            <div
              key={i}
              className="relative w-24 h-24 rounded-lg overflow-hidden border group"
            >
              <ImagePreview file={file} position={i + 1} />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
              >
                ✕
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        onChange={handleSelect}
        className="hidden"
      />
    </div>
  );
}

function ImagePreview({ file, position }: { file: File; position: number }) {
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const preview = URL.createObjectURL(file);
    const image = imageRef.current;
    if (image) image.src = preview;
    return () => {
      image?.removeAttribute('src');
      URL.revokeObjectURL(preview);
    };
  }, [file]);
  return <img ref={imageRef} alt={`preview ${position}`} className="w-full h-full object-cover" />;
}
