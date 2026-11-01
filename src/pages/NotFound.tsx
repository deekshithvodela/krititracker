import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">404 - Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
        The requested URL or team checklist does not exist or may have been archived.
      </p>
      <div className="mt-6">
        <Button variant="primary" size="md" onClick={() => navigate('/')} className="inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </Button>
      </div>
    </div>
  );
};
