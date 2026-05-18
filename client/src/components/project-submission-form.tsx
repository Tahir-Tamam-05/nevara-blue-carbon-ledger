import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, Map, AlertCircle, Leaf, Clock3 } from 'lucide-react';
import { useState, lazy, Suspense } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';

const GISLandMap = lazy(() => import('@/components/gis-land-map'));

interface ProjectSubmissionFormProps {
  onSuccess: (payload?: any) => void;
}

interface LatLng {
  lat: number;
  lng: number;
}

const contributorSubmissionSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().min(10, 'Project description must be at least 10 characters'),
  restorationObjective: z.string().min(5, 'Restoration objective is required'),
  organizationName: z.string().optional(),
  restorationNotes: z.string().optional(),
  monitoringFrequency: z.enum(['biweekly', 'monthly', 'quarterly']).default('monthly'),
  landBoundary: z.array(z.object({ lat: z.number(), lng: z.number() })).min(3, 'Polygon boundary is required'),
});

type FormValues = z.infer<typeof contributorSubmissionSchema>;
const SUBMIT_TIMEOUT_MS = 25_000;

export function ProjectSubmissionForm({ onSuccess }: ProjectSubmissionFormProps) {
  const { toast } = useToast();
  const [fieldEvidenceFile, setFieldEvidenceFile] = useState<File | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [derivedArea, setDerivedArea] = useState<number>(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(contributorSubmissionSchema),
    defaultValues: {
      name: '',
      description: '',
      restorationObjective: '',
      organizationName: '',
      restorationNotes: '',
      monitoringFrequency: 'monthly',
      landBoundary: [],
    },
  });

  const { landBoundary, monitoringFrequency } = useWatch({ control: form.control });

  const handleBoundaryChange = (boundary: LatLng[], areaHectares: number) => {
    form.setValue('landBoundary', boundary, { shouldValidate: true });
    setDerivedArea(areaHectares);
  };

  const submitMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const formData = new FormData();
      formData.append('name', data.name.trim());
      formData.append('description', data.description.trim());
      formData.append('restorationObjective', data.restorationObjective.trim());
      formData.append('organizationName', data.organizationName?.trim() || '');
      formData.append('restorationNotes', data.restorationNotes?.trim() || '');
      formData.append('monitoringFrequency', data.monitoringFrequency);
      formData.append('landBoundary', JSON.stringify(data.landBoundary));

      if (fieldEvidenceFile) {
        formData.append('fieldEvidence', fieldEvidenceFile);
      }

      console.log('[ContributorSubmit] Submitting project', {
        hasPolygon: data.landBoundary.length > 2,
        monitoringFrequency: data.monitoringFrequency,
        hasFieldEvidence: Boolean(fieldEvidenceFile),
        payloadKeys: Array.from(formData.keys()),
      });

      const res = await Promise.race([
        apiRequest('POST', '/api/projects', formData),
        new Promise<Response>((_, reject) => {
          setTimeout(() => reject(new Error(`Submission timed out after ${SUBMIT_TIMEOUT_MS / 1000}s`)), SUBMIT_TIMEOUT_MS);
        }),
      ]);
      return await res.json();
    },
    onSuccess: (data) => {
      setSubmissionError(null);
      toast({
        title: 'Project submitted',
        description: 'Project entered verifier intake. Ecological initialization has started.',
      });

      console.log('[ContributorSubmit] Project created', {
        projectId: data?.project?.id,
        status: data?.project?.status,
        mrvStatus: data?.project?.mrvStatus,
      });

      form.reset();
      setFieldEvidenceFile(null);
      setDerivedArea(0);
      console.log('[ContributorSubmit] form reset and close requested');
      onSuccess(data);
    },
    onError: (error: Error) => {
      const message = error.message || 'Submission failed';
      setSubmissionError(message);
      console.error('[ContributorSubmit] Submission failed', error);
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: message,
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    setSubmissionError(null);
    if (!data.landBoundary || data.landBoundary.length < 3) {
      form.setError('landBoundary', {
        type: 'manual',
        message: 'Please draw a valid polygon boundary',
      });
      return;
    }
    submitMutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Field evidence must be under 10MB',
      });
      return;
    }
    setFieldEvidenceFile(file);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {submissionError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {submissionError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Project Name *</Label>
        <Input
          id="name"
          {...form.register('name')}
          placeholder="Kandla Coastal Restoration Site"
          className={form.formState.errors.name ? 'border-destructive' : ''}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Project Description *</Label>
        <Textarea
          id="description"
          {...form.register('description')}
          placeholder="Describe the restoration context, baseline condition, and intervention area."
          rows={4}
          className={form.formState.errors.description ? 'border-destructive' : ''}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {form.formState.errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="restorationObjective">Restoration Objective *</Label>
        <Textarea
          id="restorationObjective"
          {...form.register('restorationObjective')}
          placeholder="Example: recover tidal mangrove belt and reduce shoreline erosion."
          rows={3}
          className={form.formState.errors.restorationObjective ? 'border-destructive' : ''}
        />
        {form.formState.errors.restorationObjective && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {form.formState.errors.restorationObjective.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="organizationName">Organization Name (optional)</Label>
          <Input
            id="organizationName"
            {...form.register('organizationName')}
            placeholder="Blue Coast Foundation"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monitoringFrequency" className="flex items-center gap-2">
            <Clock3 className="w-4 h-4" /> Monitoring Frequency (optional)
          </Label>
          <Select
            value={monitoringFrequency}
            onValueChange={(value) => form.setValue('monitoringFrequency', value as FormValues['monitoringFrequency'])}
          >
            <SelectTrigger id="monitoringFrequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="biweekly">Biweekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="restorationNotes">Restoration Notes (optional)</Label>
        <Textarea
          id="restorationNotes"
          {...form.register('restorationNotes')}
          placeholder="Optional implementation details, field context, or operational constraints."
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Map className="w-4 h-4" /> Polygon Boundary *
        </Label>
        <Suspense fallback={
          <div className="h-[400px] flex items-center justify-center border rounded-lg bg-muted/50">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        }>
          <GISLandMap onBoundaryChange={handleBoundaryChange} readOnly={false} />
        </Suspense>

        {form.formState.errors.landBoundary && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {form.formState.errors.landBoundary.message}
          </p>
        )}

        {landBoundary && landBoundary.length > 2 && (
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary flex items-center gap-2">
            <Leaf className="w-4 h-4" />
            GIS boundary captured ({landBoundary.length} points). Derived area: {derivedArea.toFixed(2)} ha.
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="field-evidence">Field Evidence Upload (optional)</Label>
        <div className="group relative border-2 border-dashed rounded-lg p-4 transition-colors hover:border-primary/50">
          <Input
            id="field-evidence"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="text-sm font-medium">
              {fieldEvidenceFile ? fieldEvidenceFile.name : 'Click or drag to upload field evidence'}
            </p>
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOC, DOCX (Max 10MB)</p>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full h-12 text-base" disabled={submitMutation.isPending}>
        {submitMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting Ecological Project...
          </>
        ) : (
          'Submit Project to Verifier Intake'
        )}
      </Button>
    </form>
  );
}
