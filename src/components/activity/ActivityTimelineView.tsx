import React from 'react';
import { useVault } from '../../context/VaultContext';
import {
  History,
  KeyRound,
  Edit2,
  Trash2,
  Eye,
  Copy,
  Download,
  Upload,
  Clock,
  Shield,
  RotateCcw,
} from 'lucide-react';

export const ActivityTimelineView: React.FC = () => {
  const { activityLogs } = useVault();

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATED':
        return <KeyRound className="w-4 h-4 text-emerald-500" />;
      case 'UPDATED':
        return <Edit2 className="w-4 h-4 text-blue-500" />;
      case 'DELETED':
      case 'PERMANENTLY_DELETED':
        return <Trash2 className="w-4 h-4 text-rose-500" />;
      case 'RESTORED':
        return <RotateCcw className="w-4 h-4 text-cyan-500" />;
      case 'VIEWED':
        return <Eye className="w-4 h-4 text-amber-500" />;
      case 'COPIED_PASSWORD':
      case 'COPIED_USERNAME':
        return <Copy className="w-4 h-4 text-indigo-500" />;
      case 'EXPORTED_VAULT':
        return <Download className="w-4 h-4 text-purple-500" />;
      case 'IMPORTED_VAULT':
        return <Upload className="w-4 h-4 text-emerald-500" />;
      default:
        return <Shield className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" />
          <span>Security Audit & Activity Timeline</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Immutable audit log tracking all credential access, password copies, edits, and vault operations.
        </p>
      </div>

      {activityLogs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400">
          No vault activity recorded yet.
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-6">
          {activityLogs.map((log) => (
            <div key={log.id} className="relative group">
              {/* Timeline Bullet Pin */}
              <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-xs">
                {getActionIcon(log.action)}
              </div>

              {/* Log Card */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {log.passwordTitle ? `${log.passwordTitle} — ` : ''}
                    <span className="capitalize text-indigo-600 dark:text-indigo-400">
                      {log.action.replace('_', ' ').toLowerCase()}
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {log.details}
                </p>

                {log.ipAddress && (
                  <p className="text-[10px] text-slate-400 pt-1 font-mono">
                    Client IP: {log.ipAddress}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
