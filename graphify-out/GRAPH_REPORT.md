# Graph Report - .  (2026-07-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1919 nodes · 5145 edges · 131 communities (104 shown, 27 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `98b56e1b`
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
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
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
- Community 123

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

## Communities (131 total, 27 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (63): CandidateCard(), CandidateCardProps, SearchSpaceList(), SearchSpaceListProps, Status, useFormulationOptimizer(), UseFormulationOptimizerReturn, DEFAULT_OBJECTIVES (+55 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (49): LocalizedFieldProps, RuntimeTranslated(), RuntimeTranslatedProps, TranslateRecipeModal(), TranslateRecipeModalProps, TranslationTabs(), TranslationTabsProps, completed (+41 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (41): classifyBand(), computeDoneness(), DonenessBand, DonenessFlag, DonenessInput, estimateConductivity(), estimateSpecificHeat(), CANDY (+33 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (32): EditorPhysicsRibbon(), EditorPhysicsRibbonProps, RecipeFrozenTier(), RecipeFrozenTierProps, RecipePhysicsTier(), RecipePhysicsTierProps, RecipePhysics, collectFaults() (+24 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (36): DisplayWarning, RecipeWarningsList(), RecipeWarningsListProps, Severity, PhysicsWarning, BreadWarning, ConfectioneryWarning, FROZEN_BANDS_BY_SUBTYPE (+28 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (36): EditorBreadStrip(), EditorBreadStripProps, RecipeBreadTier(), RecipeBreadTierProps, calculateBakersPct(), flourSubtype(), isFlour(), isSalt() (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (34): BatchImportReview(), BatchImportReviewProps, NewIngredientDraft, Props, VisualAuditModal(), CANONICAL_UNITS, COMPONENT_TYPES, INGREDIENT_CATEGORIES (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (25): react, react, ActionIcon(), ActionIconProps, actionMap, ConfirmModalProps, FailureModeTrigger(), FailureModeTriggerProps (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (30): locales, localizer, ProductionCalendarProps, Dashboard(), PrepList(), ShoppingItem, PrepItem, ProductionRun (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (24): FailureModeSheet(), FailureModeSheetProps, ChocolateContent(), formatRange(), IngredientInfo(), IngredientInfoProps, CHOCOLATE_CATALOG, CHOCOLATE_FAILURE_MODES (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (25): ACTION_TYPES, ExtractedRecipeIngredient, AllergenFlag, ChocolateSpec, DesignLayer, EnrobingSpec, BillProvenance, CustomField (+17 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (22): deriveWarnings(), useRecipePhysics(), classifyAwBand(), classifyFatRegime(), PIECEWISE_AW_TO_WEEKS, piecewiseAwToWeeks(), predictShelfLife(), ShelfLifeInputs (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.23
Nodes (21): AuditsView(), TransfersView(), DataContext, DataProvider(), useData(), app, auth, db (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (26): assessCurdleRisk(), assessEthanol(), LONG_SHELF_ETHANOL_BAND, evaluateConfectionery(), classify(), computeChocolateSnap(), computePolymorphWindow(), detectMixedChocolateClasses() (+18 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (24): add(), brine(), BrineFlag, BrineSolute, dehydrate(), Enzyme, EnzymeFlag, EnzymeParams (+16 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (31): firebase-functions, firebase-functions-test, dependencies, firebase-admin, firebase-functions, @google/genai, resend, twilio (+23 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (22): EvalInput, compareNumbers(), DslContext, evaluateStepCondition(), formatNumeric(), readPhysicsMetric(), renderStepTemplate(), resolveSlot() (+14 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (16): AdjustStockModal(), AdjustStockModalProps, ReceiveGoodsModal(), IngredientDetail(), Ingredients(), Recipes(), deriveIngredientDietaryFlags(), SafeBatch (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (18): OpDef, aerate(), AerateFlag, AerateParams, caramelize(), CaramelizeParams, SUGAR_ONSET, chill() (+10 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (21): ADR-0005, ChannelResult, CHEF_EMAIL, CHEF_PHONE_NUMBER, RESEND_API_KEY, RESEND_FROM, SendShoppingListResult, ADR-0006 (+13 more)

### Community 20 - "Community 20"
Cohesion: 0.16
Nodes (16): BillsList(), ReceivePOModal(), ReceivePOModalProps, Toast, ToastContext, ToastContextValue, ToastProvider(), ToastVariant (+8 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (22): ./*, DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators (+14 more)

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (17): CompositionEditorProps, AddParams, DehydrateFlag, DehydrateParams, freeze(), FreezeFlag, FreezeParams, computePlankTime() (+9 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (16): RoleBadge(), RoleBadgeProps, CATEGORY_FALLBACK, getRoleSwapSet(), has(), hasNot(), InferenceRule, inferRole() (+8 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (17): ADDITIONS, AGENTS, CULTURES, defaultParams(), ENZYMES, Field, fmt(), OP_BY_ID (+9 more)

### Community 25 - "Community 25"
Cohesion: 0.16
Nodes (16): RecipeEditor(), hydrateTranslationsFromLegacy(), recipeReducer(), lookupTemperingCurve(), parseChocolateSpec(), classifyStation(), inferEnrobing(), inferEquipment() (+8 more)

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (12): CadencePreset, RecurringExpectationFormProps, RecurringExpectationsList(), RecurringExpectationsListProps, createRecurringExpectation(), listRecurringExpectations(), updateRecurringExpectation(), RecurringExpectation (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.19
Nodes (15): RecurringExpectationForm(), VendorForm(), VendorFormProps, VendorPickerProps, VendorSearchModal(), VendorSearchModalProps, VendorsList(), VendorsListProps (+7 more)

### Community 28 - "Community 28"
Cohesion: 0.10
Nodes (21): date-fns, motion, dependencies, date-fns, @google/genai, motion, @phosphor-icons/react, react-big-calendar (+13 more)

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (15): setGel(), SetGelParams, SUGARS, FunctionalAgent, PATTERNS, resolveFunctionalAgent(), CoFactor, cofactorMet() (+7 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (13): getGeminiModel(), GEMINI_API_KEY, geminiGenerate, GeminiGenerateInput, callGemini(), GEMINI_API_KEY, Lang, LANGUAGE_NAMES (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (18): Dashboard, Expenses, Formulate, IngredientDetail, Ingredients, Inventory, InventoryTransactions, PrepList (+10 more)

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (16): AuditsViewProps, Combobox(), ComboboxProps, ReceiveGoodsModalProps, TransferStockModal(), TransferStockModalProps, TransfersViewProps, DataContextValue (+8 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (15): DosingPanel(), DosingPanelProps, TASTES, DosingAddition, DosingFlag, DosingGoal, DosingOptions, DosingPoint (+7 more)

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (13): ALL_ALLERGEN_KEYS, RestaurantSettings(), ALLERGEN_PATTERNS, AllergenCertainty, AllergenKey, identifyCrossContactRisks(), CrossContactRisk, recomputeAllCrossContactRisks() (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.14
Nodes (17): BillsListProps, PaymentForm(), PaymentFormProps, PAYMENT_METHODS, listRecentBills(), recordPayment(), RecordPaymentResult, Bill (+9 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (15): Props, ComponentsTabProps, DesignTab(), DesignTabProps, OverviewTabProps, Action, RecipeEditorProps, RecipeOutputStrip() (+7 more)

### Community 37 - "Community 37"
Cohesion: 0.11
Nodes (18): scripts, build, check:functions-secrets, check:hardcoded-strings, check:locale-parity, check:schema, clean, dev (+10 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (15): __dirname, dynamicFindings, dynamicPrefixSet, Finding, Json, keyResolves(), locales, localesRoot (+7 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (12): aliases, COLLECTION_MAP, __dirname, repoRoot, report, RULES_ONLY_ALLOWED, rulesPath, rulesText (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.26
Nodes (12): EditorFrozenStrip(), EditorFrozenStripProps, ComponentsTab(), ConfidenceDot(), getActionIcon(), ProvenanceBadge(), OverviewTab(), getConfidenceStyle() (+4 more)

### Community 41 - "Community 41"
Cohesion: 0.24
Nodes (11): candidateKey(), SourcingPanel(), SourcingPanelProps, useKeptSourcingNotes(), buildCandidate(), keepNote(), parseGeminiJson(), promoteNoteToSupplier() (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.19
Nodes (14): AITC_EQ, band0to100(), beidler(), CAPSAICIN_EQ, carbonationBand(), ChemesthesisChannel, ChemesthesisFlag, chemesthesisFromComposition() (+6 more)

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (15): @firebase/eslint-plugin-security-rules, devDependencies, @firebase/eslint-plugin-security-rules, @testing-library/react, @types/express, @types/papaparse, @types/react-dom, typescript (+7 more)

### Community 44 - "Community 44"
Cohesion: 0.24
Nodes (11): BILL_EXTRACTION_SCHEMA, extractBill, ExtractBillInput, ExtractBillResult, GEMINI_API_KEY, SUPPORTED_MIME_TYPES, finiteOrNull(), isAllowedStoragePath() (+3 more)

### Community 45 - "Community 45"
Cohesion: 0.13
Nodes (14): compileOnSave, compilerOptions, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck, sourceMap (+6 more)

### Community 46 - "Community 46"
Cohesion: 0.24
Nodes (10): BarcodeScannerModal(), Props, PurchaseOrderModal(), PurchaseOrderModalProps, ReceiptImportModal(), ExtractedProductLabel, ShoppingListItem, formatIdentifier() (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.31
Nodes (11): CompositionEditor(), alcoholComposition(), chocolateComposition(), COMPOSITION_DESCRIPTORS, COMPOSITION_SPECIES, compositionSum(), DEFAULT_COMPOSITION_BY_CATEGORY, isCompositionComplete() (+3 more)

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (10): emulsify(), EmulsifyParams, STABILITY_SCORE, temper(), TemperParams, computeEmulsion(), EmulsionFlag, EmulsionInput (+2 more)

### Community 49 - "Community 49"
Cohesion: 0.20
Nodes (9): dailyExpenseCheck, onLotUpdate, shouldArchiveLot(), sendShoppingList, translateBatch, { getFirestoreMock, docMock, setMock, getMock, whereMock }, queueAdmins(), ADR-0007 (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.26
Nodes (9): resolveVendor, ResolveVendorInput, jaccardSimilarity(), nameMatchScore(), normalizeVendorName(), tokenize(), runVendorResolution(), VendorMatchInput (+1 more)

### Community 51 - "Community 51"
Cohesion: 0.29
Nodes (13): ai, callGeminiDetection(), db, detectionCache, detectLanguagesBatch(), __dirname, main(), migrateIngredients() (+5 more)

### Community 52 - "Community 52"
Cohesion: 0.25
Nodes (9): AlertsBell(), SEVERITY_DOT, dismissAlert(), Alert, AlertSeverity, AlertType, RecurringCadenceTolerance, alertCreatedMillis() (+1 more)

### Community 53 - "Community 53"
Cohesion: 0.30
Nodes (11): BillReview(), BillReviewProps, BillUpload(), BillUploadProps, createBill(), extractBill(), ExtractedBillResult, fileToBase64() (+3 more)

### Community 54 - "Community 54"
Cohesion: 0.15
Nodes (6): ErrorBoundary, Props, State, FirestoreOperationError, signInWithGoogle(), resources

### Community 55 - "Community 55"
Cohesion: 0.23
Nodes (12): clamp(), computeHeatPenetration(), HeatPenetrationFlag, HeatPenetrationInput, HeatPenetrationResult, METHOD_H, temperatureAtDepth(), meat (+4 more)

### Community 56 - "Community 56"
Cohesion: 0.31
Nodes (11): alphaPolyprotic(), BUFFER_REFERENCES, BufferComponent, buildPhMixture(), calculateMixedPH(), calibrateCounterion(), collectBufferComponents(), computeTitratableAcidity() (+3 more)

### Community 57 - "Community 57"
Cohesion: 0.21
Nodes (6): onBillReviewed, writeAnomalyAlert(), resolveAdminUserIds(), ADR-0007, { getFirestoreMock, collectionMock, docMock, setMock, getMock }, ADR-0007

### Community 58 - "Community 58"
Cohesion: 0.19
Nodes (10): RecipeCategoryPicker(), RecipeCategoryPickerProps, BREAD_RECIPE_SUBTYPES, DEFAULT_FRICTION_FACTOR_BY_METHOD, FROZEN_RECIPE_SUBTYPES, MIXING_METHODS, MixingMethod, RECIPE_CATEGORIES (+2 more)

### Community 59 - "Community 59"
Cohesion: 0.23
Nodes (11): beidler(), clamp(), computeTasteProfile(), ORGANIC_ACID_EQ_WEIGHT, rawSourness(), RELATIVE_SWEETNESS, sucroseEquivalentPct(), TasteFlag (+3 more)

### Community 60 - "Community 60"
Cohesion: 0.18
Nodes (10): BUFFALO_MILK, CAMEL_MILK, dehydrate(), GOAT_MILK, REINDEER_MILK, SHEEP_MILK, USDA_FDC_SNAPSHOT, UsdaFdcEntry (+2 more)

### Community 61 - "Community 61"
Cohesion: 0.17
Nodes (7): __dirname, enFiles, localesRoot, OTHER_LANGS, referenceFiles, repoRoot, report

### Community 62 - "Community 62"
Cohesion: 0.24
Nodes (9): BillPaymentHistory(), BillPaymentHistoryProps, PaymentsList(), getBill(), getBillsByIds(), listPaymentsForBill(), listRecentPayments(), RecordPaymentInput (+1 more)

### Community 63 - "Community 63"
Cohesion: 0.23
Nodes (10): BrineParams, clamp01(), computeMassPenetration(), Diffusant, DIFFUSIVITY, MassDiffusionFlag, MassDiffusionInput, MassDiffusionResult (+2 more)

### Community 64 - "Community 64"
Cohesion: 0.35
Nodes (9): computeDryingRate(), DryingFlag, DryingRateInput, DryingRateResult, computePsychrometrics(), latentHeatVaporization(), PsychrometricInput, PsychrometricState (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.24
Nodes (10): AIR, computeSurfaceCoefficient(), fluidAt(), FluidPoint, interp(), nusseltForced(), nusseltNatural(), OIL (+2 more)

### Community 66 - "Community 66"
Cohesion: 0.42
Nodes (10): besselJ0(), besselJ1(), coefficientC1(), eigenResidual(), firstEigenvalue(), fourierForCenterTheta(), LAMBDA_INF, positionShape() (+2 more)

### Community 67 - "Community 67"
Cohesion: 0.23
Nodes (5): ContributionReport, contributionsFromLeaves(), IngredientContribution, recipeContributions(), resolveRecipeLeaves()

### Community 68 - "Community 68"
Cohesion: 0.21
Nodes (9): Ctx, ResolveLeavesResult, UnmassableLeaf, UnmassableReason, normalizeUnit(), UNIT_ALIASES, UnitKind, volumeToMl (+1 more)

### Community 69 - "Community 69"
Cohesion: 0.18
Nodes (7): ATTR_RE, __dirname, findings, IGNORED_PATHS, repoRoot, srcRoot, USER_FACING_ATTRS

### Community 70 - "Community 70"
Cohesion: 0.18
Nodes (8): DIFFUSANTS, FREEZE_ENV, FREEZE_ENVS, GEOMETRIES, METHODS, SURFACE_BY_METHOD, TransportPanelProps, CookingMethod

### Community 71 - "Community 71"
Cohesion: 0.22
Nodes (9): TransportPanel(), Component, componentMasses(), computeThermalProperties(), CP, ICE, K, Quad (+1 more)

### Community 72 - "Community 72"
Cohesion: 0.20
Nodes (10): functions, callSendShoppingList, ChannelResult, sendShoppingList(), SendShoppingListFailureReason, SendShoppingListOutcome, SendShoppingListRequest, SendShoppingListResult (+2 more)

### Community 73 - "Community 73"
Cohesion: 0.31
Nodes (6): BillStatus, PaymentMethod, recordPayment, RecordPaymentInput, RecordPaymentResult, { getFirestoreMock, runTransactionMock, collectionMock }

### Community 74 - "Community 74"
Cohesion: 0.36
Nodes (5): computeShoppingListQuantity(), computeStockUpdate(), db, onTransactionCreate, computeWAC()

### Community 75 - "Community 75"
Cohesion: 0.36
Nodes (6): Layout(), PageSpinner(), logOut(), signInAsGuest(), useAlerts(), subscribeToUserAlerts()

### Community 76 - "Community 76"
Cohesion: 0.22
Nodes (6): CLASSIC_GANACHE, DARK_70, HEAVY_CREAM, RASPBERRY_PUREE, ATWATER, computeNutrition()

### Community 77 - "Community 77"
Cohesion: 0.28
Nodes (7): AromaBand, AromaReleaseClass, AromaReleaseFlag, classifyBand(), computeAromaRelease(), POLARITY_ANCHORS, VolatilePolarity

### Community 78 - "Community 78"
Cohesion: 0.31
Nodes (6): BLISS, BlissTaste, clamp(), computePalatability(), invertedU(), PalatabilityFlag

### Community 79 - "Community 79"
Cohesion: 0.28
Nodes (7): BOILING_SOLUTES, BoilingFlag, BoilingResult, CANDY_STAGES, CandyStage, classifyCandyStage(), computeBoilingPoint()

### Community 80 - "Community 80"
Cohesion: 0.33
Nodes (7): classifyRisk(), computeSucroseCrystallization(), CrystallizationFlag, CrystallizationResult, GrainingRisk, SUCROSE_SOLUBILITY, sucroseSolubilityAt()

### Community 81 - "Community 81"
Cohesion: 0.28
Nodes (7): clamp01(), computeProteinSet(), PROTEIN_PROFILES, ProteinProfile, ProteinSetBand, ProteinSetResult, ProteinType

### Community 82 - "Community 82"
Cohesion: 0.43
Nodes (4): CsvImportModal(), CsvImportModalProps, ParsedNumber, parseLocaleNumber()

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (5): AW_BANDS_FOR_TABLE, faultColor(), RecipePhysicsDetail(), RecipePhysicsDetailProps, CompositionSource

### Community 84 - "Community 84"
Cohesion: 0.43
Nodes (5): classifyBand(), computeFoam(), FoamBand, FoamFlag, saturating()

### Community 85 - "Community 85"
Cohesion: 0.38
Nodes (5): classifyConsistency(), computeRheology(), ConsistencyBand, FlowType, RheologyFlag

### Community 86 - "Community 86"
Cohesion: 0.33
Nodes (5): Measurability, Predictability, QUALITY_DIMENSIONS, QualityDimension, ScopeCategory

### Community 87 - "Community 87"
Cohesion: 0.80
Nodes (4): nextNOccurrences(), nextOccurrence(), parseRRule(), previousOccurrence()

### Community 88 - "Community 88"
Cohesion: 0.53
Nodes (4): blendSfcAtTemp(), FAT_MELTING_PROFILES, FatProfileKey, sfcAtTemp()

### Community 89 - "Community 89"
Cohesion: 0.47
Nodes (4): seedBill(), seedNote(), validBill(), validNote()

### Community 90 - "Community 90"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 91 - "Community 91"
Cohesion: 0.70
Nodes (4): run(), say(), harden-gcp.sh script, warn()

### Community 92 - "Community 92"
Cohesion: 0.50
Nodes (4): db, __dirname, migrate(), parseLegacyString()

### Community 93 - "Community 93"
Cohesion: 0.60
Nodes (4): analyzeRecipe(), dominantProvenance(), ProvenanceHealth, RecipeAudit()

### Community 95 - "Community 95"
Cohesion: 0.67
Nodes (3): RequireAdmin(), RequireAdminProps, useUserRole()

## Knowledge Gaps
- **506 isolated node(s):** `name`, `build`, `test`, `serve`, `shell` (+501 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 28` to `Community 99`, `Community 100`, `Community 101`, `Community 7`, `Community 104`, `Community 105`, `Community 107`, `Community 108`, `Community 109`, `Community 110`, `Community 111`, `Community 112`, `Community 113`, `Community 114`, `Community 90`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `react` connect `Community 7` to `Community 28`, `Community 93`, `Community 46`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `RecipeDetail()` connect `Community 7` to `Community 0`, `Community 1`, `Community 8`, `Community 11`, `Community 12`, `Community 16`, `Community 20`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **What connects `name`, `build`, `test` to the rest of the system?**
  _506 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05434173669467787 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05583972719522592 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07676767676767676 - nodes in this community are weakly interconnected._