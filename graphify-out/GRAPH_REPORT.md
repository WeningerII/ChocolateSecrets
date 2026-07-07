# Graph Report - .  (2026-07-07)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1767 nodes · 4801 edges · 100 communities (94 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b855fe43`
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
- Community 92

## God Nodes (most connected - your core abstractions)
1. `Ingredient` - 91 edges
2. `Recipe` - 63 edges
3. `useToast()` - 53 edges
4. `Composition` - 49 edges
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
- None detected.

## Communities (100 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (68): dependencies, firebase-admin, firebase-functions, @google/genai, rrule, BillPaymentHistory(), BillPaymentHistoryProps, BillReview() (+60 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (58): CandidateCard(), CandidateCardProps, SearchSpaceList(), SearchSpaceListProps, Status, useFormulationOptimizer(), UseFormulationOptimizerReturn, DEFAULT_OBJECTIVES (+50 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (44): BatchImportReview(), BatchImportReviewProps, NewIngredientDraft, VisualAuditModal(), ACTION_TYPES, CANONICAL_UNITS, COMPONENT_TYPES, INGREDIENT_CATEGORIES (+36 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (39): CompositionEditor(), CompositionEditorProps, DosingPanel(), DosingPanelProps, TASTES, DosingAddition, DosingFlag, DosingGoal (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (39): FailureModeSheet(), FailureModeSheetProps, ChocolateContent(), formatRange(), IngredientInfo(), IngredientInfoProps, ALLERGEN_LABELS, ALLERGEN_PATTERNS (+31 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (37): PipelinePanelProps, calculateBakersPct(), flourSubtype(), isFlour(), isSalt(), isWater(), N(), yeastForm() (+29 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (34): Dashboard(), RecipeComponent, UnitConversionWarning, bonbonRecipe, fixtureIngredients, fixtureRecipes, subRecipeGanache, subRecipeTemperedDark (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (33): assessCurdleRisk(), assessEthanol(), LONG_SHELF_ETHANOL_BAND, EvalInput, evaluateConfectionery(), classify(), computeChocolateSnap(), computePolymorphWindow() (+25 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (27): FROZEN_BANDS_BY_SUBTYPE, PAC_FACTORS, POD_FACTORS, TARGET_FROZEN_WATER_PCT_BY_SUBTYPE, evaluateFrozen(), inferFrozenRecipeSubtype(), calculateLactosePct(), calculateMSNF() (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (25): Dashboard, Expenses, Formulate, IngredientDetail, Ingredients, Inventory, InventoryTransactions, PrepList (+17 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (23): AuditsViewProps, ConfirmModalProps, PurchaseOrderModal(), PurchaseOrderModalProps, ReceiveGoodsModalProps, ReceivePOModal(), ReceivePOModalProps, TransfersViewProps (+15 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (21): add(), brine(), BrineFlag, dehydrate(), DehydrateFlag, DehydrateParams, Enzyme, ferment() (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (24): emulsify(), EmulsifyParams, STABILITY_SCORE, setGel(), SetGelParams, SUGARS, temper(), TemperParams (+16 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (23): deriveWarnings(), CLASSIC_GANACHE, DARK_70, HEAVY_CREAM, RASPBERRY_PUREE, useRecipePhysics(), DiagnosticsResult, resolveFunctionalAgent() (+15 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (29): RecipeCategoryPicker(), RecipeCategoryPickerProps, AlertType, Audit, AuditItem, BillAllocation, BillLineItem, BillPaymentInstruction (+21 more)

### Community 15 - "Community 15"
Cohesion: 0.14
Nodes (20): BarcodeScannerModal(), Props, Props, ReceiptImportModal(), db, useRestaurantSettings(), Recipes(), ALL_ALLERGEN_KEYS (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (20): EvalInput, PIECEWISE_AW_TO_WEEKS, ShelfLifeInputs, FREEZING_SOLUTES, FreezingFlag, FreezingResult, calculateNorrishAw(), MOLECULAR_WEIGHTS (+12 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (18): EditorFrozenStrip(), EditorFrozenStripProps, EditorPhysicsRibbon(), EditorPhysicsRibbonProps, RecipeCostDrivers(), RecipeCostDriversProps, RecipeFrozenTier(), RecipeFrozenTierProps (+10 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (13): collectFaults(), DiagnosticsInput, Fault, FaultDomain, FaultSeverity, SEVERITY_RANK, Source, SOURCES (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (19): RuntimeTranslatedProps, TranslateRecipeModal(), TranslateRecipeModalProps, TranslationTabs(), TranslationTabsProps, completed, hasMissingTranslations(), inFlight (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (20): accumulateThermalExtent(), arrheniusRate(), zValueRate(), awSuitability(), classifyBand(), computeMaillardBrowning(), MaillardBand, MaillardFlag (+12 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (24): dependencies, date-fns, express, firebase, @google/genai, i18next, i18next-browser-languagedetector, lucide-react (+16 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (15): AdjustStockModal(), AdjustStockModalProps, Combobox(), ComboboxProps, TransferStockModal(), TransferStockModalProps, Props, PrepList() (+7 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (18): Action, getActionIcon(), getConfidenceStyle(), getFieldMeta(), getIngredientMinConfidence(), getProvenanceStyle(), hydrateTranslationsFromLegacy(), RecipeEditor() (+10 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (16): freeze(), FreezeFlag, FreezeParams, computePlankTime(), PlankFlag, PlankInput, PlankMode, PlankResult (+8 more)

### Community 25 - "Community 25"
Cohesion: 0.23
Nodes (13): AuditsView(), BillsList(), useData(), SupportedLanguage, useLanguage(), InventoryTransactions(), Reports(), Suppliers() (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (16): RoleBadge(), RoleBadgeProps, CATEGORY_FALLBACK, getRoleSwapSet(), has(), hasNot(), InferenceRule, inferRole() (+8 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (16): ADDITIONS, AGENTS, CULTURES, defaultParams(), ENZYMES, Field, fmt(), OP_BY_ID (+8 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (13): getGeminiModel(), GEMINI_API_KEY, geminiGenerate, GeminiGenerateInput, callGemini(), GEMINI_API_KEY, Lang, LANGUAGE_NAMES (+5 more)

### Community 29 - "Community 29"
Cohesion: 0.19
Nodes (13): Layout(), RequireAdmin(), RequireAdminProps, app, FirestoreErrorInfo, logOut(), reportFirestoreError(), signInAsGuest() (+5 more)

### Community 30 - "Community 30"
Cohesion: 0.28
Nodes (11): ReceiveGoodsModal(), IngredientDetail(), Ingredients(), formatFirestoreDate(), deriveIngredientDietaryFlags(), SafeBatch, sanitizeData(), withTimestamps() (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (13): REF_BATTER, refProfile, classifyBand(), computeMoistureMigration(), MoistureBand, MoistureFlag, MoistureMigrationResult, longStorage (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (12): CsvImportModal(), CsvImportModalProps, TransfersView(), Toast, ToastContext, ToastContextValue, ToastProvider(), ToastVariant (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (17): devDependencies, firebase-functions-test, typescript, vitest, engines, node, main, name (+9 more)

### Community 35 - "Community 35"
Cohesion: 0.20
Nodes (12): dompurify, candidateKey(), SourcingPanel(), SourcingPanelProps, useKeptSourcingNotes(), buildCandidate(), keepNote(), parseGeminiJson() (+4 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (18): scripts, build, check:functions-secrets, check:hardcoded-strings, check:locale-parity, check:schema, clean, dev (+10 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (17): devDependencies, firebase-admin, @firebase/eslint-plugin-security-rules, @firebase/rules-unit-testing, jsdom, @playwright/test, tailwindcss, @testing-library/react (+9 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (11): aliases, COLLECTION_MAP, __dirname, repoRoot, report, RULES_ONLY_ALLOWED, rulesPath, rulesText (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.19
Nodes (14): AITC_EQ, band0to100(), beidler(), CAPSAICIN_EQ, carbonationBand(), ChemesthesisChannel, ChemesthesisFlag, chemesthesisFromComposition() (+6 more)

### Community 40 - "Community 40"
Cohesion: 0.26
Nodes (13): alphaPolyprotic(), BUFFER_REFERENCES, BufferComponent, buildPhMixture(), calculateMixedPH(), calibrateCounterion(), collectBufferComponents(), computeTitratableAcidity() (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.24
Nodes (11): BILL_EXTRACTION_SCHEMA, extractBill, ExtractBillInput, ExtractBillResult, GEMINI_API_KEY, SUPPORTED_MIME_TYPES, finiteOrNull(), isAllowedStoragePath() (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.17
Nodes (13): RuntimeTranslationState, TranslationStatus, cacheKey(), Lang, memoryCache, pending, PendingItem, persistentCache (+5 more)

### Community 43 - "Community 43"
Cohesion: 0.16
Nodes (13): AddParams, EnzymeFlag, EnzymeParams, EnzymeProfile, ENZYMES, Culture, CultureProfile, CULTURES (+5 more)

### Community 44 - "Community 44"
Cohesion: 0.21
Nodes (8): dailyExpenseCheck, onBillReviewed, writeAnomalyAlert(), resolveAdminUserIds(), { getFirestoreMock, docMock, setMock, getMock, whereMock }, queueAdmins(), usersSnap(), { getFirestoreMock, collectionMock, docMock, setMock, getMock }

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (13): ai, callGeminiDetection(), db, detectionCache, detectLanguagesBatch(), __dirname, main(), migrateIngredients() (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (10): OpDef, caramelize(), CaramelizeParams, SUGAR_ONSET, chill(), ChillParams, heat(), HeatParams (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.23
Nodes (12): clamp(), computeHeatPenetration(), HeatPenetrationFlag, HeatPenetrationInput, HeatPenetrationResult, METHOD_H, temperatureAtDepth(), meat (+4 more)

### Community 48 - "Community 48"
Cohesion: 0.36
Nodes (12): attachComponentLocalizedFields(), attachIngredientLocalizedFields(), attachRecipeIngredientLocalizedFields(), attachRecipeLocalizedFields(), attachStepLocalizedFields(), attachSupplierLocalizedFields(), findById(), getLocalizedText() (+4 more)

### Community 49 - "Community 49"
Cohesion: 0.15
Nodes (12): compileOnSave, compilerOptions, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck, sourceMap (+4 more)

### Community 50 - "Community 50"
Cohesion: 0.21
Nodes (10): react, ActionIcon(), ActionIconProps, actionMap, FailureModeTrigger(), FailureModeTriggerProps, RecipeCookingMode(), RecipeDetail() (+2 more)

### Community 51 - "Community 51"
Cohesion: 0.26
Nodes (11): compareNumbers(), evaluateStepCondition(), formatNumeric(), readPhysicsMetric(), renderStepTemplate(), resolveSlot(), RISK_RANK, ctx (+3 more)

### Community 52 - "Community 52"
Cohesion: 0.23
Nodes (11): beidler(), clamp(), computeTasteProfile(), ORGANIC_ACID_EQ_WEIGHT, rawSourness(), RELATIVE_SWEETNESS, sucroseEquivalentPct(), TasteFlag (+3 more)

### Community 53 - "Community 53"
Cohesion: 0.17
Nodes (7): __dirname, enFiles, localesRoot, OTHER_LANGS, referenceFiles, repoRoot, report

### Community 54 - "Community 54"
Cohesion: 0.23
Nodes (9): aerate(), AerateFlag, AerateParams, classifyBand(), computeFoam(), FoamBand, FoamFlag, FoamResult (+1 more)

### Community 55 - "Community 55"
Cohesion: 0.23
Nodes (10): BrineParams, clamp01(), computeMassPenetration(), Diffusant, DIFFUSIVITY, MassDiffusionFlag, MassDiffusionInput, MassDiffusionResult (+2 more)

### Community 56 - "Community 56"
Cohesion: 0.26
Nodes (10): classifyBand(), computeDoneness(), DonenessBand, DonenessFlag, DonenessInput, estimateConductivity(), estimateSpecificHeat(), CANDY (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.35
Nodes (9): computeDryingRate(), DryingFlag, DryingRateInput, DryingRateResult, computePsychrometrics(), latentHeatVaporization(), PsychrometricInput, PsychrometricState (+1 more)

### Community 58 - "Community 58"
Cohesion: 0.24
Nodes (10): AIR, computeSurfaceCoefficient(), fluidAt(), FluidPoint, interp(), nusseltForced(), nusseltNatural(), OIL (+2 more)

### Community 59 - "Community 59"
Cohesion: 0.42
Nodes (10): besselJ0(), besselJ1(), coefficientC1(), eigenResidual(), firstEigenvalue(), fourierForCenterTheta(), LAMBDA_INF, positionShape() (+2 more)

### Community 61 - "Community 61"
Cohesion: 0.36
Nodes (7): jaccardSimilarity(), nameMatchScore(), normalizeVendorName(), tokenize(), runVendorResolution(), VendorMatchInput, VendorMatchResult

### Community 62 - "Community 62"
Cohesion: 0.18
Nodes (7): ATTR_RE, __dirname, findings, IGNORED_PATHS, repoRoot, srcRoot, USER_FACING_ATTRS

### Community 63 - "Community 63"
Cohesion: 0.35
Nodes (7): AlertsBell(), SEVERITY_DOT, dismissAlert(), Alert, AlertSeverity, alertCreatedMillis(), selectActiveAlerts()

### Community 64 - "Community 64"
Cohesion: 0.18
Nodes (8): DIFFUSANTS, FREEZE_ENV, FREEZE_ENVS, GEOMETRIES, METHODS, SURFACE_BY_METHOD, TransportPanelProps, CookingMethod

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (9): TransportPanel(), Component, componentMasses(), computeThermalProperties(), CP, ICE, K, Quad (+1 more)

### Community 66 - "Community 66"
Cohesion: 0.25
Nodes (8): BLISS, BlissTaste, clamp(), computePalatability(), invertedU(), PalatabilityFlag, PalatabilityResult, TasteProfile

### Community 67 - "Community 67"
Cohesion: 0.22
Nodes (9): computeFormulaBalance(), FormulaBalanceFlag, FormulaBalanceMasses, FormulaBalanceRatios, FormulaFault, FormulaFaultKind, FormulaFaultSeverity, balancedCake() (+1 more)

### Community 68 - "Community 68"
Cohesion: 0.31
Nodes (6): BillStatus, PaymentMethod, recordPayment, RecordPaymentInput, RecordPaymentResult, { getFirestoreMock, runTransactionMock, collectionMock }

### Community 69 - "Community 69"
Cohesion: 0.24
Nodes (8): AromaBand, AromaReleaseClass, AromaReleaseFlag, AromaReleaseResult, classifyBand(), computeAromaRelease(), POLARITY_ANCHORS, VolatilePolarity

### Community 70 - "Community 70"
Cohesion: 0.31
Nodes (5): onLotUpdate, shouldArchiveLot(), resolveVendor, ResolveVendorInput, translateBatch

### Community 71 - "Community 71"
Cohesion: 0.36
Nodes (5): computeShoppingListQuantity(), computeStockUpdate(), db, onTransactionCreate, computeWAC()

### Community 72 - "Community 72"
Cohesion: 0.28
Nodes (5): EditorBreadStrip(), EditorBreadStripProps, RecipeBreadTier(), RecipeBreadTierProps, BreadEvaluation

### Community 73 - "Community 73"
Cohesion: 0.36
Nodes (7): LocalizedField(), LocalizedFieldProps, resolveLocalized(), ResolveResult, RuntimeTranslated(), useRuntimeTranslation(), LocalizedString

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
Cohesion: 0.43
Nodes (6): DisplayWarning, RecipeWarningsListProps, Severity, PhysicsWarning, ConfectioneryWarning, FrozenWarning

### Community 78 - "Community 78"
Cohesion: 0.80
Nodes (4): nextNOccurrences(), nextOccurrence(), parseRRule(), previousOccurrence()

### Community 79 - "Community 79"
Cohesion: 0.40
Nodes (4): locales, localizer, ProductionCalendarProps, ProductionRun

### Community 80 - "Community 80"
Cohesion: 0.47
Nodes (4): estimateTgPrime(), TG_PRIME_C, TgPrimeFlag, TgPrimeResult

### Community 81 - "Community 81"
Cohesion: 0.53
Nodes (4): blendSfcAtTemp(), FAT_MELTING_PROFILES, FatProfileKey, sfcAtTemp()

### Community 82 - "Community 82"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 83 - "Community 83"
Cohesion: 0.70
Nodes (4): run(), say(), harden-gcp.sh script, warn()

### Community 84 - "Community 84"
Cohesion: 0.50
Nodes (4): db, __dirname, migrate(), parseLegacyString()

## Knowledge Gaps
- **464 isolated node(s):** `name`, `build`, `test`, `serve`, `shell` (+459 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 21` to `Community 0`, `Community 82`, `Community 35`, `Community 50`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `react` connect `Community 50` to `Community 0`, `Community 21`, `Community 15`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `RecipeDetail()` connect `Community 50` to `Community 32`, `Community 4`, `Community 6`, `Community 13`, `Community 14`, `Community 15`, `Community 48`, `Community 17`, `Community 19`, `Community 51`, `Community 25`, `Community 30`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `name`, `build`, `test` to the rest of the system?**
  _465 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05002337540906966 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06015037593984962 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0784313725490196 - nodes in this community are weakly interconnected._