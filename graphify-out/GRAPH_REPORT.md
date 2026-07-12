# Graph Report - .  (2026-07-12)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1901 nodes · 5125 edges · 116 communities (87 shown, 29 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `648729fa`
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
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
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
- Community 108

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

## Communities (116 total, 29 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (55): DIFFUSANTS, FREEZE_ENV, FREEZE_ENVS, GEOMETRIES, METHODS, SURFACE_BY_METHOD, TransportPanelProps, clamp() (+47 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (43): RuntimeTranslated(), TranslateRecipeModal(), TranslateRecipeModalProps, completed, hasMissingTranslations(), inFlight, useAutoTranslate(), RuntimeTranslationState (+35 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (45): EditorBreadStrip(), EditorBreadStripProps, RecipeBreadTier(), RecipeBreadTierProps, DisplayWarning, RecipeWarningsList(), RecipeWarningsListProps, Severity (+37 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (39): FROZEN_BANDS_BY_SUBTYPE, PAC_FACTORS, POD_FACTORS, TARGET_FROZEN_WATER_PCT_BY_SUBTYPE, evaluateFrozen(), inferFrozenRecipeSubtype(), calculateLactosePct(), calculateMSNF() (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (42): CandidateCard(), SearchSpaceList(), SearchSpaceListProps, Status, useFormulationOptimizer(), UseFormulationOptimizerReturn, DEFAULT_OBJECTIVES, Formulate() (+34 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (41): classifyBand(), computeDoneness(), DonenessBand, DonenessFlag, DonenessInput, estimateConductivity(), estimateSpecificHeat(), CANDY (+33 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (31): EditorPhysicsRibbon(), EditorPhysicsRibbonProps, RecipeFrozenTier(), RecipeFrozenTierProps, RecipePhysicsTier(), RecipePhysicsTierProps, RecipePhysics, ConfectioneryEvaluation (+23 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (36): Dashboard(), UnitConversionWarning, bonbonRecipe, fixtureIngredients, fixtureRecipes, subRecipeGanache, subRecipeTemperedDark, ContributionReport (+28 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (33): react, react, ActionIcon(), ActionIconProps, actionMap, LocalizedField(), LocalizedFieldProps, resolveLocalized() (+25 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (31): assessCurdleRisk(), assessEthanol(), LONG_SHELF_ETHANOL_BAND, EvalInput, evaluateConfectionery(), classify(), computeChocolateSnap(), computePolymorphWindow() (+23 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (27): FailureModeSheet(), FailureModeSheetProps, FailureModeTrigger(), FailureModeTriggerProps, ChocolateContent(), formatRange(), IngredientInfo(), IngredientInfoProps (+19 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (28): CompositionEditor(), CompositionEditorProps, AW_BANDS_FOR_TABLE, faultColor(), RecipePhysicsDetail(), RecipePhysicsDetailProps, alcoholComposition(), chocolateComposition() (+20 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (30): TransportPanel(), deriveWarnings(), useRecipePhysics(), evaluate(), activeObjectives(), detectHardConstraintViolation(), evaluateObjectives(), RISK_RANK (+22 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (25): Dashboard, Expenses, Formulate, IngredientDetail, Ingredients, Inventory, InventoryTransactions, PrepList (+17 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (29): BatchImportReview(), BatchImportReviewProps, NewIngredientDraft, CANONICAL_UNITS, COMPONENT_TYPES, INGREDIENT_CATEGORIES, IngredientCategory, RECIPE_TYPES (+21 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (24): AdjustStockModalProps, AuditsViewProps, Combobox(), ComboboxProps, ReceiveGoodsModalProps, ReceivePOModal(), ReceivePOModalProps, TransferStockModal() (+16 more)

### Community 16 - "Community 16"
Cohesion: 0.20
Nodes (19): AdjustStockModal(), AuditsView(), ConfirmModalProps, TransfersView(), DataContext, DataProvider(), useData(), handleFirestoreError() (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (31): firebase-functions, firebase-functions-test, dependencies, firebase-admin, firebase-functions, @google/genai, resend, twilio (+23 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (23): add(), brine(), BrineFlag, BrineParams, BrineSolute, dehydrate(), DehydrateFlag, DehydrateParams (+15 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (22): setGel(), SetGelParams, SUGARS, temper(), TemperParams, FunctionalAgent, PATTERNS, resolveFunctionalAgent() (+14 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (20): OpDef, aerate(), AerateFlag, AerateParams, caramelize(), CaramelizeParams, SUGAR_ONSET, chill() (+12 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (22): ACTION_TYPES, ExtractedRecipeIngredient, AllergenFlag, CrossContactRisk, DietaryFlag, ChocolateSpec, DesignLayer, BillProvenance (+14 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (23): DosingPanel(), DosingPanelProps, TASTES, DosingAddition, DosingFlag, DosingGoal, DosingOptions, DosingPoint (+15 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (17): BillsList(), CsvImportModal(), CsvImportModalProps, Toast, ToastContext, ToastContextValue, ToastVariant, useToast() (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.14
Nodes (19): Layout(), RequireAdmin(), RequireAdminProps, app, auth, db, FirestoreErrorInfo, logOut() (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (16): classifyAwBand(), PIECEWISE_AW_TO_WEEKS, piecewiseAwToWeeks(), predictShelfLife(), ShelfLifeInputs, FREEZING_SOLUTES, FreezingFlag, FreezingResult (+8 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (20): BarcodeScannerModal(), Props, PurchaseOrderModal(), PurchaseOrderModalProps, Props, ReceiptImportModal(), Props, VisualAuditModal() (+12 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (14): locales, localizer, ProductionCalendarProps, ReceiveGoodsModal(), IngredientDetail(), Ingredients(), PrepList(), ShoppingItem (+6 more)

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (21): ADR-0005, ChannelResult, CHEF_EMAIL, CHEF_PHONE_NUMBER, RESEND_API_KEY, RESEND_FROM, SendShoppingListResult, ADR-0006 (+13 more)

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (11): CandidateCardProps, DesignTab(), DesignTabProps, baseRecipe, catalog, baseRecipe, catalog, OptimizerCandidate (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (18): EditorFrozenStrip(), EditorFrozenStripProps, ComponentsTab(), ComponentsTabProps, ConfidenceDot(), getActionIcon(), ProvenanceBadge(), OverviewTab() (+10 more)

### Community 31 - "Community 31"
Cohesion: 0.09
Nodes (22): ./*, DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators (+14 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (18): ADDITIONS, AGENTS, CULTURES, defaultParams(), ENZYMES, Field, fmt(), OP_BY_ID (+10 more)

### Community 33 - "Community 33"
Cohesion: 0.19
Nodes (13): CadencePreset, RecurringExpectationForm(), RecurringExpectationFormProps, RecurringExpectationsList(), RecurringExpectationsListProps, createRecurringExpectation(), listRecurringExpectations(), updateRecurringExpectation() (+5 more)

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (17): BLISS, BlissTaste, clamp(), computePalatability(), invertedU(), PalatabilityFlag, beidler(), clamp() (+9 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (21): date-fns, motion, dependencies, date-fns, @google/genai, motion, @phosphor-icons/react, react-big-calendar (+13 more)

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (15): RoleBadge(), RoleBadgeProps, CATEGORY_FALLBACK, getRoleSwapSet(), has(), hasNot(), InferenceRule, inferRole() (+7 more)

### Community 37 - "Community 37"
Cohesion: 0.20
Nodes (14): VendorForm(), VendorFormProps, VendorPickerProps, VendorSearchModal(), VendorSearchModalProps, VendorsList(), VendorsListProps, createVendor() (+6 more)

### Community 38 - "Community 38"
Cohesion: 0.13
Nodes (13): getGeminiModel(), GEMINI_API_KEY, geminiGenerate, GeminiGenerateInput, callGemini(), GEMINI_API_KEY, Lang, LANGUAGE_NAMES (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (16): BillPaymentHistory(), BillPaymentHistoryProps, PaymentForm(), PaymentFormProps, PaymentsList(), PAYMENT_METHODS, getBill(), getBillsByIds() (+8 more)

### Community 40 - "Community 40"
Cohesion: 0.18
Nodes (10): onBillReviewed, writeAnomalyAlert(), resolveAdminUserIds(), ADR-0007, nextNOccurrences(), nextOccurrence(), parseRRule(), previousOccurrence() (+2 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (18): scripts, build, check:functions-secrets, check:hardcoded-strings, check:locale-parity, check:schema, clean, dev (+10 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (12): aliases, COLLECTION_MAP, __dirname, repoRoot, report, RULES_ONLY_ALLOWED, rulesPath, rulesText (+4 more)

### Community 43 - "Community 43"
Cohesion: 0.26
Nodes (13): BillReview(), BillReviewProps, BillsListProps, BillUpload(), BillUploadProps, createBill(), extractBill(), ExtractedBillResult (+5 more)

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (12): RecipeEditor(), RecipeEditorProps, hydrateTranslationsFromLegacy(), recipeReducer(), identifyCrossContactRisks(), mergeEquipment(), suggestEquipmentForStep(), deriveRecipeDietaryFlags() (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.24
Nodes (11): candidateKey(), SourcingPanel(), SourcingPanelProps, useKeptSourcingNotes(), buildCandidate(), keepNote(), parseGeminiJson(), promoteNoteToSupplier() (+3 more)

### Community 46 - "Community 46"
Cohesion: 0.13
Nodes (13): functions, callGeminiGenerate, GeminiGenerateRequest, GeminiGenerateResponse, callSendShoppingList, ChannelResult, sendShoppingList(), SendShoppingListFailureReason (+5 more)

### Community 47 - "Community 47"
Cohesion: 0.22
Nodes (12): freeze(), FreezeFlag, FreezeParams, computePlankTime(), PlankFlag, PlankInput, PlankMode, PlankResult (+4 more)

### Community 48 - "Community 48"
Cohesion: 0.19
Nodes (14): AITC_EQ, band0to100(), beidler(), CAPSAICIN_EQ, carbonationBand(), ChemesthesisChannel, ChemesthesisFlag, chemesthesisFromComposition() (+6 more)

### Community 49 - "Community 49"
Cohesion: 0.13
Nodes (15): @firebase/eslint-plugin-security-rules, devDependencies, @firebase/eslint-plugin-security-rules, @testing-library/react, @types/express, @types/papaparse, @types/react-dom, typescript (+7 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (14): compileOnSave, compilerOptions, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck, sourceMap (+6 more)

### Community 51 - "Community 51"
Cohesion: 0.17
Nodes (12): AddParams, emulsify(), EmulsifyParams, STABILITY_SCORE, EnzymeProfile, CultureProfile, computeEmulsion(), EmulsionFlag (+4 more)

### Community 52 - "Community 52"
Cohesion: 0.26
Nodes (10): BILL_EXTRACTION_SCHEMA, ExtractBillInput, ExtractBillResult, GEMINI_API_KEY, SUPPORTED_MIME_TYPES, finiteOrNull(), isAllowedStoragePath(), parsePlausibleDate() (+2 more)

### Community 53 - "Community 53"
Cohesion: 0.29
Nodes (13): ai, callGeminiDetection(), db, detectionCache, detectLanguagesBatch(), __dirname, main(), migrateIngredients() (+5 more)

### Community 54 - "Community 54"
Cohesion: 0.25
Nodes (9): AlertsBell(), SEVERITY_DOT, dismissAlert(), Alert, AlertSeverity, AlertType, RecurringCadenceTolerance, alertCreatedMillis() (+1 more)

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (12): compareNumbers(), DslContext, evaluateStepCondition(), formatNumeric(), readPhysicsMetric(), renderStepTemplate(), resolveSlot(), RISK_RANK (+4 more)

### Community 56 - "Community 56"
Cohesion: 0.19
Nodes (10): RecipeCategoryPicker(), RecipeCategoryPickerProps, BREAD_RECIPE_SUBTYPES, DEFAULT_FRICTION_FACTOR_BY_METHOD, FROZEN_RECIPE_SUBTYPES, MIXING_METHODS, MixingMethod, RECIPE_CATEGORIES (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (7): __dirname, enFiles, localesRoot, OTHER_LANGS, referenceFiles, repoRoot, report

### Community 58 - "Community 58"
Cohesion: 0.35
Nodes (9): computeDryingRate(), DryingFlag, DryingRateInput, DryingRateResult, computePsychrometrics(), latentHeatVaporization(), PsychrometricInput, PsychrometricState (+1 more)

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
Cohesion: 0.31
Nodes (6): BillStatus, PaymentMethod, recordPayment, RecordPaymentInput, RecordPaymentResult, { getFirestoreMock, runTransactionMock, collectionMock }

### Community 63 - "Community 63"
Cohesion: 0.24
Nodes (8): AromaBand, AromaReleaseClass, AromaReleaseFlag, AromaReleaseResult, classifyBand(), computeAromaRelease(), POLARITY_ANCHORS, VolatilePolarity

### Community 64 - "Community 64"
Cohesion: 0.36
Nodes (5): computeShoppingListQuantity(), computeStockUpdate(), db, onTransactionCreate, computeWAC()

### Community 65 - "Community 65"
Cohesion: 0.33
Nodes (7): classifyRisk(), computeSucroseCrystallization(), CrystallizationFlag, CrystallizationResult, GrainingRisk, SUCROSE_SOLUBILITY, sucroseSolubilityAt()

### Community 66 - "Community 66"
Cohesion: 0.28
Nodes (7): clamp01(), computeProteinSet(), PROTEIN_PROFILES, ProteinProfile, ProteinSetBand, ProteinSetResult, ProteinType

### Community 67 - "Community 67"
Cohesion: 0.22
Nodes (8): BillAllocation, BillLineItem, BillPaymentInstruction, BillTaxLine, BillVendorResolution, ExpenseCategoryParent, PaymentMethod, VendorContact

### Community 68 - "Community 68"
Cohesion: 0.36
Nodes (6): classifyBand(), computeFoam(), FoamBand, FoamFlag, FoamResult, saturating()

### Community 69 - "Community 69"
Cohesion: 0.38
Nodes (5): dailyExpenseCheck, { getFirestoreMock, docMock, setMock, getMock, whereMock }, queueAdmins(), ADR-0007, usersSnap()

### Community 70 - "Community 70"
Cohesion: 0.38
Nodes (5): classifyConsistency(), computeRheology(), ConsistencyBand, FlowType, RheologyFlag

### Community 71 - "Community 71"
Cohesion: 0.53
Nodes (4): blendSfcAtTemp(), FAT_MELTING_PROFILES, FatProfileKey, sfcAtTemp()

### Community 72 - "Community 72"
Cohesion: 0.47
Nodes (4): seedBill(), seedNote(), validBill(), validNote()

### Community 73 - "Community 73"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 74 - "Community 74"
Cohesion: 0.70
Nodes (4): run(), say(), harden-gcp.sh script, warn()

### Community 75 - "Community 75"
Cohesion: 0.50
Nodes (4): db, __dirname, migrate(), parseLegacyString()

### Community 76 - "Community 76"
Cohesion: 0.40
Nodes (4): CLASSIC_GANACHE, DARK_70, HEAVY_CREAM, RASPBERRY_PUREE

### Community 77 - "Community 77"
Cohesion: 0.60
Nodes (4): analyzeRecipe(), dominantProvenance(), ProvenanceHealth, RecipeAudit()

## Knowledge Gaps
- **494 isolated node(s):** `name`, `build`, `test`, `serve`, `shell` (+489 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 35` to `Community 96`, `Community 97`, `Community 98`, `Community 99`, `Community 8`, `Community 73`, `Community 84`, `Community 85`, `Community 86`, `Community 89`, `Community 90`, `Community 92`, `Community 93`, `Community 94`, `Community 95`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `react` connect `Community 8` to `Community 26`, `Community 35`, `Community 77`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `RecipeDetail()` connect `Community 8` to `Community 1`, `Community 7`, `Community 12`, `Community 16`, `Community 23`, `Community 55`, `Community 29`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **What connects `name`, `build`, `test` to the rest of the system?**
  _494 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05662862159789289 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.060814383923849816 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08135593220338982 - nodes in this community are weakly interconnected._