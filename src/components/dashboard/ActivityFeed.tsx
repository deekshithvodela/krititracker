import React from 'react';
import { CheckCircle2, PlusCircle, Edit3, Move, User, Clock } from 'lucide-react';
import type { GlobalActivityItem } from '../../types';
import { formatDateTime } from '../../utils/helpers';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface ActivityFeedProps {
  activities: GlobalActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const getActionIcon = (action: string) => {
    if (action.includes('Completed') || action.includes('STATUS_CHANGED')) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    }
    if (action.includes('Created') || action.includes('TASK_CREATED')) {
      return <PlusCircle className="w-4 h-4 text-primary-600" />;
    }
    if (action.includes('Reordered') || action.includes('TASKS_REORDERED')) {
      return <Move className="w-4 h-4 text-amber-600" />;
    }
    return <Edit3 className="w-4 h-4 text-blue-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Recent Global Activity</span>
          <span className="text-xs font-normal text-slate-500 font-mono">
            {activities.length} records
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {activities.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No recent activity recorded.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {activities.map(item => (
              <div key={item.id} className="p-4 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getActionIcon(item.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      {item.teamId !== 'MASTER' && item.teamId !== 'ALL' ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono mr-1.5 uppercase text-[10px]">
                          {item.teamId}
                        </span>
                      ) : null}
                      {item.user}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                      {formatDateTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 break-words">
                    {item.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
