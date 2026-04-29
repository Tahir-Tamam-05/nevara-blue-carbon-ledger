import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, MapPin, Activity, FileCheck, Eye, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  status: string;
  mrvStatus?: string;
  userId: string;
  verifierId?: string | null;
  [key: string]: any;
}

interface MRVWorkflowProps {
  project: Project;
  className?: string;
  compact?: boolean;
}

export function MRVWorkflow({ project, className, compact = false }: MRVWorkflowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mrvData, isLoading: isMrvLoading } = useQuery({
    queryKey: ['/api/mrv', project.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/mrv/${project.id}`);
      return res.json();
    },
    refetchInterval: (data) => (data?.status === 'PENDING' ? 3000 : false),
  });

  const triggerMrvMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mrv/trigger", {
        projectId: project.id,
        polygonGeojson: null, // the backend handles finding it
      });
      // Debug: Log raw response before parsing
      const text = await res.clone().text();
      console.log("[MRV_TRIGGER_RESPONSE]", text);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "MRV Analysis Triggered", description: "The satellite analysis has started." });
      queryClient.invalidateQueries({ queryKey: ['/api/mrv', project.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to trigger MRV", description: error.message, variant: "destructive" });
    }
  });

  // Calculate current active step based on project and MRV state
  const mrvStatus = mrvData?.status || project.mrvStatus || 'NONE';
  const hasScore = mrvData?.data != null;
  const projectStatus = project.status; // pending, verified, rejected, needs_clarification
  
  // Step definitions
  // 1: GIS Submitted (always true if we have a project)
  // 2: MRV Analysis (true if PENDING or COMPLETED)
  // 3: Score Generated (true if COMPLETED and score exists)
  // 4: Verifier Review (true if verified, rejected, or needs_clarification)
  // 5: Approved & Minted (true if verified)

  let currentStep = 1;
  if (mrvStatus === 'PENDING') currentStep = 2;
  else if (mrvStatus === 'COMPLETED' && !hasScore) currentStep = 2; // Shouldn't happen ideally
  else if (mrvStatus === 'COMPLETED' && hasScore) currentStep = 3;
  
  if (projectStatus !== 'pending') {
    if (projectStatus === 'needs_clarification' || projectStatus === 'rejected') currentStep = 4;
    else if (projectStatus === 'verified') currentStep = 5;
  }

  // Define steps
  const steps = [
    {
      id: 1,
      label: "GIS Submitted",
      description: "Land boundary defined",
      icon: MapPin,
    },
    {
      id: 2,
      label: "MRV Analysis",
      description: currentStep === 2 ? "Satellite scanning..." : "Analysis complete",
      icon: Activity,
    },
    {
      id: 3,
      label: "Score Generated",
      description: hasScore ? `Trust Score: ${mrvData?.data?.trustScore}/100` : "Awaiting score",
      icon: FileCheck,
    },
    {
      id: 4,
      label: "Verifier Review",
      description: currentStep === 4 && projectStatus === 'needs_clarification' ? "Clarification needed" : 
                   currentStep === 4 && projectStatus === 'rejected' ? "Rejected" :
                   "Manual verification",
      icon: Eye,
    },
    {
      id: 5,
      label: "Approved & Minted",
      description: "Credits issued",
      icon: ShieldCheck,
    }
  ];

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) {
      // Special case: if step 2 and it's actually running
      if (stepId === 2 && mrvStatus === 'PENDING') return 'running';
      if (stepId === 4 && projectStatus === 'needs_clarification') return 'warning';
      if (stepId === 4 && projectStatus === 'rejected') return 'error';
      return 'active';
    }
    return 'pending';
  };

  if (compact) {
    // Render a compact version (just the active step text and a progress bar or simple dots)
    const activeStepObj = steps.find(s => s.id === currentStep) || steps[0];
    
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Workflow: {activeStepObj.label}</span>
          <span>Step {currentStep}/5</span>
        </div>
        <div className="flex gap-1">
          {steps.map((step) => {
            const status = getStepStatus(step.id);
            return (
              <div 
                key={step.id} 
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  status === 'completed' ? "bg-teal-500" :
                  status === 'running' || status === 'active' ? "bg-teal-400 animate-pulse" :
                  status === 'warning' ? "bg-amber-400" :
                  status === 'error' ? "bg-red-400" :
                  "bg-slate-200"
                )}
                title={step.label}
              />
            );
          })}
        </div>
        {/* Helper Action Buttons based on state */}
        <div className="flex gap-2 mt-2">
          {mrvStatus === 'PENDING' && (
            <Button size="sm" variant="outline" className="w-full text-xs" disabled>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              MRV Running...
            </Button>
          )}
          {mrvStatus === 'COMPLETED' && hasScore && (
            <Link href={`/projects/${project.id}/mrv-report`}>
              <Button size="sm" variant="outline" className="w-full text-xs bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100">
                View MRV Report
              </Button>
            </Link>
          )}
          {(mrvStatus === 'NONE' || !mrvStatus) && (
            <Button 
              size="sm" 
              variant="default" 
              className="w-full text-xs" 
              onClick={(e) => { e.preventDefault(); triggerMrvMutation.mutate(); }}
              disabled={triggerMrvMutation.isPending}
            >
              {triggerMrvMutation.isPending ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : "Run MRV Analysis"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white border rounded-xl p-6 shadow-sm", className)}>
      <h3 className="text-sm font-semibold text-slate-800 mb-6 uppercase tracking-wider">MRV Processing Workflow</h3>
      
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-6 bottom-5 w-0.5 bg-slate-100" />
        
        <div className="space-y-6">
          {steps.map((step) => {
            const status = getStepStatus(step.id);
            const Icon = step.icon;
            
            return (
              <div key={step.id} className="relative flex items-start gap-4">
                <div className={cn(
                  "relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 bg-white",
                  status === 'completed' ? "border-teal-500 bg-teal-50 text-teal-600" :
                  status === 'running' ? "border-teal-400 bg-teal-50/50 text-teal-500" :
                  status === 'active' ? "border-slate-800 bg-slate-50 text-slate-800" :
                  status === 'warning' ? "border-amber-400 bg-amber-50 text-amber-600" :
                  status === 'error' ? "border-red-400 bg-red-50 text-red-600" :
                  "border-slate-200 text-slate-300"
                )}>
                  {status === 'completed' ? (
                    <Check className="h-5 w-5" />
                  ) : status === 'running' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : status === 'warning' || status === 'error' ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                
                <div className="pt-1 flex-1">
                  <h4 className={cn(
                    "text-sm font-semibold",
                    status === 'pending' ? "text-slate-400" : 
                    status === 'warning' ? "text-amber-700" :
                    status === 'error' ? "text-red-700" :
                    "text-slate-900"
                  )}>
                    {step.label}
                  </h4>
                  <p className={cn(
                    "text-xs mt-1",
                    status === 'pending' ? "text-slate-400" : "text-slate-500"
                  )}>
                    {step.description}
                  </p>
                  
                  {/* Dynamic actions per step if it's the current/actionable one */}
                  {step.id === 2 && status === 'active' && (!mrvStatus || mrvStatus === 'NONE') && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-3 text-xs" 
                      onClick={() => triggerMrvMutation.mutate()}
                      disabled={triggerMrvMutation.isPending}
                    >
                      {triggerMrvMutation.isPending ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : "Start Analysis"}
                    </Button>
                  )}

                  {step.id === 3 && status === 'completed' && hasScore && (
                    <Link href={`/projects/${project.id}/mrv-report`}>
                      <Button size="sm" variant="link" className="mt-1 h-auto p-0 text-teal-600 text-xs font-medium">
                        View Detailed Report →
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
