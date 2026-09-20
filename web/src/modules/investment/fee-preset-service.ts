import { db } from '#/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { validateFormula } from './fee-evaluator';

export const feeRuleSchema = z.object({
  label: z.string().min(1, 'Label is required').trim(),
  formula: z.string().trim().refine(
    (f) => validateFormula(f) === null,
    (f) => ({ message: validateFormula(f) ?? 'Invalid formula' }),
  ),
});

export const feePresetSchema = z.object({
  name: z.string().min(1, 'Preset name is required').trim(),
  rules: z.array(feeRuleSchema)
    .min(1, 'Preset must have at least one rule')
    .refine(
      (rules) => {
        const labels = rules.map((r) => r.label.toLowerCase());
        return labels.length === new Set(labels).size;
      },
      { message: 'Rule labels must be unique within a preset' },
    ),
});

export const userFeePresetsDocumentSchema = z.object({
  userId: z.string(),
  presets: z.array(feePresetSchema),
  updatedAt: z.instanceof(Timestamp),
});

export type FeeRule = z.infer<typeof feeRuleSchema>;
export type FeePreset = z.infer<typeof feePresetSchema>;
export type UserFeePresetsDocument = z.infer<typeof userFeePresetsDocumentSchema>;

const docRef = (userId: string) => doc(db, 'investment_settings', userId);

export async function getFeePresets(userId: string): Promise<FeePreset[]> {
  const snap = await getDoc(docRef(userId));
  return snap.exists() ? (snap.data() as UserFeePresetsDocument).presets ?? [] : [];
}

async function savePresets(userId: string, presets: FeePreset[]): Promise<void> {
  await setDoc(docRef(userId), { userId, presets, updatedAt: serverTimestamp() }, { merge: true });
}

export async function addFeePreset(userId: string, preset: FeePreset): Promise<void> {
  const existing = await getFeePresets(userId);
  if (existing.some((p) => p.name === preset.name)) {
    throw new Error(`Preset "${preset.name}" already exists`);
  }
  await savePresets(userId, [...existing, preset]);
}

export async function updateFeePreset(userId: string, oldName: string, newPreset: FeePreset): Promise<void> {
  const existing = await getFeePresets(userId);
  if (oldName !== newPreset.name && existing.some((p) => p.name === newPreset.name)) {
    throw new Error(`Preset "${newPreset.name}" already exists`);
  }
  await savePresets(userId, existing.map((p) => (p.name === oldName ? newPreset : p)));
}

export async function deleteFeePreset(userId: string, name: string): Promise<void> {
  const existing = await getFeePresets(userId);
  await savePresets(userId, existing.filter((p) => p.name !== name));
}

export function validateFeePreset(preset: FeePreset): { valid: boolean; error?: string } {
  const result = feePresetSchema.safeParse(preset);
  if (!result.success) return { valid: false, error: result.error.errors[0].message };
  return { valid: true };
}
