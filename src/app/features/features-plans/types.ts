export type FeatureCatalogItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type PlanCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  featureIds: string[];
  featureCodes: string[];
};

export type FeaturesPlansTab = 'plans' | 'plan-features' | 'features';

export type PlanTableRow = {
  id: string;
  name: string;
  priceLabel: string;
  description: string;
} & Record<string, unknown>;

export type PlanFeatureTableRow = {
  id: string;
  name: string;
  priceLabel: string;
  featuresLabel: string;
} & Record<string, unknown>;

export type FeatureTableRow = {
  id: string;
  code: string;
  name: string;
  description: string;
} & Record<string, unknown>;
