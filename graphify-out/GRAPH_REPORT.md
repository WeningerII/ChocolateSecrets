# Graph Report - .  (2026-07-09)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1792 nodes · 4956 edges · 113 communities (106 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e87451f2`
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
- Community 105

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

## Communities (113 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (58): CandidateCard(), CandidateCardProps, SearchSpaceList(), SearchSpaceListProps, PipelinePanelProps, RecipeEditorProps, Status, useFormulationOptimizer() (+50 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (48): RecipeCategoryPicker(), RecipeCategoryPickerProps, DisplayWarning, RecipeWarningsList(), RecipeWarningsListProps, Severity, PhysicsWarning, BreadWarning (+40 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (36): EditorBreadStrip(), EditorBreadStripProps, RecipeBreadTier(), RecipeBreadTierProps, calculateBakersPct(), flourSubtype(), isFlour(), isSalt() (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (35): Dashboard(), UnitConversionWarning, bonbonRecipe, fixtureIngredients, fixtureRecipes, subRecipeGanache, subRecipeTemperedDark, ContributionReport (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (23): AdjustStockModal(), AdjustStockModalProps, Combobox(), ComboboxProps, ReceiveGoodsModal(), ReceiveGoodsModalProps, TransferStockModal(), TransferStockModalProps (+15 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (29): EditorFrozenStrip(), EditorFrozenStripProps, EditorPhysicsRibbon(), EditorPhysicsRibbonProps, RecipeFrozenTier(), RecipeFrozenTierProps, RecipeOutputStrip(), RecipeOutputStripProps (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (30): BatchImportReview(), BatchImportReviewProps, NewIngredientDraft, VisualAuditModal(), CANONICAL_UNITS, COMPONENT_TYPES, INGREDIENT_CATEGORIES, IngredientCategory (+22 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (23): AuditsView(), AuditsViewProps, TransfersView(), TransfersViewProps, DataContext, DataProvider(), useData(), handleFirestoreError() (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (25): ChocolateContent(), formatRange(), IngredientInfo(), IngredientInfoProps, lookupTemperingCurve(), parseChocolateSpec(), DAIRY_BRANDS, DAIRY_CATEGORIES (+17 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (25): accumulateThermalExtent(), arrheniusRate(), zValueRate(), awSuitability(), classifyBand(), computeMaillardBrowning(), MaillardBand, MaillardFlag (+17 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (21): BillsList(), LocalizedField(), TranslationTabs(), Toast, ToastContext, ToastContextValue, ToastProvider(), ToastVariant (+13 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (24): CompositionEditor(), CompositionEditorProps, alcoholComposition(), chocolateComposition(), COMPOSITION_DESCRIPTORS, COMPOSITION_SPECIES, compositionSum(), DEFAULT_COMPOSITION_BY_CATEGORY (+16 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (23): assessCurdleRisk(), assessEthanol(), LONG_SHELF_ETHANOL_BAND, EvalInput, evaluateConfectionery(), DslContext, inferConfectionerySubtype(), N() (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (20): setGel(), SetGelParams, SUGARS, FunctionalAgent, PATTERNS, resolveFunctionalAgent(), CoFactor, cofactorMet() (+12 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (20): ACTION_TYPES, AllergenKey, ExtractedRecipeIngredient, AllergenFlag, CrossContactRisk, DietaryFlag, HACCPMetadata, ChocolateSpec (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (25): dependencies, date-fns, express, firebase, @google/genai, i18next, i18next-browser-languagedetector, lucide-react (+17 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (16): DosingPanel(), DosingPanelProps, TASTES, DosingAddition, DosingFlag, DosingGoal, DosingOptions, DosingPoint (+8 more)

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (12): Props, app, db, FirestoreErrorInfo, UserRole, ALL_ALLERGEN_KEYS, RestaurantSettings(), PrepItem (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (15): deriveWarnings(), useRecipePhysics(), EvalInput, classifyAwBand(), classifyFatRegime(), PIECEWISE_AW_TO_WEEKS, piecewiseAwToWeeks(), predictShelfLife() (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.19
Nodes (17): getActionIcon(), RecipeEditor(), Action, getConfidenceStyle(), getFieldMeta(), getIngredientMinConfidence(), getProvenanceStyle(), hydrateTranslationsFromLegacy() (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.19
Nodes (13): CadencePreset, RecurringExpectationForm(), RecurringExpectationFormProps, RecurringExpectationsList(), RecurringExpectationsListProps, createRecurringExpectation(), listRecurringExpectations(), updateRecurringExpectation() (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (8): collectFaults(), Fault, FaultDomain, FaultSeverity, SEVERITY_RANK, Source, SOURCES, CrystallizationResult

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (13): freeze(), FreezeFlag, heat(), HeatParams, REDUCING_SUGARS, PipelineResult, runPipeline(), StepLog (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (17): BLISS, BlissTaste, clamp(), computePalatability(), invertedU(), PalatabilityFlag, beidler(), clamp() (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.14
Nodes (15): RoleBadge(), RoleBadgeProps, CATEGORY_FALLBACK, getRoleSwapSet(), has(), hasNot(), InferenceRule, inferRole() (+7 more)

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (14): VendorForm(), VendorFormProps, VendorPickerProps, VendorSearchModal(), VendorSearchModalProps, VendorsList(), VendorsListProps, createVendor() (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (15): add(), AddParams, brine(), BrineFlag, BrineSolute, dehydrate(), DehydrateFlag, DehydrateParams (+7 more)

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (13): getGeminiModel(), GEMINI_API_KEY, geminiGenerate, GeminiGenerateInput, callGemini(), GEMINI_API_KEY, Lang, LANGUAGE_NAMES (+5 more)

### Community 28 - "Community 28"
Cohesion: 0.10
Nodes (18): Dashboard, Expenses, Formulate, IngredientDetail, Ingredients, Inventory, InventoryTransactions, PrepList (+10 more)

### Community 29 - "Community 29"
Cohesion: 0.16
Nodes (16): BillPaymentHistory(), BillPaymentHistoryProps, PaymentForm(), PaymentFormProps, PaymentsList(), PAYMENT_METHODS, getBill(), getBillsByIds() (+8 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (15): ADDITIONS, AGENTS, CULTURES, defaultParams(), ENZYMES, Field, fmt(), OP_BY_ID (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.19
Nodes (13): dompurify, candidateKey(), SourcingPanel(), SourcingPanelProps, useKeptSourcingNotes(), buildCandidate(), keepNote(), parseGeminiJson() (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.18
Nodes (14): react, ActionIcon(), ActionIconProps, actionMap, FailureModeTrigger(), FailureModeTriggerProps, RecipeCostDrivers(), RecipeCostDriversProps (+6 more)

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (14): classify(), computeChocolateSnap(), computePolymorphWindow(), detectMixedChocolateClasses(), lookupWindow(), polymorphWindowForCocoa(), SNAP_FAT_BLEND_BY_CLASS, TEMPER_TABLE (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (17): devDependencies, firebase-functions-test, typescript, vitest, engines, node, main, name (+9 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (18): scripts, build, check:functions-secrets, check:hardcoded-strings, check:locale-parity, check:schema, clean, dev (+10 more)

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (11): BarcodeScannerModal(), Props, ConfirmModalProps, Recipes(), ALLERGEN_LABELS, ExtractedProductLabel, prepareImageForUpload(), calculateSimilarity() (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (14): LocalizedFieldProps, resolveLocalized(), ResolveResult, RuntimeTranslated(), RuntimeTranslatedProps, TranslationTabsProps, RuntimeTranslationState, TranslationStatus (+6 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (15): BrineParams, FreezeParams, clamp01(), computeMassPenetration(), Diffusant, DIFFUSIVITY, MassDiffusionFlag, MassDiffusionInput (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.15
Nodes (13): emulsify(), EmulsifyParams, STABILITY_SCORE, EnzymeFlag, EnzymeParams, EnzymeProfile, ENZYMES, computeEmulsion() (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (17): devDependencies, firebase-admin, @firebase/eslint-plugin-security-rules, @firebase/rules-unit-testing, jsdom, @playwright/test, tailwindcss, @testing-library/react (+9 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (12): aliases, COLLECTION_MAP, __dirname, repoRoot, report, RULES_ONLY_ALLOWED, rulesPath, rulesText (+4 more)

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (12): TranslateRecipeModal(), TranslateRecipeModalProps, completed, hasMissingTranslations(), inFlight, useAutoTranslate(), applyTranslationProposal(), collectTasks() (+4 more)

### Community 44 - "Community 44"
Cohesion: 0.15
Nodes (11): BOILING_SOLUTES, BoilingFlag, BoilingResult, CANDY_STAGES, CandyStage, classifyCandyStage(), computeBoilingPoint(), MOLECULAR_WEIGHTS (+3 more)

### Community 45 - "Community 45"
Cohesion: 0.26
Nodes (13): BillReview(), BillReviewProps, BillsListProps, BillUpload(), BillUploadProps, createBill(), extractBill(), ExtractedBillResult (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.19
Nodes (14): AITC_EQ, band0to100(), beidler(), CAPSAICIN_EQ, carbonationBand(), ChemesthesisChannel, ChemesthesisFlag, chemesthesisFromComposition() (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.26
Nodes (13): alphaPolyprotic(), BUFFER_REFERENCES, BufferComponent, buildPhMixture(), calculateMixedPH(), calibrateCounterion(), collectBufferComponents(), computeTitratableAcidity() (+5 more)

### Community 48 - "Community 48"
Cohesion: 0.24
Nodes (11): BILL_EXTRACTION_SCHEMA, extractBill, ExtractBillInput, ExtractBillResult, GEMINI_API_KEY, SUPPORTED_MIME_TYPES, finiteOrNull(), isAllowedStoragePath() (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.24
Nodes (11): PurchaseOrderModal(), PurchaseOrderModalProps, Props, ReceiptImportModal(), ReceivePOModal(), ReceivePOModalProps, PurchaseOrder, ShoppingListItem (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.21
Nodes (8): dailyExpenseCheck, onBillReviewed, writeAnomalyAlert(), resolveAdminUserIds(), { getFirestoreMock, docMock, setMock, getMock, whereMock }, queueAdmins(), usersSnap(), { getFirestoreMock, collectionMock, docMock, setMock, getMock }

### Community 51 - "Community 51"
Cohesion: 0.29
Nodes (13): ai, callGeminiDetection(), db, detectionCache, detectLanguagesBatch(), __dirname, main(), migrateIngredients() (+5 more)

### Community 52 - "Community 52"
Cohesion: 0.25
Nodes (9): AlertsBell(), SEVERITY_DOT, dismissAlert(), Alert, AlertSeverity, AlertType, RecurringCadenceTolerance, alertCreatedMillis() (+1 more)

### Community 53 - "Community 53"
Cohesion: 0.15
Nodes (6): ErrorBoundary, Props, State, FirestoreOperationError, signInWithGoogle(), resources

### Community 54 - "Community 54"
Cohesion: 0.20
Nodes (10): OpDef, aerate(), AerateFlag, AerateParams, caramelize(), CaramelizeParams, SUGAR_ONSET, chill() (+2 more)

### Community 55 - "Community 55"
Cohesion: 0.18
Nodes (11): TransportPanel(), computePlankTime(), beef, Component, componentMasses(), computeThermalProperties(), CP, ICE (+3 more)

### Community 56 - "Community 56"
Cohesion: 0.36
Nodes (12): attachComponentLocalizedFields(), attachIngredientLocalizedFields(), attachRecipeIngredientLocalizedFields(), attachRecipeLocalizedFields(), attachStepLocalizedFields(), attachSupplierLocalizedFields(), findById(), getLocalizedText() (+4 more)

### Community 57 - "Community 57"
Cohesion: 0.15
Nodes (12): compileOnSave, compilerOptions, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck, sourceMap (+4 more)

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (9): FailureModeSheet(), FailureModeSheetProps, CHOCOLATE_CATALOG, CHOCOLATE_FAILURE_MODES, ChocolateProductEntry, FailureMode, FailureSeverity, lookupChocolateFailureModes() (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.22
Nodes (9): detectHardConstraintViolation(), evaluateObjectives(), RISK_RANK, cryptoRandomId(), scoreCandidate(), computeFreezing(), FREEZING_SOLUTES, FreezingFlag (+1 more)

### Community 60 - "Community 60"
Cohesion: 0.23
Nodes (11): clamp(), computeHeatPenetration(), HeatPenetrationFlag, HeatPenetrationInput, HeatPenetrationResult, METHOD_H, meat, ConvectionRegime (+3 more)

### Community 61 - "Community 61"
Cohesion: 0.40
Nodes (11): temperatureAtDepth(), besselJ0(), besselJ1(), coefficientC1(), eigenResidual(), firstEigenvalue(), fourierForCenterTheta(), LAMBDA_INF (+3 more)

### Community 62 - "Community 62"
Cohesion: 0.22
Nodes (11): AIR, computeSurfaceCoefficient(), fluidAt(), FluidPoint, interp(), nusseltForced(), nusseltNatural(), OIL (+3 more)

### Community 63 - "Community 63"
Cohesion: 0.17
Nodes (7): __dirname, enFiles, localesRoot, OTHER_LANGS, referenceFiles, repoRoot, report

### Community 64 - "Community 64"
Cohesion: 0.32
Nodes (9): ALLERGEN_PATTERNS, AllergenCertainty, AllergenFlag, deriveAllergens(), identifyCrossContactRisks(), computeCrossContactRisks(), crossContactRisksEqual(), normalizeRisks() (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.27
Nodes (10): compareNumbers(), evaluateStepCondition(), formatNumeric(), readPhysicsMetric(), renderStepTemplate(), resolveSlot(), RISK_RANK, ctx (+2 more)

### Community 66 - "Community 66"
Cohesion: 0.35
Nodes (9): computeDryingRate(), DryingFlag, DryingRateInput, DryingRateResult, computePsychrometrics(), latentHeatVaporization(), PsychrometricInput, PsychrometricState (+1 more)

### Community 67 - "Community 67"
Cohesion: 0.21
Nodes (11): cacheKey(), Lang, memoryCache, pending, PendingItem, persistentCache, processBatch(), queueTranslation() (+3 more)

### Community 69 - "Community 69"
Cohesion: 0.36
Nodes (7): jaccardSimilarity(), nameMatchScore(), normalizeVendorName(), tokenize(), runVendorResolution(), VendorMatchInput, VendorMatchResult

### Community 70 - "Community 70"
Cohesion: 0.18
Nodes (7): ATTR_RE, __dirname, findings, IGNORED_PATHS, repoRoot, srcRoot, USER_FACING_ATTRS

### Community 71 - "Community 71"
Cohesion: 0.18
Nodes (8): DIFFUSANTS, FREEZE_ENV, FREEZE_ENVS, GEOMETRIES, METHODS, SURFACE_BY_METHOD, TransportPanelProps, CookingMethod

### Community 72 - "Community 72"
Cohesion: 0.27
Nodes (9): classifyBand(), computeDoneness(), DonenessBand, DonenessFlag, DonenessInput, estimateConductivity(), estimateSpecificHeat(), CANDY (+1 more)

### Community 73 - "Community 73"
Cohesion: 0.29
Nodes (7): longStorage, FATTY, refStorage, buildProcessProfile(), finalizeProfile(), profileFromSegments(), ProcessSegment

### Community 74 - "Community 74"
Cohesion: 0.22
Nodes (9): computeFormulaBalance(), FormulaBalanceFlag, FormulaBalanceMasses, FormulaBalanceRatios, FormulaFault, FormulaFaultKind, FormulaFaultSeverity, balancedCake() (+1 more)

### Community 75 - "Community 75"
Cohesion: 0.31
Nodes (6): BillStatus, PaymentMethod, recordPayment, RecordPaymentInput, RecordPaymentResult, { getFirestoreMock, runTransactionMock, collectionMock }

### Community 76 - "Community 76"
Cohesion: 0.27
Nodes (8): Culture, CultureProfile, CULTURES, ferment(), FERMENTABLE, FermentParams, ProductSpecies, rossoGamma()

### Community 77 - "Community 77"
Cohesion: 0.24
Nodes (7): AromaBand, AromaReleaseClass, AromaReleaseFlag, classifyBand(), computeAromaRelease(), POLARITY_ANCHORS, VolatilePolarity

### Community 78 - "Community 78"
Cohesion: 0.31
Nodes (5): onLotUpdate, shouldArchiveLot(), resolveVendor, ResolveVendorInput, translateBatch

### Community 79 - "Community 79"
Cohesion: 0.36
Nodes (5): computeShoppingListQuantity(), computeStockUpdate(), db, onTransactionCreate, computeWAC()

### Community 80 - "Community 80"
Cohesion: 0.36
Nodes (6): Layout(), PageSpinner(), logOut(), signInAsGuest(), useAlerts(), subscribeToUserAlerts()

### Community 81 - "Community 81"
Cohesion: 0.28
Nodes (7): clamp01(), computeProteinSet(), PROTEIN_PROFILES, ProteinProfile, ProteinSetBand, ProteinSetResult, ProteinType

### Community 82 - "Community 82"
Cohesion: 0.22
Nodes (8): BillAllocation, BillLineItem, BillPaymentInstruction, BillTaxLine, BillVendorResolution, ExpenseCategoryParent, PaymentMethod, VendorContact

### Community 83 - "Community 83"
Cohesion: 0.39
Nodes (6): classifyRisk(), computeSucroseCrystallization(), CrystallizationFlag, GrainingRisk, SUCROSE_SOLUBILITY, sucroseSolubilityAt()

### Community 84 - "Community 84"
Cohesion: 0.43
Nodes (4): CsvImportModal(), CsvImportModalProps, ParsedNumber, parseLocaleNumber()

### Community 85 - "Community 85"
Cohesion: 0.43
Nodes (5): classifyBand(), computeFoam(), FoamBand, FoamFlag, saturating()

### Community 86 - "Community 86"
Cohesion: 0.38
Nodes (5): classifyConsistency(), computeRheology(), ConsistencyBand, FlowType, RheologyFlag

### Community 87 - "Community 87"
Cohesion: 0.80
Nodes (4): nextNOccurrences(), nextOccurrence(), parseRRule(), previousOccurrence()

### Community 88 - "Community 88"
Cohesion: 0.40
Nodes (4): locales, localizer, ProductionCalendarProps, ProductionRun

### Community 89 - "Community 89"
Cohesion: 0.40
Nodes (4): AW_BANDS_FOR_TABLE, faultColor(), RecipePhysicsDetail(), RecipePhysicsDetailProps

### Community 90 - "Community 90"
Cohesion: 0.40
Nodes (5): dependencies, firebase-admin, firebase-functions, @google/genai, functions

### Community 91 - "Community 91"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 92 - "Community 92"
Cohesion: 0.70
Nodes (4): run(), say(), harden-gcp.sh script, warn()

### Community 93 - "Community 93"
Cohesion: 0.50
Nodes (4): db, __dirname, migrate(), parseLegacyString()

### Community 94 - "Community 94"
Cohesion: 0.40
Nodes (4): CLASSIC_GANACHE, DARK_70, HEAVY_CREAM, RASPBERRY_PUREE

### Community 95 - "Community 95"
Cohesion: 0.60
Nodes (4): analyzeRecipe(), dominantProvenance(), ProvenanceHealth, RecipeAudit()

### Community 97 - "Community 97"
Cohesion: 0.67
Nodes (3): RequireAdmin(), RequireAdminProps, useUserRole()

## Knowledge Gaps
- **463 isolated node(s):** `name`, `build`, `test`, `serve`, `shell` (+458 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 15` to `Community 32`, `Community 91`, `Community 31`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `react` connect `Community 32` to `Community 49`, `Community 95`, `Community 15`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `RecipeDetail()` connect `Community 32` to `Community 64`, `Community 65`, `Community 3`, `Community 7`, `Community 10`, `Community 43`, `Community 17`, `Community 18`, `Community 56`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `name`, `build`, `test` to the rest of the system?**
  _464 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06479113384484228 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10448979591836735 - nodes in this community are weakly interconnected._