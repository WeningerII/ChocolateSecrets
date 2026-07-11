# Graph Report - .  (2026-07-11)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1849 nodes · 5012 edges · 134 communities (98 shown, 36 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `184f80e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 126

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
- 4-file cycle: `src/services/culinary/allergens.ts -> src/types.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/allergens.ts`
- 4-file cycle: `src/services/culinary/chocolate.ts -> src/types.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/chocolate.ts`
- 4-file cycle: `src/services/culinary/equipment.ts -> src/types.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/equipment.ts`
- 4-file cycle: `src/services/culinary/ingredientSpec.ts -> src/types.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/ingredientSpec.ts`
- 5-file cycle: `src/services/culinary/chocolate.ts -> src/types.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/ingredientSpec.ts -> src/services/culinary/chocolate.ts`
- 5-file cycle: `src/services/culinary/allergens.ts -> src/types.ts -> src/types/ingredient.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/allergens.ts`
- 5-file cycle: `src/services/culinary/chocolate.ts -> src/types.ts -> src/types/ingredient.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/chocolate.ts`
- 5-file cycle: `src/services/culinary/equipment.ts -> src/types.ts -> src/types/ingredient.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/equipment.ts`
- 5-file cycle: `src/services/culinary/ingredientSpec.ts -> src/types.ts -> src/types/ingredient.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/ingredientSpec.ts`
- 5-file cycle: `src/services/culinary/allergens.ts -> src/types.ts -> src/types/recipe.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/allergens.ts`
- 5-file cycle: `src/services/culinary/chocolate.ts -> src/types.ts -> src/types/recipe.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/chocolate.ts`
- 5-file cycle: `src/services/culinary/equipment.ts -> src/types.ts -> src/types/recipe.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/equipment.ts`
- 5-file cycle: `src/services/culinary/ingredientSpec.ts -> src/types.ts -> src/types/recipe.ts -> src/types/allergens.ts -> src/services/culinaryTools.ts -> src/services/culinary/ingredientSpec.ts`

## Communities (134 total, 36 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (107): AdjustStockModal(), AdjustStockModalProps, AuditsView(), AuditsViewProps, BarcodeScannerModal(), Props, BillsList(), Combobox() (+99 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (70): BillPaymentHistory(), BillPaymentHistoryProps, BillReview(), BillReviewProps, BillsListProps, BillUpload(), BillUploadProps, PaymentForm() (+62 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (53): CandidateCard(), CandidateCardProps, SearchSpaceList(), SearchSpaceListProps, Status, useFormulationOptimizer(), UseFormulationOptimizerReturn, DEFAULT_OBJECTIVES (+45 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (41): classifyBand(), computeDoneness(), DonenessBand, DonenessFlag, DonenessInput, estimateConductivity(), estimateSpecificHeat(), CANDY (+33 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (37): EditorBreadStrip(), EditorBreadStripProps, RecipeBreadTier(), RecipeBreadTierProps, calculateBakersPct(), flourSubtype(), isFlour(), isSalt() (+29 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (35): Dashboard(), UnitConversionWarning, bonbonRecipe, fixtureIngredients, fixtureRecipes, subRecipeGanache, subRecipeTemperedDark, ContributionReport (+27 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (32): RecipeCategoryPicker(), RecipeCategoryPickerProps, RecipeEditorProps, ACTION_TYPES, AllergenKey, AllergenFlag, CrossContactRisk, DietaryFlag (+24 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (24): EvalInput, BOILING_SOLUTES, BoilingFlag, BoilingResult, CANDY_STAGES, CandyStage, classifyCandyStage(), computeBoilingPoint() (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (29): EditorFrozenStrip(), EditorFrozenStripProps, EditorPhysicsRibbon(), EditorPhysicsRibbonProps, RecipeFrozenTier(), RecipeFrozenTierProps, RecipeOutputStrip(), RecipeOutputStripProps (+21 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (30): BatchImportReview(), BatchImportReviewProps, NewIngredientDraft, CANONICAL_UNITS, COMPONENT_TYPES, INGREDIENT_CATEGORIES, IngredientCategory, RECIPE_TYPES (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (25): FailureModeSheet(), FailureModeSheetProps, ChocolateContent(), formatRange(), IngredientInfo(), IngredientInfoProps, CHOCOLATE_CATALOG, CHOCOLATE_FAILURE_MODES (+17 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (24): CompositionEditor(), CompositionEditorProps, alcoholComposition(), chocolateComposition(), COMPOSITION_DESCRIPTORS, COMPOSITION_SPECIES, compositionSum(), DEFAULT_COMPOSITION_BY_CATEGORY (+16 more)

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (18): FROZEN_BANDS_BY_SUBTYPE, PAC_FACTORS, POD_FACTORS, TARGET_FROZEN_WATER_PCT_BY_SUBTYPE, evaluateFrozen(), inferFrozenRecipeSubtype(), calculateLactosePct(), calculateMSNF() (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (27): firebase-functions, firebase-functions-test, dependencies, firebase-admin, firebase-functions, @google/genai, devDependencies, firebase-functions-test (+19 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (17): candidateKey(), SourcingPanel(), SourcingPanelProps, useKeptSourcingNotes(), useRestaurantSettings(), callGeminiGenerate, GeminiGenerateRequest, GeminiGenerateResponse (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.19
Nodes (19): assessCurdleRisk(), assessEthanol(), LONG_SHELF_ETHANOL_BAND, EvalInput, evaluateConfectionery(), inferConfectionerySubtype(), N(), ChocolateClass (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.19
Nodes (18): getActionIcon(), RecipeEditor(), Action, getConfidenceStyle(), getFieldMeta(), getIngredientMinConfidence(), getProvenanceStyle(), hydrateTranslationsFromLegacy() (+10 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (22): ./*, DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators (+14 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (19): Dashboard, Expenses, Formulate, IngredientDetail, Ingredients, Inventory, InventoryTransactions, PrepList (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (17): ADDITIONS, AGENTS, CULTURES, defaultParams(), ENZYMES, Field, fmt(), OP_BY_ID (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (7): collectFaults(), Fault, FaultDomain, FaultSeverity, SEVERITY_RANK, Source, SOURCES

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (13): getGeminiModel(), GEMINI_API_KEY, geminiGenerate, GeminiGenerateInput, callGemini(), GEMINI_API_KEY, Lang, LANGUAGE_NAMES (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.15
Nodes (14): DosingPanel(), DosingPanelProps, TASTES, DosingAddition, DosingFlag, DosingGoal, DosingOptions, DosingPoint (+6 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (14): RoleBadge(), RoleBadgeProps, CATEGORY_FALLBACK, getRoleSwapSet(), has(), hasNot(), InferenceRule, inferRole() (+6 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (19): scripts, build, check:functions-secrets, check:hardcoded-strings, check:locale-parity, check:schema, clean, dev (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (15): DisplayWarning, RecipeWarningsList(), RecipeWarningsListProps, Severity, PhysicsWarning, BreadWarning, ConfectioneryWarning, FrozenBand (+7 more)

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (14): classify(), computeChocolateSnap(), computePolymorphWindow(), detectMixedChocolateClasses(), lookupWindow(), polymorphWindowForCocoa(), SNAP_FAT_BLEND_BY_CLASS, TEMPER_TABLE (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (14): add(), brine(), dehydrate(), DehydrateFlag, DehydrateParams, Enzyme, ferment(), rossoGamma() (+6 more)

### Community 28 - "Community 28"
Cohesion: 0.16
Nodes (12): OpDef, aerate(), AerateFlag, AerateParams, caramelize(), CaramelizeParams, SUGAR_ONSET, chill() (+4 more)

### Community 29 - "Community 29"
Cohesion: 0.21
Nodes (13): TranslateRecipeModal(), TranslateRecipeModalProps, completed, hasMissingTranslations(), inFlight, useAutoTranslate(), applyTranslationProposal(), collectTasks() (+5 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (12): aliases, COLLECTION_MAP, __dirname, repoRoot, report, RULES_ONLY_ALLOWED, rulesPath, rulesText (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.19
Nodes (14): freeze(), FreezeFlag, FreezeParams, MassDiffusionInput, computePlankTime(), PlankFlag, PlankInput, PlankMode (+6 more)

### Community 32 - "Community 32"
Cohesion: 0.18
Nodes (13): TransportPanel(), deriveWarnings(), useRecipePhysics(), cryptoRandomId(), scoreCandidate(), classifyAwBand(), classifyFatRegime(), piecewiseAwToWeeks() (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.19
Nodes (14): AITC_EQ, band0to100(), beidler(), CAPSAICIN_EQ, carbonationBand(), ChemesthesisChannel, ChemesthesisFlag, chemesthesisFromComposition() (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.26
Nodes (13): alphaPolyprotic(), BUFFER_REFERENCES, BufferComponent, buildPhMixture(), calculateMixedPH(), calibrateCounterion(), collectBufferComponents(), computeTitratableAcidity() (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (15): @firebase/eslint-plugin-security-rules, devDependencies, @firebase/eslint-plugin-security-rules, @testing-library/react, @types/express, @types/papaparse, @types/react-dom, typescript (+7 more)

### Community 36 - "Community 36"
Cohesion: 0.24
Nodes (11): BILL_EXTRACTION_SCHEMA, extractBill, ExtractBillInput, ExtractBillResult, GEMINI_API_KEY, SUPPORTED_MIME_TYPES, finiteOrNull(), isAllowedStoragePath() (+3 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (14): compileOnSave, compilerOptions, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck, sourceMap (+6 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (13): RuntimeTranslationState, TranslationStatus, cacheKey(), Lang, memoryCache, pending, PendingItem, persistentCache (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.23
Nodes (13): compareNumbers(), DslContext, evaluateStepCondition(), formatNumeric(), readPhysicsMetric(), renderStepTemplate(), resolveSlot(), RISK_RANK (+5 more)

### Community 40 - "Community 40"
Cohesion: 0.31
Nodes (7): BrineFlag, PipelineResult, runPipeline(), StepLog, ALL_SPECIES, FoodState, makeFoodState()

### Community 41 - "Community 41"
Cohesion: 0.19
Nodes (12): setGel(), SetGelParams, SUGARS, CoFactor, cofactorMet(), computeGelation(), GEL_PROFILES, GelationContext (+4 more)

### Community 42 - "Community 42"
Cohesion: 0.34
Nodes (13): clamp(), computeHeatPenetration(), temperatureAtDepth(), besselJ0(), besselJ1(), coefficientC1(), eigenResidual(), firstEigenvalue() (+5 more)

### Community 43 - "Community 43"
Cohesion: 0.21
Nodes (8): dailyExpenseCheck, onBillReviewed, writeAnomalyAlert(), resolveAdminUserIds(), { getFirestoreMock, docMock, setMock, getMock, whereMock }, queueAdmins(), usersSnap(), { getFirestoreMock, collectionMock, docMock, setMock, getMock }

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (13): ai, callGeminiDetection(), db, detectionCache, detectLanguagesBatch(), __dirname, main(), migrateIngredients() (+5 more)

### Community 45 - "Community 45"
Cohesion: 0.24
Nodes (9): ActionIcon(), ActionIconProps, actionMap, FailureModeTrigger(), FailureModeTriggerProps, RecipeCostDrivers(), RecipeCostDriversProps, CHOCOLATE_WORK_ACTION_TYPES (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.25
Nodes (9): AlertsBell(), SEVERITY_DOT, dismissAlert(), Alert, AlertSeverity, AlertType, RecurringCadenceTolerance, alertCreatedMillis() (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (6): ErrorBoundary, Props, State, FirestoreOperationError, signInWithGoogle(), resources

### Community 48 - "Community 48"
Cohesion: 0.20
Nodes (11): LocalizedFieldProps, resolveLocalized(), ResolveResult, RuntimeTranslated(), RuntimeTranslatedProps, TranslationTabs(), TranslationTabsProps, useRuntimeTranslation() (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.22
Nodes (10): ConfectioneryEvaluation, detectHardConstraintViolation(), EvalContext, evaluateObjectives(), RISK_RANK, estimateTgPrime(), TG_PRIME_C, TgPrimeFlag (+2 more)

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (10): AddParams, emulsify(), EmulsifyParams, STABILITY_SCORE, computeEmulsion(), EmulsionFlag, EmulsionInput, EmulsionStability (+2 more)

### Community 51 - "Community 51"
Cohesion: 0.26
Nodes (9): Layout(), RequireAdmin(), RequireAdminProps, logOut(), signInAsGuest(), useAlerts(), UserRole, useUserRole() (+1 more)

### Community 52 - "Community 52"
Cohesion: 0.28
Nodes (10): ALLERGEN_LABELS, ALLERGEN_PATTERNS, AllergenCertainty, AllergenFlag, deriveAllergens(), identifyCrossContactRisks(), computeCrossContactRisks(), crossContactRisksEqual() (+2 more)

### Community 53 - "Community 53"
Cohesion: 0.23
Nodes (11): beidler(), clamp(), computeTasteProfile(), ORGANIC_ACID_EQ_WEIGHT, rawSourness(), RELATIVE_SWEETNESS, sucroseEquivalentPct(), TasteFlag (+3 more)

### Community 54 - "Community 54"
Cohesion: 0.32
Nodes (9): computeDryingRate(), DryingFlag, DryingRateInput, DryingRateResult, computePsychrometrics(), latentHeatVaporization(), PsychrometricInput, PsychrometricState (+1 more)

### Community 55 - "Community 55"
Cohesion: 0.38
Nodes (11): attachComponentLocalizedFields(), attachRecipeIngredientLocalizedFields(), attachRecipeLocalizedFields(), attachStepLocalizedFields(), attachSupplierLocalizedFields(), findById(), getLocalizedText(), isLocalizedString() (+3 more)

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (7): __dirname, enFiles, localesRoot, OTHER_LANGS, referenceFiles, repoRoot, report

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (10): EnzymeFlag, EnzymeParams, EnzymeProfile, ENZYMES, Culture, CultureProfile, CULTURES, FERMENTABLE (+2 more)

### Community 58 - "Community 58"
Cohesion: 0.24
Nodes (10): AIR, computeSurfaceCoefficient(), fluidAt(), FluidPoint, interp(), nusseltForced(), nusseltNatural(), OIL (+2 more)

### Community 60 - "Community 60"
Cohesion: 0.36
Nodes (7): jaccardSimilarity(), nameMatchScore(), normalizeVendorName(), tokenize(), runVendorResolution(), VendorMatchInput, VendorMatchResult

### Community 61 - "Community 61"
Cohesion: 0.18
Nodes (7): ATTR_RE, __dirname, findings, IGNORED_PATHS, repoRoot, srcRoot, USER_FACING_ATTRS

### Community 62 - "Community 62"
Cohesion: 0.18
Nodes (8): DIFFUSANTS, FREEZE_ENV, FREEZE_ENVS, GEOMETRIES, METHODS, SURFACE_BY_METHOD, TransportPanelProps, CookingMethod

### Community 63 - "Community 63"
Cohesion: 0.22
Nodes (9): computeFormulaBalance(), FormulaBalanceFlag, FormulaBalanceMasses, FormulaBalanceRatios, FormulaFault, FormulaFaultKind, FormulaFaultSeverity, balancedCake() (+1 more)

### Community 64 - "Community 64"
Cohesion: 0.25
Nodes (9): HeatPenetrationFlag, HeatPenetrationInput, HeatPenetrationResult, METHOD_H, meat, ConvectionRegime, Medium, SurfaceCoefficientResult (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.31
Nodes (6): BillStatus, PaymentMethod, recordPayment, RecordPaymentInput, RecordPaymentResult, { getFirestoreMock, runTransactionMock, collectionMock }

### Community 66 - "Community 66"
Cohesion: 0.24
Nodes (8): Component, componentMasses(), computeThermalProperties(), CP, ICE, K, Quad, RHO

### Community 67 - "Community 67"
Cohesion: 0.31
Nodes (5): onLotUpdate, shouldArchiveLot(), resolveVendor, ResolveVendorInput, translateBatch

### Community 68 - "Community 68"
Cohesion: 0.36
Nodes (5): computeShoppingListQuantity(), computeStockUpdate(), db, onTransactionCreate, computeWAC()

### Community 69 - "Community 69"
Cohesion: 0.28
Nodes (7): BrineParams, clamp01(), computeMassPenetration(), Diffusant, DIFFUSIVITY, MassDiffusionFlag, MassDiffusionResult

### Community 70 - "Community 70"
Cohesion: 0.28
Nodes (7): AromaBand, AromaReleaseClass, AromaReleaseFlag, classifyBand(), computeAromaRelease(), POLARITY_ANCHORS, VolatilePolarity

### Community 71 - "Community 71"
Cohesion: 0.31
Nodes (6): BLISS, BlissTaste, clamp(), computePalatability(), invertedU(), PalatabilityFlag

### Community 72 - "Community 72"
Cohesion: 0.33
Nodes (7): classifyRisk(), computeSucroseCrystallization(), CrystallizationFlag, CrystallizationResult, GrainingRisk, SUCROSE_SOLUBILITY, sucroseSolubilityAt()

### Community 73 - "Community 73"
Cohesion: 0.28
Nodes (7): clamp01(), computeProteinSet(), PROTEIN_PROFILES, ProteinProfile, ProteinSetBand, ProteinSetResult, ProteinType

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (7): date-fns, i18next-browser-languagedetector, dependencies, date-fns, i18next-browser-languagedetector, react-to-print, react-to-print

### Community 75 - "Community 75"
Cohesion: 0.43
Nodes (5): classifyBand(), computeFoam(), FoamBand, FoamFlag, saturating()

### Community 76 - "Community 76"
Cohesion: 0.38
Nodes (5): classifyConsistency(), computeRheology(), ConsistencyBand, FlowType, RheologyFlag

### Community 77 - "Community 77"
Cohesion: 0.33
Nodes (5): Measurability, Predictability, QUALITY_DIMENSIONS, QualityDimension, ScopeCategory

### Community 78 - "Community 78"
Cohesion: 0.80
Nodes (4): nextNOccurrences(), nextOccurrence(), parseRRule(), previousOccurrence()

### Community 79 - "Community 79"
Cohesion: 0.40
Nodes (4): AW_BANDS_FOR_TABLE, faultColor(), RecipePhysicsDetail(), RecipePhysicsDetailProps

### Community 80 - "Community 80"
Cohesion: 0.47
Nodes (4): seedBill(), seedNote(), validBill(), validNote()

### Community 81 - "Community 81"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 82 - "Community 82"
Cohesion: 0.50
Nodes (5): react, react, RecipeCookingMode(), RecipeDetail(), step()

### Community 83 - "Community 83"
Cohesion: 0.70
Nodes (4): run(), say(), harden-gcp.sh script, warn()

### Community 84 - "Community 84"
Cohesion: 0.50
Nodes (4): db, __dirname, migrate(), parseLegacyString()

### Community 85 - "Community 85"
Cohesion: 0.40
Nodes (4): CLASSIC_GANACHE, DARK_70, HEAVY_CREAM, RASPBERRY_PUREE

### Community 86 - "Community 86"
Cohesion: 0.60
Nodes (4): analyzeRecipe(), dominantProvenance(), ProvenanceHealth, RecipeAudit()

### Community 87 - "Community 87"
Cohesion: 0.50
Nodes (3): FunctionalAgent, PATTERNS, resolveFunctionalAgent()

### Community 89 - "Community 89"
Cohesion: 0.67
Nodes (3): heat(), HeatParams, REDUCING_SUGARS

## Knowledge Gaps
- **470 isolated node(s):** `name`, `build`, `test`, `serve`, `shell` (+465 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 74` to `Community 81`, `Community 82`, `Community 92`, `Community 93`, `Community 94`, `Community 97`, `Community 99`, `Community 100`, `Community 101`, `Community 102`, `Community 103`, `Community 104`, `Community 105`, `Community 106`, `Community 107`, `Community 108`, `Community 109`, `Community 110`, `Community 111`, `Community 112`, `Community 113`, `Community 114`, `Community 115`, `Community 116`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `react` connect `Community 82` to `Community 0`, `Community 74`, `Community 86`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `RecipeDetail()` connect `Community 82` to `Community 0`, `Community 32`, `Community 1`, `Community 5`, `Community 39`, `Community 45`, `Community 14`, `Community 52`, `Community 55`, `Community 29`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **What connects `name`, `build`, `test` to the rest of the system?**
  _471 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05018477457501848 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0504950495049505 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06317907444668008 - nodes in this community are weakly interconnected._