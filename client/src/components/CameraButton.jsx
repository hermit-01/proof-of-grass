import { useRef } from 'react';

// Opens the camera directly (capture="environment"). The tap itself must open it, so this is a real button.
export default function CameraButton({ onPhoto, children, className = 'primary big' }) {
  const input = useRef(null);
  return (
    <>
      <button className={className} onClick={() => input.current.click()}>{children}</button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onPhoto(file);
        }}
      />
    </>
  );
}
