# Graph Report - ChocolateSecrets  (2026-07-08)

## Corpus Check
- 397 files · ~219,108 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1791 nodes · 4956 edges · 102 communities (96 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `15e2a8a6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_BarcodeScannerModal.tsx|BarcodeScannerModal.tsx]]
- [[_COMMUNITY_topsis.ts|topsis.ts]]

## God Nodes (most connected - your core abstractions)
1. `Ingredient` - 101 edges
2. `Recipe` - 83 edges
3. `useToast()` - 53 edges
4. `Composition` - 51 edges
5. `db` - 42 edges
6. `ResolvedIngredient` - 40 edges
7. `useData()` - 39 edges
8. `RecipePhysics` - 39 edges
9. `handleFirestoreError()` - 36 edges
10. `useRecipePhysics()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `SourcingPanel()` --references--> `dompurify`  [EXTRACTED]
  src/components/SourcingPanel.tsx → package.json
- `ReceiptImportModal()` --references--> `react`  [EXTRACTED]
  src/components/ReceiptImportModal.tsx → package.json
- `RecipeAudit()` --references--> `react`  [EXTRACTED]
  src/pages/RecipeAudit.tsx → package.json
- `RecipeCookingMode()` --references--> `react`  [EXTRACTED]
  src/pages/RecipeCookingMode.tsx → package.json
- `RecipeDetail()` --references--> `react`  [EXTRACTED]
  src/pages/RecipeDetail.tsx → package.json

## Import Cycles
- 4-file cycle: `src/services/culinary/ingredientSpec.ts -> src/types.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/ingredientSpec.ts`
- 4-file cycle: `src/services/culinary/allergens.ts -> src/types.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/allergens.ts`
- 4-file cycle: `src/services/culinary/equipment.ts -> src/types.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/equipment.ts`
- 4-file cycle: `src/services/culinary/chocolate.ts -> src/types.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/chocolate.ts`
- 5-file cycle: `src/services/culinary/chocolate.ts -> src/types.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/ingredientSpec.ts -> src/services/culinary/chocolate.ts`
- 5-file cycle: `src/services/culinary/ingredientSpec.ts -> src/types.ts -> src/types/ingredient.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/ingredientSpec.ts`
- 5-file cycle: `src/services/culinary/ingredientSpec.ts -> src/types.ts -> src/types/recipe.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/ingredientSpec.ts`
- 5-file cycle: `src/services/culinary/allergens.ts -> src/types.ts -> src/types/ingredient.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/allergens.ts`
- 5-file cycle: `src/services/culinary/allergens.ts -> src/types.ts -> src/types/recipe.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/allergens.ts`
- 5-file cycle: `src/services/culinary/equipment.ts -> src/types.ts -> src/types/ingredient.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/equipment.ts`
- 5-file cycle: `src/services/culinary/equipment.ts -> src/types.ts -> src/types/recipe.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/equipment.ts`
- 5-file cycle: `src/services/culinary/chocolate.ts -> src/types.ts -> src/types/ingredient.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/chocolate.ts`
- 5-file cycle: `src/services/culinary/chocolate.ts -> src/types.ts -> src/types/recipe.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/chocolate.ts`

## Communities (102 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.19
Nodes (13): CadencePreset, RecurringExpectationForm(), RecurringExpectationFormProps, RecurringExpectationsList(), RecurringExpectationsListProps, createRecurringExpectation(), listRecurringExpectations(), updateRecurringExpectation() (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.25
Nodes (16): crowdingDistance(), dominates(), IndividualScored, makeRng(), NSGA2_DEFAULTS, Nsga2Config, paretoRank(), polynomialMutation() (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (35): BatchImportReview(), BatchImportReviewProps, NewIngredientDraft, Props, VisualAuditModal(), CANONICAL_UNITS, COMPONENT_TYPES, INGREDIENT_CATEGORIES (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (23): CompositionEditor(), CompositionEditorProps, alcoholComposition(), chocolateComposition(), COMPOSITION_DESCRIPTORS, COMPOSITION_SPECIES, compositionSum(), DEFAULT_COMPOSITION_BY_CATEGORY (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (18): ChocolateContent(), formatRange(), IngredientInfo(), IngredientInfoProps, parseChocolateSpec(), DAIRY_BRANDS, DAIRY_CATEGORIES, DairyBrand (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (36): EditorBreadStrip(), EditorBreadStripProps, RecipeBreadTier(), RecipeBreadTierProps, calculateBakersPct(), flourSubtype(), isFlour(), isSalt() (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (33): Dashboard(), UnitConversionWarning, bonbonRecipe, fixtureIngredients, fixtureRecipes, subRecipeGanache, subRecipeTemperedDark, ContributionReport (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (24): assessCurdleRisk(), assessEthanol(), LONG_SHELF_ETHANOL_BAND, EvalInput, evaluateConfectionery(), DslContext, inferConfectionerySubtype(), N() (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (14): evaluateFrozen(), inferFrozenRecipeSubtype(), calculateLactosePct(), calculateMSNF(), calculateTotalSolidsPct(), isDairyDerived(), calculatePAC(), calculatePOD() (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (33): Dashboard, Expenses, Formulate, IngredientDetail, Ingredients, Inventory, InventoryTransactions, PrepList (+25 more)

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (21): AuditsView(), TransfersView(), DataContext, DataProvider(), useData(), auth, handleFirestoreError(), OperationType (+13 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (39): add(), aerate(), AerateFlag, AerateParams, brine(), BrineFlag, caramelize(), CaramelizeParams (+31 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (18): AddParams, emulsify(), EmulsifyParams, STABILITY_SCORE, EnzymeProfile, heat(), HeatParams, REDUCING_SUGARS (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (10): deriveWarnings(), CLASSIC_GANACHE, DARK_70, HEAVY_CREAM, RASPBERRY_PUREE, useRecipePhysics(), classifyAwBand(), classifyFatRegime() (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (11): RecipeCategoryPicker(), RecipeCategoryPickerProps, BREAD_RECIPE_SUBTYPES, DEFAULT_FRICTION_FACTOR_BY_METHOD, FROZEN_RECIPE_SUBTYPES, FrozenRecipeSubtype, MIXING_METHODS, MixingMethod (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.20
Nodes (10): app, db, FirestoreErrorInfo, UserRole, ALL_ALLERGEN_KEYS, RestaurantSettings(), subscribeToUserAlerts(), recomputeAllCrossContactRisks() (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (18): PAC_FACTORS, PIECEWISE_AW_TO_WEEKS, piecewiseAwToWeeks(), predictShelfLife(), ShelfLifeInputs, FREEZING_SOLUTES, FreezingFlag, FreezingResult (+10 more)

### Community 17 - "Community 17"
Cohesion: 0.40
Nodes (4): AW_BANDS_FOR_TABLE, faultColor(), RecipePhysicsDetail(), RecipePhysicsDetailProps

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (32): EditorFrozenStrip(), EditorFrozenStripProps, EditorPhysicsRibbon(), EditorPhysicsRibbonProps, RecipeFrozenTier(), RecipeFrozenTierProps, RecipePhysics, collectFaults() (+24 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (22): TranslateRecipeModal(), TranslateRecipeModalProps, applyTranslationProposal(), collectTasks(), translateRecipe(), TranslationFill, TranslationProposal, writeI18nSlot() (+14 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (41): classifyBand(), computeDoneness(), DonenessBand, DonenessFlag, DonenessInput, estimateConductivity(), estimateSpecificHeat(), CANDY (+33 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (24): dependencies, date-fns, express, firebase, @google/genai, i18next, i18next-browser-languagedetector, lucide-react (+16 more)

### Community 22 - "Community 22"
Cohesion: 0.15
Nodes (23): AdjustStockModal(), AdjustStockModalProps, Combobox(), ComboboxProps, ReceiptImportModal(), ReceiveGoodsModal(), TransferStockModal(), IngredientDetail() (+15 more)

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (18): getActionIcon(), RecipeEditor(), Action, getConfidenceStyle(), getFieldMeta(), getIngredientMinConfidence(), getProvenanceStyle(), hydrateTranslationsFromLegacy() (+10 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (24): BrineParams, freeze(), FreezeFlag, FreezeParams, Diffusant, MassDiffusionInput, computePlankTime(), PlankFlag (+16 more)

### Community 25 - "Community 25"
Cohesion: 0.19
Nodes (14): BillsList(), RecipeCostDrivers(), RecipeCostDriversProps, TranslationTabs(), TranslationTabsProps, useToast(), SupportedLanguage, useLanguage() (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (13): RoleBadge(), RoleBadgeProps, CATEGORY_FALLBACK, getRoleSwapSet(), has(), hasNot(), inferRole(), inferRoleTag() (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (17): ADDITIONS, AGENTS, CULTURES, defaultParams(), ENZYMES, Field, fmt(), OP_BY_ID (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (13): getGeminiModel(), GEMINI_API_KEY, geminiGenerate, GeminiGenerateInput, callGemini(), GEMINI_API_KEY, Lang, LANGUAGE_NAMES (+5 more)

### Community 29 - "Community 29"
Cohesion: 0.20
Nodes (14): VendorForm(), VendorFormProps, VendorPickerProps, VendorSearchModal(), VendorSearchModalProps, VendorsList(), VendorsListProps, createVendor() (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.26
Nodes (8): CandidateCard(), CandidateCardProps, useFormulationOptimizer(), DEFAULT_OBJECTIVES, Formulate(), TEXTURE_OBJECTIVES, OptimizerCandidate, sanitizeData()

### Community 31 - "Community 31"
Cohesion: 0.16
Nodes (16): BillPaymentHistory(), BillPaymentHistoryProps, PaymentForm(), PaymentFormProps, PaymentsList(), PAYMENT_METHODS, getBill(), getBillsByIds() (+8 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (19): AuditsViewProps, PurchaseOrderModal(), PurchaseOrderModalProps, ReceiveGoodsModalProps, ReceivePOModal(), ReceivePOModalProps, TransferStockModalProps, TransfersViewProps (+11 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (17): devDependencies, firebase-functions-test, typescript, vitest, engines, node, main, name (+9 more)

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (12): dompurify, candidateKey(), SourcingPanel(), SourcingPanelProps, useKeptSourcingNotes(), buildCandidate(), keepNote(), parseGeminiJson() (+4 more)

### Community 36 - "Community 36"
Cohesion: 0.05
Nodes (39): devDependencies, firebase-admin, @firebase/eslint-plugin-security-rules, @firebase/rules-unit-testing, jsdom, @playwright/test, tailwindcss, @testing-library/react (+31 more)

### Community 37 - "Community 37"
Cohesion: 0.15
Nodes (13): FailureModeSheet(), FailureModeSheetProps, FailureModeTrigger(), FailureModeTriggerProps, CHOCOLATE_CATALOG, CHOCOLATE_FAILURE_MODES, CHOCOLATE_WORK_ACTION_TYPES, ChocolateProductEntry (+5 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (11): aliases, COLLECTION_MAP, __dirname, repoRoot, report, RULES_ONLY_ALLOWED, rulesPath, rulesText (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.19
Nodes (14): AITC_EQ, band0to100(), beidler(), CAPSAICIN_EQ, carbonationBand(), ChemesthesisChannel, ChemesthesisFlag, chemesthesisFromComposition() (+6 more)

### Community 40 - "Community 40"
Cohesion: 0.10
Nodes (30): DosingPanel(), TASTES, TransportPanel(), DosingAddition, DosingFlag, DosingGoal, DosingOptions, DosingPoint (+22 more)

### Community 41 - "Community 41"
Cohesion: 0.26
Nodes (10): BILL_EXTRACTION_SCHEMA, ExtractBillInput, ExtractBillResult, GEMINI_API_KEY, SUPPORTED_MIME_TYPES, finiteOrNull(), isAllowedStoragePath(), parsePlausibleDate() (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.26
Nodes (13): BillReview(), BillReviewProps, BillsListProps, BillUpload(), BillUploadProps, createBill(), extractBill(), ExtractedBillResult (+5 more)

### Community 43 - "Community 43"
Cohesion: 0.14
Nodes (22): ACTION_TYPES, ExtractedRecipeIngredient, AllergenFlag, CrossContactRisk, DietaryFlag, HACCPMetadata, ChocolateSpec, CustomField (+14 more)

### Community 44 - "Community 44"
Cohesion: 0.21
Nodes (8): dailyExpenseCheck, onBillReviewed, writeAnomalyAlert(), resolveAdminUserIds(), { getFirestoreMock, docMock, setMock, getMock, whereMock }, queueAdmins(), usersSnap(), { getFirestoreMock, collectionMock, docMock, setMock, getMock }

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (13): ai, callGeminiDetection(), db, detectionCache, detectLanguagesBatch(), __dirname, main(), migrateIngredients() (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.22
Nodes (9): SearchSpaceList(), SearchSpaceListProps, applyDecisionVector(), clamp01(), baseRecipe, catalog, baseRecipe, catalog (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.36
Nodes (8): Status, UseFormulationOptimizerReturn, OptimizerProgressMessage, ScoreInput, OptimizerInput, OptimizerResult, WorkerInbound, WorkerOutbound

### Community 48 - "Community 48"
Cohesion: 0.31
Nodes (13): RecipeEditPage(), attachComponentLocalizedFields(), attachIngredientLocalizedFields(), attachRecipeIngredientLocalizedFields(), attachRecipeLocalizedFields(), attachStepLocalizedFields(), attachSupplierLocalizedFields(), findById() (+5 more)

### Community 49 - "Community 49"
Cohesion: 0.15
Nodes (12): compileOnSave, compilerOptions, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck, sourceMap (+4 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (23): react, ConfirmModalProps, completed, hasMissingTranslations(), inFlight, useAutoTranslate(), useRestaurantSettings(), RecipeCookingMode() (+15 more)

### Community 51 - "Community 51"
Cohesion: 0.27
Nodes (10): compareNumbers(), evaluateStepCondition(), formatNumeric(), readPhysicsMetric(), renderStepTemplate(), resolveSlot(), RISK_RANK, ctx (+2 more)

### Community 52 - "Community 52"
Cohesion: 0.13
Nodes (17): BLISS, BlissTaste, clamp(), computePalatability(), invertedU(), PalatabilityFlag, beidler(), clamp() (+9 more)

### Community 53 - "Community 53"
Cohesion: 0.17
Nodes (7): __dirname, enFiles, localesRoot, OTHER_LANGS, referenceFiles, repoRoot, report

### Community 54 - "Community 54"
Cohesion: 0.08
Nodes (23): SetGelParams, classifyBand(), computeFoam(), FoamBand, FoamFlag, saturating(), FunctionalAgent, PATTERNS (+15 more)

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (7): COCOA_OPTIONS, DEFAULT_RANGES, deriveSearchSpace(), geneCount(), mockCatalog, mockRecipe, totalGeneCount()

### Community 56 - "Community 56"
Cohesion: 0.22
Nodes (8): BillAllocation, BillLineItem, BillPaymentInstruction, BillTaxLine, BillVendorResolution, ExpenseCategoryParent, PaymentMethod, VendorContact

### Community 57 - "Community 57"
Cohesion: 0.32
Nodes (9): computeDryingRate(), DryingFlag, DryingRateInput, DryingRateResult, computePsychrometrics(), latentHeatVaporization(), PsychrometricInput, PsychrometricState (+1 more)

### Community 58 - "Community 58"
Cohesion: 0.11
Nodes (20): DIFFUSANTS, FREEZE_ENV, FREEZE_ENVS, GEOMETRIES, METHODS, SURFACE_BY_METHOD, CookingMethod, HeatPenetrationInput (+12 more)

### Community 59 - "Community 59"
Cohesion: 0.15
Nodes (24): clamp(), computeHeatPenetration(), HeatPenetrationFlag, HeatPenetrationResult, METHOD_H, temperatureAtDepth(), meat, clamp01() (+16 more)

### Community 60 - "Community 60"
Cohesion: 0.43
Nodes (4): CsvImportModal(), CsvImportModalProps, ParsedNumber, parseLocaleNumber()

### Community 61 - "Community 61"
Cohesion: 0.36
Nodes (7): jaccardSimilarity(), nameMatchScore(), normalizeVendorName(), tokenize(), runVendorResolution(), VendorMatchInput, VendorMatchResult

### Community 62 - "Community 62"
Cohesion: 0.18
Nodes (7): ATTR_RE, __dirname, findings, IGNORED_PATHS, repoRoot, srcRoot, USER_FACING_ATTRS

### Community 63 - "Community 63"
Cohesion: 0.23
Nodes (9): AlertsBell(), SEVERITY_DOT, dismissAlert(), Alert, AlertSeverity, AlertType, RecurringCadenceTolerance, alertCreatedMillis() (+1 more)

### Community 64 - "Community 64"
Cohesion: 0.14
Nodes (20): DosingPanelProps, PipelinePanelProps, Props, RecipeEditorProps, RecipeOutputStrip(), RecipeOutputStripProps, TransportPanelProps, identifyCrossContactRisks() (+12 more)

### Community 65 - "Community 65"
Cohesion: 0.38
Nodes (6): analyzeRecipe(), dominantProvenance(), ProvenanceHealth, RecipeAudit(), ExtractedRecipeStep, Provenance

### Community 66 - "Community 66"
Cohesion: 0.38
Nodes (5): classifyConsistency(), computeRheology(), ConsistencyBand, FlowType, RheologyFlag

### Community 67 - "Community 67"
Cohesion: 0.22
Nodes (9): computeFormulaBalance(), FormulaBalanceFlag, FormulaBalanceMasses, FormulaBalanceRatios, FormulaFault, FormulaFaultKind, FormulaFaultSeverity, balancedCake() (+1 more)

### Community 68 - "Community 68"
Cohesion: 0.31
Nodes (6): BillStatus, PaymentMethod, recordPayment, RecordPaymentInput, RecordPaymentResult, { getFirestoreMock, runTransactionMock, collectionMock }

### Community 69 - "Community 69"
Cohesion: 0.28
Nodes (7): AromaBand, AromaReleaseClass, AromaReleaseFlag, classifyBand(), computeAromaRelease(), POLARITY_ANCHORS, VolatilePolarity

### Community 70 - "Community 70"
Cohesion: 0.27
Nodes (6): extractBill, onLotUpdate, shouldArchiveLot(), resolveVendor, ResolveVendorInput, translateBatch

### Community 71 - "Community 71"
Cohesion: 0.36
Nodes (5): computeShoppingListQuantity(), computeStockUpdate(), db, onTransactionCreate, computeWAC()

### Community 72 - "Community 72"
Cohesion: 0.47
Nodes (4): BarcodeScannerModal(), Props, ExtractedProductLabel, prepareImageForUpload()

### Community 73 - "Community 73"
Cohesion: 0.16
Nodes (14): ActionIcon(), ActionIconProps, actionMap, LocalizedField(), LocalizedFieldProps, resolveLocalized(), ResolveResult, RuntimeTranslated() (+6 more)

### Community 74 - "Community 74"
Cohesion: 0.28
Nodes (7): BOILING_SOLUTES, BoilingFlag, BoilingResult, CANDY_STAGES, CandyStage, classifyCandyStage(), computeBoilingPoint()

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (7): classifyRisk(), computeSucroseCrystallization(), CrystallizationFlag, CrystallizationResult, GrainingRisk, SUCROSE_SOLUBILITY, sucroseSolubilityAt()

### Community 76 - "Community 76"
Cohesion: 0.28
Nodes (7): clamp01(), computeProteinSet(), PROTEIN_PROFILES, ProteinProfile, ProteinSetBand, ProteinSetResult, ProteinType

### Community 77 - "Community 77"
Cohesion: 0.15
Nodes (17): DisplayWarning, RecipeWarningsList(), RecipeWarningsListProps, Severity, PhysicsWarning, BreadWarning, FROZEN_BANDS_BY_SUBTYPE, POD_FACTORS (+9 more)

### Community 78 - "Community 78"
Cohesion: 0.62
Nodes (5): nextNOccurrences(), nextOccurrence(), parseRRule(), previousOccurrence(), rrule

### Community 79 - "Community 79"
Cohesion: 0.25
Nodes (6): locales, localizer, ProductionCalendarProps, PrepItem, ProductionRun, Restaurant

### Community 80 - "Community 80"
Cohesion: 0.24
Nodes (8): detectHardConstraintViolation(), evaluateObjectives(), RISK_RANK, estimateTgPrime(), TG_PRIME_C, TgPrimeFlag, TgPrimeResult, OptimizerTargets

### Community 81 - "Community 81"
Cohesion: 0.18
Nodes (14): classify(), computeChocolateSnap(), computePolymorphWindow(), detectMixedChocolateClasses(), lookupWindow(), polymorphWindowForCocoa(), SNAP_FAT_BLEND_BY_CLASS, TEMPER_TABLE (+6 more)

### Community 82 - "Community 82"
Cohesion: 0.60
Nodes (4): RankInput, topsisRank(), ObjectiveWeights, OptimizerObjective

### Community 83 - "Community 83"
Cohesion: 0.70
Nodes (4): run(), say(), harden-gcp.sh script, warn()

### Community 84 - "Community 84"
Cohesion: 0.50
Nodes (4): db, __dirname, migrate(), parseLegacyString()

### Community 100 - "BarcodeScannerModal.tsx"
Cohesion: 0.40
Nodes (5): dependencies, firebase-admin, firebase-functions, @google/genai, functions

## Knowledge Gaps
- **461 isolated node(s):** `name`, `build`, `test`, `serve`, `shell` (+456 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 21` to `Community 50`, `Community 35`, `Community 36`, `Community 78`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Why does `react` connect `Community 50` to `Community 65`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `RecipeDetail()` connect `Community 50` to `Community 10`, `Community 13`, `Community 48`, `Community 51`, `Community 25`, `Community 63`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **What connects `name`, `build`, `test` to the rest of the system?**
  _462 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08773784355179703 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.13054187192118227 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.12615384615384614 - nodes in this community are weakly interconnected._