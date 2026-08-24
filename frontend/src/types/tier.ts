export interface Tier {
  tierId: string
  tierName: string
  minPoints: number
  earnRate: number
  benefits?: string
  isActive: boolean
  createdAtUtc?: string
}

export interface TierBenefit {
  tierBenefitId: string
  tierId: string
  benefitType: number
  benefitTypeName: string
  benefitValue: string
  description?: string
  isActive: boolean
  createdAtUtc?: string
}

function pick<T>(raw: Record<string, unknown>, camel: string, pascal: string): T | undefined {
  return (raw[camel] ?? raw[pascal]) as T | undefined
}

export function normalizeTier(raw: Record<string, unknown>): Tier {
  return {
    tierId: String(pick(raw, 'tierId', 'TierId') ?? ''),
    tierName: String(pick(raw, 'tierName', 'TierName') ?? ''),
    minPoints: Number(pick(raw, 'minPoints', 'MinPoints') ?? 0),
    earnRate: Number(pick(raw, 'earnRate', 'EarnRate') ?? 0),
    benefits: pick(raw, 'benefits', 'Benefits') as string | undefined,
    isActive: Boolean(pick(raw, 'isActive', 'IsActive') ?? true),
    createdAtUtc: pick(raw, 'createdAtUtc', 'CreatedAtUtc') as string | undefined,
  }
}

export function normalizeTierBenefit(raw: Record<string, unknown>): TierBenefit {
  return {
    tierBenefitId: String(pick(raw, 'tierBenefitId', 'TierBenefitId') ?? ''),
    tierId: String(pick(raw, 'tierId', 'TierId') ?? ''),
    benefitType: Number(pick(raw, 'benefitType', 'BenefitType') ?? 0),
    benefitTypeName: String(pick(raw, 'benefitTypeName', 'BenefitTypeName') ?? ''),
    benefitValue: String(pick(raw, 'benefitValue', 'BenefitValue') ?? ''),
    description: pick(raw, 'description', 'Description') as string | undefined,
    isActive: Boolean(pick(raw, 'isActive', 'IsActive') ?? true),
    createdAtUtc: pick(raw, 'createdAtUtc', 'CreatedAtUtc') as string | undefined,
  }
}

export const BenefitTypeLabels: Record<number, string> = {
  1: 'Discount %',
  2: 'Advance Booking (Days)',
  3: 'Free Service',
  4: 'Priority Support',
  5: 'Bonus Points %',
}
