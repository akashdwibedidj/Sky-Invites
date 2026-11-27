import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center px-6">
      <FileQuestion className="w-12 h-12 text-stone-300" />
      <h1 className="font-serif text-3xl font-semibold text-stone-900">Page not found</h1>
      <p className="text-sm text-stone-500 max-w-sm">
        The URL you visited doesn't exist. Check the address or head back to the dashboard.
      </p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-2 px-5 py-2.5 rounded-xl bg-[#B88B58] text-white text-sm font-medium hover:bg-[#A27644] transition-colors cursor-pointer"
      >
        ← Back to Home
      </button>
    </div>
  );
};
