"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { backMarketService } from "@/lib/api/backMarketService";
import { useBackmarketTask } from "@/hooks/useBackmarketTask";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkUploadDialog({ open, onOpenChange }: BulkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const { status: taskStatus, isPolling, error: taskError } = useBackmarketTask(taskId ?? undefined);

  const uploadMutation = useMutation({
    mutationFn: async (csvContent: string) => {
      return await backMarketService.uploadBulkCsv(csvContent);
    },
    onSuccess: (resp: any) => {
      // backend returns { success: true, data: <backmarket response> }
      const data = resp?.data ?? resp;
      // backmarket typically returns bodymessage or task_id with the batch id
      const id = Number(data?.bodymessage ?? data?.task_id ?? data?.data?.bodymessage ?? data?.data?.task_id);
      if (id && !Number.isNaN(id)) {
        setTaskId(id);
        toast.success("Bulk upload submitted — monitoring progress...");
      } else {
        // No task id — treat as immediate success
        toast.success("Bulk upload started successfully");
        onOpenChange(false);
        setFile(null);
      }
    },
    onError: () => {
      toast.error("Failed to upload CSV");
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        uploadMutation.mutate(text);
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (!taskId) return;
    // taskStatus.action_status === 9 => success, 8 => failed
    if (taskStatus && taskStatus.action_status === 9) {
      toast.success("Bulk upload completed successfully");
      onOpenChange(false);
      setFile(null);
      setTaskId(null);
    }
    if (taskStatus && taskStatus.action_status === 8) {
      toast.error("Bulk upload failed — check task results");
      // keep dialog open so admin can inspect or retry
      setTaskId(null);
    }
    if (taskError) {
      toast.error(`Task polling error: ${taskError}`);
      setTaskId(null);
    }
  }, [taskId, taskStatus, taskError, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Listings</DialogTitle>
          <DialogDescription>
            Upload a CSV file to update listings in bulk. 
            This uses the high-capacity ingestion endpoint (2k lines/hour).
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
          </div>
          {file && (
            <div className="text-sm text-muted-foreground">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </div>
          )}

          {/* Task progress UI */}
          {taskId && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className={`h-4 w-4 ${isPolling ? 'animate-spin' : ''}`} />
                <div>
                  Monitoring task <span className="font-mono">{taskId}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {taskStatus ? (
                  <div>Action status: {taskStatus.action_status}</div>
                ) : (
                  <div>Initializing...</div>
                )}
                {taskError && <div className="text-destructive">{taskError}</div>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
