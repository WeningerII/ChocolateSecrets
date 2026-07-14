# Graph Report - .  (2026-07-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1919 nodes · 5163 edges · 108 communities (94 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `782288fd`
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
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 100

## God Nodes (most connected - your core abstractions)
1. `Ingredient` - 105 edges
2. `Recipe` - 89 edges
3. `useToast()` - 53 edges
4. `Composition` - 51 edges
5. `RecipePhysics` - 43 edges
6. `db` - 42 edges
7. `ResolvedIngredient` - 40 edges
8. `useData()` - 39 edges
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

## Communities (108 total, 14 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (63): BillPaymentHistoryProps, BillReview(), BillReviewProps, BillsListProps, BillUpload(), BillUploadProps, PaymentForm(), PaymentFormProps (+55 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (48): CompositionEditor(), DosingPanel(), DosingPanelProps, TASTES, DosingAddition, DosingFlag, DosingGoal, DosingOptions (+40 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (42): CandidateCard(), CandidateCardProps, Status, useFormulationOptimizer(), UseFormulationOptimizerReturn, DEFAULT_OBJECTIVES, Formulate(), TEXTURE_OBJECTIVES (+34 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (41): classifyBand(), computeDoneness(), DonenessBand, DonenessFlag, DonenessInput, estimateConductivity(), estimateSpecificHeat(), CANDY (+33 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (31): EditorPhysicsRibbon(), EditorPhysicsRibbonProps, RecipeFrozenTier(), RecipeFrozenTierProps, RecipePhysicsTier(), RecipePhysicsTierProps, RecipePhysics, collectFaults() (+23 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (36): DisplayWarning, RecipeWarningsList(), RecipeWarningsListProps, Severity, PhysicsWarning, BreadWarning, ConfectioneryWarning, FROZEN_BANDS_BY_SUBTYPE (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (36): EditorBreadStrip(), EditorBreadStripProps, RecipeBreadTier(), RecipeBreadTierProps, calculateBakersPct(), flourSubtype(), isFlour(), isSalt() (+28 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (47): date-fns, dompurify, express, firebase, i18next, i18next-browser-languagedetector, lucide-react, motion (+39 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (32): RuntimeTranslated(), RuntimeTranslationState, TranslationStatus, useRuntimeTranslation(), __dirname, dynamicFindings, dynamicPrefixSet, Finding (+24 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (39): BatchImportReview(), BatchImportReviewProps, NewIngredientDraft, Props, VisualAuditModal(), ACTION_TYPES, CANONICAL_UNITS, COMPONENT_TYPES (+31 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (29): ComponentsTabProps, DesignTabProps, OverviewTabProps, Action, AllergenFlag, DesignLayer, EnrobingSpec, BillProvenance (+21 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (22): AdjustStockModalProps, Combobox(), ComboboxProps, ReceiveGoodsModal(), TransferStockModal(), TransferStockModalProps, app, auth (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (24): AdjustStockModal(), AuditsView(), AuditsViewProps, TransfersView(), TransfersViewProps, DataContext, DataProvider(), useData() (+16 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (22): RoleBadge(), RoleBadgeProps, RankInput, CATEGORY_FALLBACK, getRoleSwapSet(), has(), hasNot(), InferenceRule (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (26): assessCurdleRisk(), assessEthanol(), LONG_SHELF_ETHANOL_BAND, evaluateConfectionery(), classify(), computeChocolateSnap(), computePolymorphWindow(), detectMixedChocolateClasses() (+18 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (21): calculateMSNF(), calculateTotalSolidsPct(), isDairyDerived(), PIECEWISE_AW_TO_WEEKS, piecewiseAwToWeeks(), predictShelfLife(), ShelfLifeInputs, FREEZING_SOLUTES (+13 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (23): FailureModeSheet(), FailureModeSheetProps, ChocolateContent(), formatRange(), IngredientInfo(), IngredientInfoProps, CHOCOLATE_CATALOG, CHOCOLATE_FAILURE_MODES (+15 more)

### Community 17 - "Community 17"
Cohesion: 0.16
Nodes (28): locales, localizer, ProductionCalendarProps, Dashboard(), PrepList(), ShoppingItem, ProductionRun, bonbonRecipe (+20 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (23): react, react, ActionIcon(), ActionIconProps, actionMap, ConfirmModalProps, FailureModeTrigger(), FailureModeTriggerProps (+15 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (26): CompositionEditorProps, add(), AddParams, brine(), dehydrate(), Enzyme, EnzymeFlag, EnzymeParams (+18 more)

### Community 20 - "Community 20"
Cohesion: 0.06
Nodes (31): firebase-functions, firebase-functions-test, dependencies, firebase-admin, firebase-functions, @google/genai, resend, twilio (+23 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (21): BillPaymentHistory(), BillsList(), PaymentsList(), ReceivePOModal(), RecipeCostDrivers(), RecipeCostDriversProps, Toast, ToastContext (+13 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (24): EditorFrozenStrip(), EditorFrozenStripProps, RecipeCategoryPicker(), RecipeCategoryPickerProps, ComponentsTab(), ConfidenceDot(), getActionIcon(), ProvenanceBadge() (+16 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (22): setGel(), SetGelParams, SUGARS, temper(), TemperParams, FunctionalAgent, PATTERNS, resolveFunctionalAgent() (+14 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (22): SearchSpaceList(), SearchSpaceListProps, Props, RecipeEditorProps, RecipeOutputStrip(), RecipeOutputStripProps, CLASSIC_GANACHE, DARK_70 (+14 more)

### Community 25 - "Community 25"
Cohesion: 0.13
Nodes (18): OpDef, aerate(), AerateFlag, AerateParams, caramelize(), CaramelizeParams, SUGAR_ONSET, chill() (+10 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (21): ADR-0005, ChannelResult, CHEF_EMAIL, CHEF_PHONE_NUMBER, RESEND_API_KEY, RESEND_FROM, SendShoppingListResult, ADR-0006 (+13 more)

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (18): LocalizedFieldProps, RuntimeTranslatedProps, TranslateRecipeModal(), TranslateRecipeModalProps, completed, hasMissingTranslations(), inFlight, useAutoTranslate() (+10 more)

### Community 28 - "Community 28"
Cohesion: 0.15
Nodes (16): candidateKey(), SourcingPanel(), SourcingPanelProps, useKeptSourcingNotes(), callGeminiGenerate, GeminiGenerateRequest, GeminiGenerateResponse, getGeminiClient() (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (22): ./*, DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators (+14 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (17): ADDITIONS, AGENTS, CULTURES, defaultParams(), ENZYMES, Field, fmt(), OP_BY_ID (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.18
Nodes (19): EvalInput, compareNumbers(), DslContext, evaluateStepCondition(), formatNumeric(), readPhysicsMetric(), renderStepTemplate(), resolveSlot() (+11 more)

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (19): Dashboard, Expenses, Formulate, IngredientDetail, Ingredients, Inventory, InventoryTransactions, PrepList (+11 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (13): getGeminiModel(), GEMINI_API_KEY, geminiGenerate, GeminiGenerateInput, callGemini(), GEMINI_API_KEY, Lang, LANGUAGE_NAMES (+5 more)

### Community 34 - "Community 34"
Cohesion: 0.17
Nodes (15): BarcodeScannerModal(), Props, PurchaseOrderModal(), PurchaseOrderModalProps, ReceiptImportModal(), ReceiveGoodsModalProps, ReceivePOModalProps, DataContextValue (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (13): ALL_ALLERGEN_KEYS, RestaurantSettings(), ALLERGEN_PATTERNS, AllergenCertainty, AllergenKey, identifyCrossContactRisks(), CrossContactRisk, recomputeAllCrossContactRisks() (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (10): onBillReviewed, writeAnomalyAlert(), resolveAdminUserIds(), ADR-0007, nextNOccurrences(), nextOccurrence(), parseRRule(), previousOccurrence() (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.11
Nodes (18): scripts, build, check:functions-secrets, check:hardcoded-strings, check:locale-parity, check:schema, clean, dev (+10 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (12): aliases, COLLECTION_MAP, __dirname, repoRoot, report, RULES_ONLY_ALLOWED, rulesPath, rulesText (+4 more)

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (11): deriveWarnings(), useRecipePhysics(), classifyConsistency(), computeRheology(), ConsistencyBand, FlowType, RheologyFlag, classifyAwBand() (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.19
Nodes (14): AITC_EQ, band0to100(), beidler(), CAPSAICIN_EQ, carbonationBand(), ChemesthesisChannel, ChemesthesisFlag, chemesthesisFromComposition() (+6 more)

### Community 41 - "Community 41"
Cohesion: 0.26
Nodes (13): alphaPolyprotic(), BUFFER_REFERENCES, BufferComponent, buildPhMixture(), calculateMixedPH(), calibrateCounterion(), collectBufferComponents(), computeTitratableAcidity() (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.13
Nodes (15): @firebase/eslint-plugin-security-rules, devDependencies, @firebase/eslint-plugin-security-rules, @testing-library/react, @types/express, @types/papaparse, @types/react-dom, typescript (+7 more)

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (14): compileOnSave, compilerOptions, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck, sourceMap (+6 more)

### Community 44 - "Community 44"
Cohesion: 0.23
Nodes (10): DesignTab(), RecipeEditor(), hydrateTranslationsFromLegacy(), recipeReducer(), inferEquipment(), mergeEquipment(), suggestEquipmentForStep(), VERB_EQUIPMENT_MAP (+2 more)

### Community 45 - "Community 45"
Cohesion: 0.33
Nodes (12): RecipeEditPage(), attachComponentLocalizedFields(), attachIngredientLocalizedFields(), attachRecipeIngredientLocalizedFields(), attachRecipeLocalizedFields(), attachStepLocalizedFields(), findById(), getLocalizedText() (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.19
Nodes (9): BrineFlag, BrineSolute, DehydrateFlag, DehydrateParams, freeze(), FreezeFlag, computePlankTime(), beef (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.26
Nodes (10): BILL_EXTRACTION_SCHEMA, ExtractBillInput, ExtractBillResult, GEMINI_API_KEY, SUPPORTED_MIME_TYPES, finiteOrNull(), isAllowedStoragePath(), parsePlausibleDate() (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.29
Nodes (13): ai, callGeminiDetection(), db, detectionCache, detectLanguagesBatch(), __dirname, main(), migrateIngredients() (+5 more)

### Community 49 - "Community 49"
Cohesion: 0.25
Nodes (9): AlertsBell(), SEVERITY_DOT, dismissAlert(), Alert, AlertSeverity, AlertType, RecurringCadenceTolerance, alertCreatedMillis() (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.15
Nodes (6): ErrorBoundary, Props, State, FirestoreOperationError, signInWithGoogle(), resources

### Community 51 - "Community 51"
Cohesion: 0.24
Nodes (9): Layout(), PageSpinner(), RequireAdmin(), RequireAdminProps, logOut(), signInAsGuest(), useAlerts(), useUserRole() (+1 more)

### Community 52 - "Community 52"
Cohesion: 0.15
Nodes (10): DIFFUSANTS, FREEZE_ENV, FREEZE_ENVS, GEOMETRIES, METHODS, SURFACE_BY_METHOD, TransportPanelProps, BrineParams (+2 more)

### Community 53 - "Community 53"
Cohesion: 0.23
Nodes (11): beidler(), clamp(), computeTasteProfile(), ORGANIC_ACID_EQ_WEIGHT, rawSourness(), RELATIVE_SWEETNESS, sucroseEquivalentPct(), TasteFlag (+3 more)

### Community 54 - "Community 54"
Cohesion: 0.23
Nodes (11): clamp(), computeHeatPenetration(), HeatPenetrationFlag, HeatPenetrationInput, HeatPenetrationResult, METHOD_H, meat, ConvectionRegime (+3 more)

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (11): temperatureAtDepth(), besselJ0(), besselJ1(), coefficientC1(), eigenResidual(), firstEigenvalue(), fourierForCenterTheta(), LAMBDA_INF (+3 more)

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (7): __dirname, enFiles, localesRoot, OTHER_LANGS, referenceFiles, repoRoot, report

### Community 57 - "Community 57"
Cohesion: 0.35
Nodes (9): computeDryingRate(), DryingFlag, DryingRateInput, DryingRateResult, computePsychrometrics(), latentHeatVaporization(), PsychrometricInput, PsychrometricState (+1 more)

### Community 58 - "Community 58"
Cohesion: 0.24
Nodes (10): AIR, computeSurfaceCoefficient(), fluidAt(), FluidPoint, interp(), nusseltForced(), nusseltNatural(), OIL (+2 more)

### Community 59 - "Community 59"
Cohesion: 0.24
Nodes (7): extractBill, onLotUpdate, shouldArchiveLot(), resolveVendor, ResolveVendorInput, sendShoppingList, translateBatch

### Community 60 - "Community 60"
Cohesion: 0.36
Nodes (7): jaccardSimilarity(), nameMatchScore(), normalizeVendorName(), tokenize(), runVendorResolution(), VendorMatchInput, VendorMatchResult

### Community 61 - "Community 61"
Cohesion: 0.18
Nodes (7): ATTR_RE, __dirname, findings, IGNORED_PATHS, repoRoot, srcRoot, USER_FACING_ATTRS

### Community 62 - "Community 62"
Cohesion: 0.24
Nodes (8): emulsify(), EmulsifyParams, STABILITY_SCORE, computeEmulsion(), EmulsionFlag, EmulsionInput, EmulsionStability, EmulsionType

### Community 63 - "Community 63"
Cohesion: 0.22
Nodes (9): computeFormulaBalance(), FormulaBalanceFlag, FormulaBalanceMasses, FormulaBalanceRatios, FormulaFault, FormulaFaultKind, FormulaFaultSeverity, balancedCake() (+1 more)

### Community 64 - "Community 64"
Cohesion: 0.31
Nodes (6): BillStatus, PaymentMethod, recordPayment, RecordPaymentInput, RecordPaymentResult, { getFirestoreMock, runTransactionMock, collectionMock }

### Community 65 - "Community 65"
Cohesion: 0.24
Nodes (8): Component, componentMasses(), computeThermalProperties(), CP, ICE, K, Quad, RHO

### Community 66 - "Community 66"
Cohesion: 0.22
Nodes (9): callSendShoppingList, ChannelResult, sendShoppingList(), SendShoppingListFailureReason, SendShoppingListOutcome, SendShoppingListRequest, SendShoppingListResult, ShoppingListItemPayload (+1 more)

### Community 67 - "Community 67"
Cohesion: 0.36
Nodes (5): computeShoppingListQuantity(), computeStockUpdate(), db, onTransactionCreate, computeWAC()

### Community 68 - "Community 68"
Cohesion: 0.28
Nodes (7): TransportPanel(), clamp01(), computeMassPenetration(), DIFFUSIVITY, MassDiffusionFlag, MassDiffusionInput, MassDiffusionResult

### Community 69 - "Community 69"
Cohesion: 0.28
Nodes (8): FreezeParams, PlankFlag, PlankInput, PlankMode, PlankResult, SHAPE_FACTORS, SurfaceCoefficientInput, Geometry

### Community 70 - "Community 70"
Cohesion: 0.28
Nodes (7): AromaBand, AromaReleaseClass, AromaReleaseFlag, classifyBand(), computeAromaRelease(), POLARITY_ANCHORS, VolatilePolarity

### Community 71 - "Community 71"
Cohesion: 0.31
Nodes (6): BLISS, BlissTaste, clamp(), computePalatability(), invertedU(), PalatabilityFlag

### Community 72 - "Community 72"
Cohesion: 0.28
Nodes (7): BOILING_SOLUTES, BoilingFlag, BoilingResult, CANDY_STAGES, CandyStage, classifyCandyStage(), computeBoilingPoint()

### Community 73 - "Community 73"
Cohesion: 0.33
Nodes (7): classifyRisk(), computeSucroseCrystallization(), CrystallizationFlag, CrystallizationResult, GrainingRisk, SUCROSE_SOLUBILITY, sucroseSolubilityAt()

### Community 74 - "Community 74"
Cohesion: 0.28
Nodes (7): clamp01(), computeProteinSet(), PROTEIN_PROFILES, ProteinProfile, ProteinSetBand, ProteinSetResult, ProteinType

### Community 75 - "Community 75"
Cohesion: 0.38
Nodes (5): dailyExpenseCheck, { getFirestoreMock, docMock, setMock, getMock, whereMock }, queueAdmins(), ADR-0007, usersSnap()

### Community 76 - "Community 76"
Cohesion: 0.43
Nodes (4): CsvImportModal(), CsvImportModalProps, ParsedNumber, parseLocaleNumber()

### Community 77 - "Community 77"
Cohesion: 0.43
Nodes (5): classifyBand(), computeFoam(), FoamBand, FoamFlag, saturating()

### Community 78 - "Community 78"
Cohesion: 0.40
Nodes (4): AW_BANDS_FOR_TABLE, faultColor(), RecipePhysicsDetail(), RecipePhysicsDetailProps

### Community 79 - "Community 79"
Cohesion: 0.53
Nodes (4): blendSfcAtTemp(), FAT_MELTING_PROFILES, FatProfileKey, sfcAtTemp()

### Community 80 - "Community 80"
Cohesion: 0.47
Nodes (4): seedBill(), seedNote(), validBill(), validNote()

### Community 81 - "Community 81"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 82 - "Community 82"
Cohesion: 0.70
Nodes (4): run(), say(), harden-gcp.sh script, warn()

### Community 83 - "Community 83"
Cohesion: 0.50
Nodes (4): db, __dirname, migrate(), parseLegacyString()

### Community 84 - "Community 84"
Cohesion: 0.60
Nodes (4): analyzeRecipe(), dominantProvenance(), ProvenanceHealth, RecipeAudit()

## Knowledge Gaps
- **506 isolated node(s):** `name`, `build`, `test`, `serve`, `shell` (+501 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 7` to `Community 81`, `Community 18`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `react` connect `Community 18` to `Community 34`, `Community 84`, `Community 7`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `RecipeDetail()` connect `Community 18` to `Community 39`, `Community 12`, `Community 13`, `Community 45`, `Community 17`, `Community 21`, `Community 27`, `Community 31`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **What connects `name`, `build`, `test` to the rest of the system?**
  _506 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05399625768511093 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.050724637681159424 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08350168350168351 - nodes in this community are weakly interconnected._