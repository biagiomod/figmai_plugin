export type TaxonomyCategory = "Foundations" | "Primitives" | "Containers" | "Compositions";
export type TaxonomyStatus = "core" | "extended" | "planned";
export interface TaxonomyEntry {
    kind: string;
    category: TaxonomyCategory;
    status: TaxonomyStatus;
    verified: boolean;
    description: string;
    slots: string[];
    tokenRefs: string[];
    note?: string;
}
export declare const TAXONOMY_REGISTRY: TaxonomyEntry[];
//# sourceMappingURL=taxonomy-registry.d.ts.map