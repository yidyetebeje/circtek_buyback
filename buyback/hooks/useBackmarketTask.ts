"use client";

import { useEffect, useRef, useState } from "react";
import { backMarketService } from "@/lib/api/backMarketService";

export type TaskStatus = {
  taskId: number;
  action_status: number;
  result?: any;
};

export function useBackmarketTask(taskId?: number, opts?: { intervalMs?: number; maxAttempts?: number }) {
  const intervalMs = opts?.intervalMs ?? Number(process.env.NEXT_PUBLIC_BM_TASK_POLL_INTERVAL_MS ?? '5000');
  const maxAttempts = opts?.maxAttempts ?? Number(process.env.NEXT_PUBLIC_BM_TASK_MAX_ATTEMPTS ?? '24');
  const attemptsRef = useRef(0);
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: any = null;

    async function poll() {
      if (!taskId) return;
      setIsPolling(true);
      try {
        const resp = await backMarketService.getTaskStatus(taskId);
        // backend returns { success: true, data: <backmarket response> }
        // data may contain the task payload directly
        const data = (resp as any)?.data ?? resp;
        const task = (data && (data.task_id || data.bodymessage)) ? {
          taskId: Number(data.task_id ?? data.bodymessage),
          action_status: Number(data.action_status ?? data.actionStatus ?? (data.status ?? 0)),
          result: data.result ?? data
        } : {
          taskId,
          action_status: Number(data?.action_status ?? 0),
          result: data
        };
        if (cancelled) return;
        attemptsRef.current += 1;
        setStatus(task as TaskStatus);

        // action_status 9 => success, 8 => failed (based on Back Market)
        if (task.action_status === 9) {
          setIsPolling(false);
          return;
        }
        if (task.action_status === 8) {
          setIsPolling(false);
          setError('Task failed');
          return;
        }

        if (attemptsRef.current >= maxAttempts) {
          setIsPolling(false);
          setError('Polling timed out');
          return;
        }

        timer = setTimeout(poll, intervalMs);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message ?? 'Error polling task');
        setIsPolling(false);
      }
    }

    if (taskId) {
      attemptsRef.current = 0;
      poll();
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [taskId, intervalMs, maxAttempts]);

  return {
    status,
    isPolling,
    error,
    attempts: attemptsRef.current,
  };
}
