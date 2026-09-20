import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Skeleton } from '#/components/ui/skeleton';
import { useAuth } from '#/hooks/useAuth';
import { validateFormula } from '#/modules/investment/fee-evaluator';
import type {
  FeePreset,
  FeeRule,
} from '#/modules/investment/fee-preset-service';
import { validateFeePreset } from '#/modules/investment/fee-preset-service';
import {
  useAddFeePresetMutation,
  useDeleteFeePresetMutation,
  useFeePresetsQuery,
  useUpdateFeePresetMutation,
} from '#/queries/investment';
import { createFileRoute } from '@tanstack/react-router';
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/investment/settings')({
  component: InvestmentSettingsPage,
});

function InvestmentSettingsPage() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<FeePreset | null>(null);
  const [editingPresetOriginalName, setEditingPresetOriginalName] = useState<string | null>(null);

  const { data: presets = [], isLoading: loading } = useFeePresetsQuery(user?.uid);
  const addFeePresetMutation = useAddFeePresetMutation(user?.uid);
  const updateFeePresetMutation = useUpdateFeePresetMutation(user?.uid);
  const deleteFeePresetMutation = useDeleteFeePresetMutation(user?.uid);

  const handleCreatePreset = async (preset: FeePreset) => {
    if (!user) return;
    const validation = validateFeePreset(preset);
    if (!validation.valid) { alert(validation.error); return; }
    try {
      await addFeePresetMutation.mutateAsync(preset);
      setIsCreateDialogOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create preset');
    }
  };

  const handleUpdatePreset = async (oldName: string, newPreset: FeePreset) => {
    if (!user) return;
    const validation = validateFeePreset(newPreset);
    if (!validation.valid) { alert(validation.error); return; }
    try {
      await updateFeePresetMutation.mutateAsync({ oldName, newPreset });
      setEditingPreset(null);
      setEditingPresetOriginalName(null);
      setIsEditDialogOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update preset');
    }
  };

  const handleDeletePreset = async (name: string) => {
    if (!user || !confirm(`Delete preset "${name}"?`)) return;
    try {
      await deleteFeePresetMutation.mutateAsync(name);
    } catch {
      alert('Failed to delete preset');
    }
  };

  const startEditing = (preset: FeePreset) => {
    setEditingPreset({ ...preset, rules: preset.rules.map((r) => ({ ...r })) });
    setEditingPresetOriginalName(preset.name);
    setIsEditDialogOpen(true);
  };

  if (!user) return <div className="p-6">Please log in to access settings.</div>;
  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Skeleton className="h-9 w-72 mb-6" />
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Investment Settings</h1>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Fee Presets</h2>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />Create Preset
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Fee Preset</DialogTitle>
                </DialogHeader>
                <PresetForm
                  onSave={handleCreatePreset}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {presets.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/10">
              <p className="text-muted-foreground mb-2">No fee presets yet</p>
              <p className="text-sm text-muted-foreground">
                Create presets to quickly load common fee structures in the calculator
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {presets.map((preset) => (
                <div key={preset.name} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{preset.name}</h3>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEditing(preset)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => handleDeletePreset(preset.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(preset.rules ?? []).map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground min-w-[120px]">{rule.label}</span>
                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {rule.formula}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Fee Preset</DialogTitle>
              </DialogHeader>
              {editingPreset && (
                <PresetForm
                  initialPreset={editingPreset}
                  onSave={(updated) => handleUpdatePreset(editingPresetOriginalName!, updated)}
                  onCancel={() => { setEditingPreset(null); setIsEditDialogOpen(false); }}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

interface PresetFormProps {
  initialPreset?: FeePreset;
  onSave: (preset: FeePreset) => void;
  onCancel: () => void;
}

function PresetForm({ initialPreset, onSave, onCancel }: PresetFormProps) {
  const [name, setName] = useState(initialPreset?.name || '');
  const [rules, setRules] = useState<FeeRule[]>(
    initialPreset?.rules || [{ label: '', formula: '' }],
  );

  // per-rule formula validation errors
  const formulaErrors = rules.map((r) => (r.formula ? validateFormula(r.formula) : null));
  const hasErrors = formulaErrors.some((e) => e !== null);
  const hasEmpty = rules.some((r) => !r.label.trim() || !r.formula.trim());

  const addRule = () => setRules([...rules, { label: '', formula: '' }]);
  const removeRule = (idx: number) => setRules(rules.filter((_, i) => i !== idx));
  const updateRule = (idx: number, patch: Partial<FeeRule>) =>
    setRules(rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, rules });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="preset-name">Preset Name</Label>
        <Input
          id="preset-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Pluang - Regular"
          required
        />
      </div>

      {/* Variable hint */}
      <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 font-mono">
        vars: <span className="text-foreground">amount</span> (qty × price),{' '}
        <span className="text-foreground">shares</span>,{' '}
        <span className="text-foreground">price</span>
        {'  '}fns:{' '}
        <span className="text-foreground">min()</span>,{' '}
        <span className="text-foreground">max()</span>,{' '}
        <span className="text-foreground">abs()</span>, and all mathjs functions
      </p>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Fee Rules</Label>
          <Button type="button" size="sm" variant="outline" onClick={addRule}>
            <Plus className="h-4 w-4 mr-1" />Add Rule
          </Button>
        </div>

        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-2 p-3 border rounded-lg">
              <div className="flex-1 space-y-2">
                <Input
                  value={rule.label}
                  onChange={(e) => updateRule(idx, { label: e.target.value })}
                  placeholder="Label (e.g. Transaction Fee)"
                  required
                />
                <div>
                  <Input
                    value={rule.formula}
                    onChange={(e) => updateRule(idx, { formula: e.target.value })}
                    placeholder="e.g. max(amount * 0.003 * 1.11, 0.01)"
                    className={`font-mono text-sm ${formulaErrors[idx] ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    required
                  />
                  {formulaErrors[idx] && (
                    <p className="text-xs text-destructive mt-1">{formulaErrors[idx]}</p>
                  )}
                </div>
              </div>
              <Button
                type="button" size="sm" variant="ghost"
                onClick={() => removeRule(idx)}
                disabled={rules.length === 1}
                className="mt-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={hasErrors || hasEmpty}>
          <Save className="h-4 w-4 mr-2" />
          {initialPreset ? 'Update' : 'Create'} Preset
        </Button>
      </div>
    </form>
  );
}
