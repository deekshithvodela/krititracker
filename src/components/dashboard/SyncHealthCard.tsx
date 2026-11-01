import React, { useState } from 'react';
import { Database, RefreshCw, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../services/api';

interface SyncHealthCardProps {
  onReconcileComplete?: () => void;
}

export const SyncHealthCard: React.FC<SyncHealthCardProps> = ({ onReconcileComplete }) => {
  const [isReconciling, setIsReconciling] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleReconcile = async () => {
    setIsReconciling(true);
    setFeedback(null);
    try {
      const results = await api.reconcile();
      const successCount = results.filter(r => r.masterSynced).length;
      setFeedback(`Reconciliation completed. ${successCount}/${results.length} teams synchronized.`);
      if (onReconcileComplete) {
        onReconcileComplete();
      }
    } catch (err: any) {
      setFeedback(`Reconciliation error: ${err.message}`);
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Google Sheets Database Engine</h3>
              <Badge variant="success" className="text-[10px] py-0">
                <CheckCircle className="w-3 h-3 mr-1" /> Connected
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Primary database powered by 13 independent spreadsheets with service account authentication.
            </p>
            {feedback && (
              <p className="text-xs font-semibold text-primary-600 mt-2 bg-primary-50 p-2 rounded-lg">
                {feedback}
              </p>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleReconcile}
          isLoading={isReconciling}
          className="w-full sm:w-auto flex items-center justify-center gap-2 border-slate-300 hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Force Reconcile Now</span>
        </Button>
      </div>
    </Card>
  );
};
