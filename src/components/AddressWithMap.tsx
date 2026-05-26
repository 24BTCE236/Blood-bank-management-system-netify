import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

type AddressWithMapProps = {
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
  placeholder?: string;
};

const AddressWithMap: React.FC<AddressWithMapProps> = ({ value, onChange, ariaLabel = 'Address', placeholder = '' }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');

  const encoded = encodeURIComponent((value || '').trim());

  useEffect(() => {
    if (!encoded) return;
    const src = `https://maps.google.com/maps?q=${encoded}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    setPreviewSrc(src);
  }, [encoded]);

  const openSearch = () => {
    if (!value || !value.trim()) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.trim())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const togglePreview = () => {
    if (!value || !value.trim()) {
      setShowPreview(false);
      return;
    }
    setShowPreview((s) => !s);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          aria-label={ariaLabel}
          className="glass-input pr-32"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-2">
          <button
            type="button"
            onClick={togglePreview}
            className="soft-chip"
            aria-pressed={showPreview}
          >
            Preview Location
          </button>
          <button
            type="button"
            onClick={openSearch}
            className="premium-button-secondary flex items-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            Locate on Map
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showPreview && previewSrc ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28 }}
            className="glass-panel overflow-hidden rounded-xl border border-white/10 p-0"
          >
            <div className="h-56 w-full sm:h-72">
              <iframe
                title="Map preview"
                src={previewSrc}
                className="h-full w-full rounded-xl border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default AddressWithMap;
