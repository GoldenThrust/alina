"use client";

import toast, { resolveValue, Toaster, type Toast } from "react-hot-toast";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";

const styles = {
  success: {
    icon: CheckCircle2,
    accent: "from-emerald-500 to-green-400",
    iconColor: "text-emerald-500",
  },
  error: {
    icon: XCircle,
    accent: "from-red-500 to-rose-400",
    iconColor: "text-red-500",
  },
  warning: {
    icon: AlertTriangle,
    accent: "from-amber-500 to-yellow-400",
    iconColor: "text-yellow-500",
  },
  info: {
    icon: Info,
    accent: "from-blue-500 to-cyan-400",
    iconColor: "text-blue-500",
  },
  loading: {
    icon: LoaderCircle,
    accent: "from-violet-500 to-indigo-400",
    iconColor: "text-violet-500",
  },
  ai: {
    icon: Sparkles,
    accent: "from-fuchsia-500 via-purple-500 to-indigo-500",
    iconColor: "text-fuchsia-500",
  },
};

function ToastCard(t: Toast) {
  const type =
    (t.type as keyof typeof styles) in styles
      ? (t.type as keyof typeof styles)
      : "info";

  const config = styles[type];

  const Icon = config.icon;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl w-90`}
    >
      {/* Accent */}
      <div
        className={`absolute left-0 top-0 h-full w-1 bg-linear-to-b ${config.accent}`}
      />

      <div className="flex gap-4 p-4">
        {/* Icon */}
        <div className={`mt-1 ${config.iconColor}`}>
          {type === "loading" ? (
            <LoaderCircle className="h-6 w-6 animate-spin" />
          ) : (
            <Icon className="h-6 w-6" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-semibold text-zinc-900 dark:text-white">
            {resolveValue(t.message, t)}
          </h3>

          {t.type === "loading" && (
            <p className="mt-1 text-sm text-zinc-500">Please wait...</p>
          )}

          {/* Action Example */}
          {type === "success" && (
            <button className="mt-3 text-sm font-medium text-violet-600 hover:underline">
              View
            </button>
          )}
        </div>

        {/* Close */}
        <button
          onClick={() => toast.dismiss(t.id)}
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* Progress */}
      <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full bg-linear-to-r ${config.accent} animate-pulse`}
        />
      </div>
    </div>
  );
}

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      gutter={12}
      toastOptions={{
        duration: 5000,
        style: {
          background: "transparent",
          boxShadow: "none",
          padding: 0,
        },
      }}
    >
      {(t) => <ToastCard {...t} />}
    </Toaster>
  );
}
