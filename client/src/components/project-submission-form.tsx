import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSubmissionSchema } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, Calculator, Map, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, lazy, Suspense, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth-context';
import { z } from 'zod';

const GISLandMap = lazy(() => import('@/components/gis-land-map'));

interface ProjectSubmissionFormProps {
  onSuccess: () => void;
}

interface LatLng {
  lat: number;
  lng: number;
}

// Factors from UI select options
const CARBON_FACTORS = {
  'Mangrove': 8.0,
  'Seagrass': 5.5,
  'Salt Marsh': 4.5,
  'Coastal': 3.5,
  'Other': 2.0,
} as const;

type FormValues = z.infer<typeof projectSubmissionSchema> & {
  landBoundary?: LatLng[];
};

export function ProjectSubmissionForm({ onSuccess }: ProjectSubmissionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [useManualArea, setUseManualArea] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(projectSubmissionSchema),
    defaultValues: {
      name: '',
      description: '',
      location: '',
      area: 0,
      ecosystemType: 'Mangrove',
      userId: user?.id || '',
      landBoundary: [],
    },
  });

  const { area, ecosystemType, landBoundary } = useWatch({ control: form.control });

  // Update userId if it changes (e.g. login during form open)
  useEffect(() => {
    if (user?.id && !form.getValues('userId')) {
      form.setValue('userId', user.id);
    }
  }, [user?.id, form]);

  const liveEstimate = useMemo(() => {
    const factor = CARBON_FACTORS[ecosystemType as keyof typeof CARBON_FACTORS] || 0;
    const annual = (area || 0) * factor;
    return {
      annual: annual,
      lifetime: annual * 20
    };
  }, [area, ecosystemType]);

  const handleBoundaryChange = (boundary: LatLng[], area: number) => {
    form.setValue('landBoundary', boundary);
    if (!useManualArea) {
      form.setValue('area', Number(area.toFixed(4)), { shouldValidate: true });
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', data.description);
      formData.append('location', data.location);
      formData.append('area', data.area.toString());
      formData.append('ecosystemType', data.ecosystemType);
      formData.append('userId', user?.id || data.userId);

      if (data.landBoundary && data.landBoundary.length > 0) {
        formData.append('landBoundary', JSON.stringify(data.landBoundary));
      }

      if (proofFile) {
        formData.append('proof', proofFile);
      }

      const res = await apiRequest('POST', '/api/projects', formData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Submission failed');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Project submitted!',
        description: data.carbonCalculation
          ? `Annual: ${data.carbonCalculation.annualCO2.toFixed(2)} tCO₂/yr • Lifetime: ${data.carbonCalculation.lifetimeCO2.toFixed(2)} tons`
          : 'Your project has been submitted for verification',
      });
      
      setShowSuccess(true);
      setTimeout(() => {
        form.reset();
        setProofFile(null);
        onSuccess();
        setShowSuccess(false);
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!useManualArea && (!data.landBoundary || data.landBoundary.length === 0)) {
      form.setError('area', { 
        type: 'manual', 
        message: 'Please draw your land boundary on the map' 
      });
      return;
    }
    submitMutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Proof document must be under 10MB',
        });
        return;
      }
      setProofFile(file);
    }
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold">Submission Received!</h3>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Project Name *</Label>
        <Input
          id="name"
          {...form.register('name')}
          placeholder="Mangrove Restoration Initiative"
          className={form.formState.errors.name ? 'border-destructive' : ''}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          {...form.register('description')}
          placeholder="Describe your blue carbon project, including location, methods, and impact..."
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
        <Label htmlFor="location">Location *</Label>
        <Input
          id="location"
          {...form.register('location')}
          placeholder="e.g., Caribbean Sea, Pacific Islands, Southeast Asia"
          className={form.formState.errors.location ? 'border-destructive' : ''}
        />
        {form.formState.errors.location && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {form.formState.errors.location.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Include region or country for accurate carbon calculations
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Map className="w-4 h-4" />
            Land Area Measurement *
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUseManualArea(!useManualArea)}
          >
            {useManualArea ? 'Switch to Map Drawing' : 'Switch to Manual Entry'}
          </Button>
        </div>

        {useManualArea ? (
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="area"
                type="number"
                step="0.0001"
                min="0.0001"
                {...form.register('area', { valueAsNumber: true })}
                placeholder="Enter area in hectares"
                className={form.formState.errors.area ? 'border-destructive pr-12' : 'pr-12'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">ha</span>
            </div>
            {form.formState.errors.area && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {form.formState.errors.area.message}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Suspense fallback={
              <div className="h-[400px] flex items-center justify-center border rounded-lg bg-muted/50">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            }>
              <GISLandMap
                onBoundaryChange={handleBoundaryChange}
                readOnly={false}
              />
            </Suspense>
            {form.formState.errors.area && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {form.formState.errors.area.message}
              </p>
            )}
            {landBoundary && landBoundary.length > 0 && !useManualArea && (
              <p className="text-xs text-primary font-medium">
                Detected Area: {area?.toFixed(4)} hectares
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ecosystemType">Ecosystem Type *</Label>
        <Select
          value={form.watch('ecosystemType')}
          onValueChange={(value) => form.setValue('ecosystemType', value as any)}
        >
          <SelectTrigger id="ecosystemType">
            <SelectValue placeholder="Select ecosystem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Mangrove">Mangrove (8.0 t/ha/yr)</SelectItem>
            <SelectItem value="Seagrass">Seagrass (5.5 t/ha/yr)</SelectItem>
            <SelectItem value="Salt Marsh">Salt Marsh (4.5 t/ha/yr)</SelectItem>
            <SelectItem value="Coastal">Coastal (3.5 t/ha/yr)</SelectItem>
            <SelectItem value="Other">Other (2.0 t/ha/yr)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {area > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Calculator className="w-4 h-4" />
            <span>Estimated Sequestration Potential</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Annual Potential</p>
              <p className="text-lg font-bold">{liveEstimate.annual.toFixed(2)} <span className="text-xs font-normal">tCO₂/yr</span></p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">20-Year Lifetime</p>
              <p className="text-lg font-bold">{liveEstimate.lifetime.toFixed(2)} <span className="text-xs font-normal">tCO₂</span></p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            * Final verification by verifier and MRV system required.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="proof-file">Proof Document (optional)</Label>
        <div className="group relative border-2 border-dashed rounded-lg p-4 transition-colors hover:border-primary/50">
          <Input
            id="proof-file"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="text-sm font-medium">
              {proofFile ? proofFile.name : 'Click or drag to upload proof'}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, JPG, or DOC (Max 10MB)
            </p>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-base"
        disabled={submitMutation.isPending}
      >
        {submitMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting Project...
          </>
        ) : (
          'Submit Project for Verification'
        )}
      </Button>
    </form>
  );
}
