# Graph Report - .  (2026-07-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1961 nodes · 5209 edges · 132 communities (94 shown, 38 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2df8852e`
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
- Community 96
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
- Community 124

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
- `Recipes()` --indirect_call--> `components()`  [INFERRED]
  src/pages/Recipes.tsx → test/rules/recipesAndCatalog.rules.test.ts
- `SourcingPanel()` --references--> `dompurify`  [EXTRACTED]
  src/components/SourcingPanel.tsx → package.json
- `ReceiptImportModal()` --references--> `react`  [EXTRACTED]
  src/components/ReceiptImportModal.tsx → package.json
- `RecipeAudit()` --references--> `react`  [EXTRACTED]
  src/pages/RecipeAudit.tsx → package.json
- `RecipeCookingMode()` --references--> `react`  [EXTRACTED]
  src/pages/RecipeCookingMode.tsx → package.json

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

## Communities (132 total, 38 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (54): LocalizedFieldProps, resolveLocalized(), ResolveResult, RuntimeTranslated(), RuntimeTranslatedProps, RecipeOutputStrip(), AW_BANDS_FOR_TABLE, faultColor() (+46 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (48): EditorBreadStrip(), EditorBreadStripProps, RecipeBreadTier(), RecipeBreadTierProps, calculateBakersPct(), flourSubtype(), isFlour(), isSalt() (+40 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (44): add(), brine(), BrineFlag, caramelize(), CaramelizeParams, SUGAR_ONSET, chill(), ChillParams (+36 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (48): CompositionEditor(), CompositionEditorProps, DosingPanel(), TASTES, DosingAddition, DosingFlag, DosingGoal, DosingOptions (+40 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (49): DIFFUSANTS, FREEZE_ENV, FREEZE_ENVS, GEOMETRIES, METHODS, SURFACE_BY_METHOD, BrineParams, clamp() (+41 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (35): EditorFrozenStrip(), EditorFrozenStripProps, EditorPhysicsRibbon(), EditorPhysicsRibbonProps, RecipeFrozenTier(), RecipeFrozenTierProps, RecipePhysicsTier(), RecipePhysicsTierProps (+27 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (32): AuditsView(), AuditsViewProps, ReceiveGoodsModalProps, ReceivePOModal(), ReceivePOModalProps, TransferStockModal(), TransferStockModalProps, TransfersViewProps (+24 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (36): CandidateCard(), SearchSpaceList(), Status, useFormulationOptimizer(), UseFormulationOptimizerReturn, DEFAULT_OBJECTIVES, Formulate(), TEXTURE_OBJECTIVES (+28 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (30): ActionIcon(), ActionIconProps, actionMap, FailureModeSheet(), FailureModeSheetProps, FailureModeTrigger(), FailureModeTriggerProps, ChocolateContent() (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (33): DosingPanelProps, CandidateCardProps, SearchSpaceListProps, PipelinePanelProps, ComponentsTabProps, OverviewTabProps, RecipeEditorProps, RecipeOutputStripProps (+25 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (30): Dashboard(), UnitConversionWarning, bonbonRecipe, fixtureIngredients, fixtureRecipes, subRecipeGanache, subRecipeTemperedDark, ContributionReport (+22 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (29): BillPaymentHistory(), BillsList(), LocalizedField(), PaymentsList(), RecipeCostDrivers(), RecipeCostDriversProps, RecurringExpectationsList(), TransfersView() (+21 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (21): AdjustStockModal(), AdjustStockModalProps, Combobox(), ComboboxProps, ReceiveGoodsModal(), IngredientDetail(), Ingredients(), PrepList() (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (26): assessCurdleRisk(), assessEthanol(), LONG_SHELF_ETHANOL_BAND, evaluateConfectionery(), classify(), computeChocolateSnap(), computePolymorphWindow(), detectMixedChocolateClasses() (+18 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (24): deriveWarnings(), useRecipePhysics(), EvalInput, detectHardConstraintViolation(), EvalContext, evaluateObjectives(), RISK_RANK, cryptoRandomId() (+16 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (25): accumulateThermalExtent(), arrheniusRate(), zValueRate(), awSuitability(), classifyBand(), computeMaillardBrowning(), MaillardBand, MaillardFlag (+17 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (31): firebase-functions, firebase-functions-test, dependencies, firebase-admin, firebase-functions, @google/genai, resend, twilio (+23 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (20): ACTION_TYPES, COMPONENT_TYPES, ChocolateSpec, DesignLayer, CustomField, FieldMeta, AlcoholSpec, ContextSlot (+12 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (26): BatchImportReview(), BatchImportReviewProps, CANONICAL_UNITS, INGREDIENT_CATEGORIES, IngredientCategory, RECIPE_TYPES, classifyStation(), inferEnrobing() (+18 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (23): TransportPanel(), freeze(), FreezeFlag, FreezeParams, computePlankTime(), PlankFlag, PlankInput, PlankMode (+15 more)

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (21): ComponentsTab(), DesignTab(), DesignTabProps, ConfidenceDot(), getActionIcon(), ProvenanceBadge(), OverviewTab(), RecipeEditor() (+13 more)

### Community 21 - "Community 21"
Cohesion: 0.19
Nodes (17): EvalInput, evaluateFrozen(), inferFrozenRecipeSubtype(), calculateLactosePct(), calculateMSNF(), calculateTotalSolidsPct(), isDairyDerived(), calculatePAC() (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (18): candidateKey(), SourcingPanel(), SourcingPanelProps, useKeptSourcingNotes(), callGeminiGenerate, GeminiGenerateRequest, GeminiGenerateResponse, getGeminiClient() (+10 more)

### Community 23 - "Community 23"
Cohesion: 0.14
Nodes (21): ADR-0005, ChannelResult, CHEF_EMAIL, CHEF_PHONE_NUMBER, RESEND_API_KEY, RESEND_FROM, SendShoppingListResult, ADR-0006 (+13 more)

### Community 24 - "Community 24"
Cohesion: 0.13
Nodes (19): BarcodeScannerModal(), Props, PurchaseOrderModal(), PurchaseOrderModalProps, Props, ReceiptImportModal(), Props, VisualAuditModal() (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (21): BillPaymentHistoryProps, PaymentForm(), PaymentFormProps, PAYMENT_METHODS, getBill(), listRecentBills(), listPaymentsForBill(), listRecentPayments() (+13 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (18): react, react, NewIngredientDraft, ConfirmModalProps, useRestaurantSettings(), RecipeCookingMode(), RecipeDetail(), Recipes() (+10 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (19): ADDITIONS, AGENTS, CULTURES, defaultParams(), ENZYMES, Field, fmt(), OP_BY_ID (+11 more)

### Community 28 - "Community 28"
Cohesion: 0.15
Nodes (19): DisplayWarning, RecipeWarningsList(), RecipeWarningsListProps, Severity, PhysicsWarning, BreadWarning, ConfectioneryWarning, FROZEN_BANDS_BY_SUBTYPE (+11 more)

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (16): RoleBadge(), RoleBadgeProps, CATEGORY_FALLBACK, getRoleSwapSet(), has(), hasNot(), InferenceRule, inferRole() (+8 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (17): BLISS, BlissTaste, clamp(), computePalatability(), invertedU(), PalatabilityFlag, beidler(), clamp() (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (16): FunctionalAgent, PATTERNS, resolveFunctionalAgent(), CoFactor, cofactorMet(), computeGelation(), GEL_PROFILES, GelationContext (+8 more)

### Community 32 - "Community 32"
Cohesion: 0.20
Nodes (12): CadencePreset, RecurringExpectationForm(), RecurringExpectationFormProps, RecurringExpectationsListProps, createRecurringExpectation(), listRecurringExpectations(), updateRecurringExpectation(), RecurringExpectation (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (15): ALL_ALLERGEN_KEYS, RestaurantSettings(), ALLERGEN_LABELS, ALLERGEN_PATTERNS, AllergenCertainty, AllergenFlag, AllergenKey, identifyCrossContactRisks() (+7 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (16): classifyBand(), computeDoneness(), DonenessBand, DonenessFlag, DonenessInput, estimateConductivity(), estimateSpecificHeat(), CANDY (+8 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (20): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+12 more)

### Community 36 - "Community 36"
Cohesion: 0.20
Nodes (14): VendorForm(), VendorFormProps, VendorPickerProps, VendorSearchModal(), VendorSearchModalProps, VendorsList(), VendorsListProps, createVendor() (+6 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (13): getGeminiModel(), GEMINI_API_KEY, geminiGenerate, GeminiGenerateInput, callGemini(), GEMINI_API_KEY, Lang, LANGUAGE_NAMES (+5 more)

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (18): Dashboard, Expenses, Formulate, IngredientDetail, Ingredients, Inventory, InventoryTransactions, PrepList (+10 more)

### Community 39 - "Community 39"
Cohesion: 0.18
Nodes (10): onBillReviewed, writeAnomalyAlert(), resolveAdminUserIds(), ADR-0007, nextNOccurrences(), nextOccurrence(), parseRRule(), previousOccurrence() (+2 more)

### Community 40 - "Community 40"
Cohesion: 0.11
Nodes (19): scripts, build, check:bundle-size, check:functions-secrets, check:hardcoded-strings, check:locale-parity, check:schema, clean (+11 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (15): __dirname, dynamicFindings, dynamicPrefixSet, Finding, Json, keyResolves(), locales, localesRoot (+7 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (12): aliases, COLLECTION_MAP, __dirname, repoRoot, report, RULES_ONLY_ALLOWED, rulesPath, rulesText (+4 more)

### Community 43 - "Community 43"
Cohesion: 0.24
Nodes (14): BillReview(), BillReviewProps, BillsListProps, BillUpload(), BillUploadProps, createBill(), extractBill(), ExtractedBillResult (+6 more)

### Community 44 - "Community 44"
Cohesion: 0.14
Nodes (12): PAC_FACTORS, BOILING_SOLUTES, BoilingFlag, BoilingResult, CANDY_STAGES, CandyStage, classifyCandyStage(), computeBoilingPoint() (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.19
Nodes (14): AITC_EQ, band0to100(), beidler(), CAPSAICIN_EQ, carbonationBand(), ChemesthesisChannel, ChemesthesisFlag, chemesthesisFromComposition() (+6 more)

### Community 46 - "Community 46"
Cohesion: 0.13
Nodes (15): @firebase/eslint-plugin-security-rules, devDependencies, @firebase/eslint-plugin-security-rules, @testing-library/react, @types/express, @types/papaparse, @types/react-dom, typescript (+7 more)

### Community 47 - "Community 47"
Cohesion: 0.13
Nodes (14): compileOnSave, compilerOptions, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck, sourceMap (+6 more)

### Community 48 - "Community 48"
Cohesion: 0.24
Nodes (13): compareNumbers(), DslContext, evaluateStepCondition(), formatNumeric(), readPhysicsMetric(), renderStepTemplate(), resolveSlot(), RISK_RANK (+5 more)

### Community 49 - "Community 49"
Cohesion: 0.26
Nodes (10): BILL_EXTRACTION_SCHEMA, ExtractBillInput, ExtractBillResult, GEMINI_API_KEY, SUPPORTED_MIME_TYPES, finiteOrNull(), isAllowedStoragePath(), parsePlausibleDate() (+2 more)

### Community 50 - "Community 50"
Cohesion: 0.29
Nodes (13): ai, callGeminiDetection(), db, detectionCache, detectLanguagesBatch(), __dirname, main(), migrateIngredients() (+5 more)

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (9): AlertsBell(), SEVERITY_DOT, dismissAlert(), Alert, AlertSeverity, AlertType, RecurringCadenceTolerance, alertCreatedMillis() (+1 more)

### Community 52 - "Community 52"
Cohesion: 0.15
Nodes (6): ErrorBoundary, Props, State, FirestoreOperationError, signInWithGoogle(), resources

### Community 53 - "Community 53"
Cohesion: 0.19
Nodes (10): RecipeCategoryPicker(), RecipeCategoryPickerProps, BREAD_RECIPE_SUBTYPES, DEFAULT_FRICTION_FACTOR_BY_METHOD, FROZEN_RECIPE_SUBTYPES, MIXING_METHODS, MixingMethod, RECIPE_CATEGORIES (+2 more)

### Community 54 - "Community 54"
Cohesion: 0.21
Nodes (10): AddParams, emulsify(), EmulsifyParams, STABILITY_SCORE, computeEmulsion(), EmulsionFlag, EmulsionInput, EmulsionStability (+2 more)

### Community 55 - "Community 55"
Cohesion: 0.32
Nodes (9): computeDryingRate(), DryingFlag, DryingRateInput, DryingRateResult, computePsychrometrics(), latentHeatVaporization(), PsychrometricInput, PsychrometricState (+1 more)

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (7): __dirname, enFiles, localesRoot, OTHER_LANGS, referenceFiles, repoRoot, report

### Community 57 - "Community 57"
Cohesion: 0.26
Nodes (8): Layout(), PageSpinner(), RequireAdmin(), RequireAdminProps, logOut(), signInAsGuest(), UserRole, useUserRole()

### Community 58 - "Community 58"
Cohesion: 0.24
Nodes (7): extractBill, onLotUpdate, shouldArchiveLot(), resolveVendor, ResolveVendorInput, sendShoppingList, translateBatch

### Community 59 - "Community 59"
Cohesion: 0.36
Nodes (7): jaccardSimilarity(), nameMatchScore(), normalizeVendorName(), tokenize(), runVendorResolution(), VendorMatchInput, VendorMatchResult

### Community 60 - "Community 60"
Cohesion: 0.18
Nodes (7): ATTR_RE, __dirname, findings, IGNORED_PATHS, repoRoot, srcRoot, USER_FACING_ATTRS

### Community 61 - "Community 61"
Cohesion: 0.20
Nodes (10): functions, callSendShoppingList, ChannelResult, sendShoppingList(), SendShoppingListFailureReason, SendShoppingListOutcome, SendShoppingListRequest, SendShoppingListResult (+2 more)

### Community 62 - "Community 62"
Cohesion: 0.25
Nodes (8): aerate(), AerateFlag, AerateParams, classifyBand(), computeFoam(), FoamBand, FoamFlag, saturating()

### Community 63 - "Community 63"
Cohesion: 0.31
Nodes (6): BillStatus, PaymentMethod, recordPayment, RecordPaymentInput, RecordPaymentResult, { getFirestoreMock, runTransactionMock, collectionMock }

### Community 64 - "Community 64"
Cohesion: 0.36
Nodes (5): computeShoppingListQuantity(), computeStockUpdate(), db, onTransactionCreate, computeWAC()

### Community 65 - "Community 65"
Cohesion: 0.28
Nodes (7): AromaBand, AromaReleaseClass, AromaReleaseFlag, classifyBand(), computeAromaRelease(), POLARITY_ANCHORS, VolatilePolarity

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (7): classifyRisk(), computeSucroseCrystallization(), CrystallizationFlag, CrystallizationResult, GrainingRisk, SUCROSE_SOLUBILITY, sucroseSolubilityAt()

### Community 67 - "Community 67"
Cohesion: 0.28
Nodes (7): clamp01(), computeProteinSet(), PROTEIN_PROFILES, ProteinProfile, ProteinSetBand, ProteinSetResult, ProteinType

### Community 68 - "Community 68"
Cohesion: 0.31
Nodes (7): components(), seedRecipe(), seedSupplier(), seedVendor(), validRecipe(), validSupplier(), validVendor()

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (7): date-fns, i18next-browser-languagedetector, dependencies, date-fns, i18next-browser-languagedetector, react-dom, react-dom

### Community 70 - "Community 70"
Cohesion: 0.38
Nodes (5): dailyExpenseCheck, { getFirestoreMock, docMock, setMock, getMock, whereMock }, queueAdmins(), ADR-0007, usersSnap()

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (6): { getAuth }, { getFirestore }, { initializeApp, applicationDefault }, ADR-0007, require, usingEmulator

### Community 72 - "Community 72"
Cohesion: 0.43
Nodes (4): CsvImportModal(), CsvImportModalProps, ParsedNumber, parseLocaleNumber()

### Community 73 - "Community 73"
Cohesion: 0.33
Nodes (5): Measurability, Predictability, QUALITY_DIMENSIONS, QualityDimension, ScopeCategory

### Community 74 - "Community 74"
Cohesion: 0.38
Nodes (4): seedExpectation(), seedItem(), validExpectation(), validItem()

### Community 75 - "Community 75"
Cohesion: 0.40
Nodes (4): locales, localizer, ProductionCalendarProps, ProductionRun

### Community 76 - "Community 76"
Cohesion: 0.47
Nodes (4): estimateTgPrime(), TG_PRIME_C, TgPrimeFlag, TgPrimeResult

### Community 77 - "Community 77"
Cohesion: 0.53
Nodes (4): blendSfcAtTemp(), FAT_MELTING_PROFILES, FatProfileKey, sfcAtTemp()

### Community 78 - "Community 78"
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
- **517 isolated node(s):** `name`, `build`, `test`, `serve`, `shell` (+512 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 69` to `Community 26`, `Community 81`, `Community 91`, `Community 92`, `Community 93`, `Community 95`, `Community 96`, `Community 98`, `Community 100`, `Community 101`, `Community 102`, `Community 103`, `Community 104`, `Community 105`, `Community 106`, `Community 107`, `Community 108`, `Community 109`, `Community 110`, `Community 111`, `Community 112`, `Community 113`, `Community 114`, `Community 115`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `react` connect `Community 26` to `Community 24`, `Community 84`, `Community 69`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `RecipeDetail()` connect `Community 26` to `Community 0`, `Community 11`, `Community 14`, `Community 48`, `Community 17`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **What connects `name`, `build`, `test` to the rest of the system?**
  _517 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05028305028305028 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06993006993006994 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08344988344988345 - nodes in this community are weakly interconnected._