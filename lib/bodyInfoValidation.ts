import type { Goal } from "@/types/database";

export interface BodyInfoFields {
  currentWeight: string;
  targetWeight: string;
  height: string;
}

export interface BodyInfoErrors {
  currentWeight?: string;
  targetWeight?: string;
  height?: string;
}

const HEIGHT_MIN = 120;
const HEIGHT_MAX = 230;
const WEIGHT_MIN = 30;
const WEIGHT_MAX = 300;

function validateWeightRange(
  value: string,
  errorKey: string,
): string | undefined {
  const n = Number(value);
  if (value.length === 0 || isNaN(n)) return undefined;
  if (n < WEIGHT_MIN || n > WEIGHT_MAX) return errorKey;
  return undefined;
}

export function validateBodyInfo(
  fields: BodyInfoFields,
  goal: Goal | null | undefined,
): BodyInfoErrors {
  const errors: BodyInfoErrors = {};

  if (fields.height.length > 0 && !isNaN(Number(fields.height))) {
    const h = Number(fields.height);
    if (h < HEIGHT_MIN || h > HEIGHT_MAX) {
      errors.height = "validation.height_range";
    }
  }

  const cwErr = validateWeightRange(
    fields.currentWeight,
    "validation.weight_range",
  );
  if (cwErr) errors.currentWeight = cwErr;

  const twErr = validateWeightRange(
    fields.targetWeight,
    "validation.weight_range",
  );
  if (twErr) errors.targetWeight = twErr;

  if (
    goal === "lose_weight" &&
    fields.currentWeight.length > 0 &&
    fields.targetWeight.length > 0 &&
    !isNaN(Number(fields.currentWeight)) &&
    !isNaN(Number(fields.targetWeight)) &&
    !errors.currentWeight &&
    !errors.targetWeight
  ) {
    const cw = Number(fields.currentWeight);
    const tw = Number(fields.targetWeight);
    if (tw >= cw) {
      errors.targetWeight = "validation.lose_weight_target";
    }
  }

  return errors;
}

export function hasErrors(errors: BodyInfoErrors): boolean {
  return Object.values(errors).some(Boolean);
}
