import React from 'react';
import { AlertCircle } from 'lucide-react';

export const ScannedPdfNotice: React.FC = () => {
  return (
    <div className="mx-auto my-3 max-w-lg bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-soft flex items-start gap-2.5 text-amber-900">
      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
      <div className="text-xs leading-relaxed">
        <span className="font-semibold block">Scanned Document Detected</span>
        This PDF has no selectable text layer — highlighting and quote extraction are unavailable for scanned/image-only pages.
      </div>
    </div>
  );
};
