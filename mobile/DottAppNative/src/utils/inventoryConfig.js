/**
 * Business Type-Specific Inventory Configuration
 * Provides tailored inventory settings for 100+ business types
 */

export const getInventoryConfig = (businessType) => {
  const configs = {
    // ============================================
    // TRANSPORT & DELIVERY SERVICES
    // ============================================
    'COURIER': {
      enabled: true,
      menuLabel: 'Delivery Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Packaging Materials', 'Labels & Tags', 'Safety Equipment', 'Vehicle Supplies'],
      requiredFields: ['name', 'quantity_on_hand'],
      optionalFields: ['reorder_point', 'supplier'],
      hiddenFields: ['expiry_date', 'batch_number'],
      features: {
        vehicleTracking: true,
        packageTracking: true,
        routeOptimization: true,
        fuelTracking: true,
      },
      quickAddTemplates: [
        { name: 'Shipping Box - Small', category: 'Packaging Materials', unit: 'piece' },
        { name: 'Bubble Wrap', category: 'Packaging Materials', unit: 'roll' },
        { name: 'Delivery Labels', category: 'Labels & Tags', unit: 'sheet' },
      ],
    },
    
    'TAXI_DRIVER': {
      enabled: true,
      menuLabel: 'Vehicle Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: false, // Minimal inventory needs
      categories: ['Maintenance Items', 'Cleaning Supplies', 'Safety Equipment'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        maintenanceTracking: true,
        fuelTracking: true,
      },
    },
    
    'TRUCK_DRIVER': {
      enabled: true,
      menuLabel: 'Truck Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Maintenance Parts', 'Safety Equipment', 'Cargo Supplies', 'Documents'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        maintenanceScheduling: true,
        complianceTracking: true,
        fuelTracking: true,
        cargoTracking: true,
      },
    },
    
    'BODA_BODA': {
      enabled: true,
      menuLabel: 'Bike Supplies',
      itemSingular: 'Part',
      itemPlural: 'Parts',
      showInMenu: true,
      categories: ['Spare Parts', 'Safety Gear', 'Maintenance Items'],
      requiredFields: ['name', 'quantity_on_hand', 'cost'],
      features: {
        maintenanceTracking: true,
        helmetTracking: true,
      },
    },
    
    'MOVING_SERVICES': {
      enabled: true,
      menuLabel: 'Moving Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Moving Equipment', 'Packing Materials', 'Tools', 'Vehicle Parts'],
      requiredFields: ['name', 'quantity_on_hand', 'material_type'],
      features: {
        equipmentRental: true,
        packingMaterials: true,
        vehicleTracking: true,
      },
      quickAddTemplates: [
        { name: 'Moving Dolly', category: 'Moving Equipment', unit: 'each', material_type: 'reusable' },
        { name: 'Furniture Blankets', category: 'Moving Equipment', unit: 'each', material_type: 'reusable' },
        { name: 'Packing Boxes - Large', category: 'Packing Materials', unit: 'piece' },
      ],
    },

    // ============================================
    // HOME & TRADE SERVICES
    // ============================================
    'PLUMBER': {
      enabled: true,
      menuLabel: 'Parts & Tools',
      itemSingular: 'Part',
      itemPlural: 'Parts',
      showInMenu: true,
      categories: ['Tools', 'Pipes & Fittings', 'Valves', 'Sealants & Adhesives', 'Safety Equipment'],
      requiredFields: ['name', 'quantity_on_hand', 'material_type', 'cost'],
      optionalFields: ['supplier', 'reorder_point', 'location'],
      features: {
        billOfMaterials: true,
        jobLinking: true,
        toolCheckout: true,
        supplierCatalog: true,
      },
      quickAddTemplates: [
        { name: 'Copper Pipe 1/2"', category: 'Pipes & Fittings', unit: 'feet', material_type: 'consumable' },
        { name: 'PVC Elbow 90° 1/2"', category: 'Pipes & Fittings', unit: 'piece', material_type: 'consumable' },
        { name: 'Pipe Wrench 14"', category: 'Tools', unit: 'each', material_type: 'reusable' },
        { name: 'Teflon Tape', category: 'Sealants & Adhesives', unit: 'roll', material_type: 'consumable' },
      ],
    },
    
    'ELECTRICIAN': {
      enabled: true,
      menuLabel: 'Electrical Parts',
      itemSingular: 'Part',
      itemPlural: 'Parts',
      showInMenu: true,
      categories: ['Tools', 'Wiring & Cables', 'Switches & Outlets', 'Breakers & Panels', 'Safety Equipment'],
      requiredFields: ['name', 'quantity_on_hand', 'material_type', 'voltage_rating'],
      optionalFields: ['amperage', 'manufacturer', 'certification'],
      features: {
        billOfMaterials: true,
        jobLinking: true,
        certificationTracking: true,
        safetyCompliance: true,
      },
      quickAddTemplates: [
        { name: '12 AWG Wire', category: 'Wiring & Cables', unit: 'feet', material_type: 'consumable' },
        { name: 'Wall Outlet Duplex', category: 'Switches & Outlets', unit: 'piece', material_type: 'consumable' },
        { name: '20A Circuit Breaker', category: 'Breakers & Panels', unit: 'piece', material_type: 'consumable' },
      ],
    },
    
    'CARPENTER': {
      enabled: true,
      menuLabel: 'Materials & Tools',
      itemSingular: 'Material',
      itemPlural: 'Materials',
      showInMenu: true,
      categories: ['Lumber', 'Hardware', 'Tools', 'Finishes', 'Adhesives', 'Safety Equipment'],
      requiredFields: ['name', 'quantity_on_hand', 'material_type', 'dimensions'],
      optionalFields: ['wood_type', 'grade', 'finish'],
      features: {
        cutListGeneration: true,
        projectMaterials: true,
        wasteTracking: true,
        toolMaintenance: true,
      },
      quickAddTemplates: [
        { name: '2x4 Pine Lumber', category: 'Lumber', unit: 'board feet', dimensions: '2"x4"x8\'' },
        { name: 'Wood Screws #8 1.5"', category: 'Hardware', unit: 'box' },
        { name: 'Wood Glue', category: 'Adhesives', unit: 'bottle' },
      ],
    },
    
    'PAINTER': {
      enabled: true,
      menuLabel: 'Paint & Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Paints', 'Primers', 'Brushes & Rollers', 'Tapes & Plastics', 'Solvents', 'Safety Equipment'],
      requiredFields: ['name', 'quantity_on_hand', 'color_code', 'finish_type'],
      optionalFields: ['brand', 'coverage_area', 'drying_time'],
      features: {
        colorMatching: true,
        coverageCalculator: true,
        projectTracking: true,
        customColorMixing: true,
      },
      quickAddTemplates: [
        { name: 'Interior Wall Paint - White', category: 'Paints', unit: 'gallon', finish_type: 'matte' },
        { name: 'Primer - All Purpose', category: 'Primers', unit: 'gallon' },
        { name: 'Paint Roller 9"', category: 'Brushes & Rollers', unit: 'each' },
      ],
    },
    
    'MASON': {
      enabled: true,
      menuLabel: 'Building Materials',
      itemSingular: 'Material',
      itemPlural: 'Materials',
      showInMenu: true,
      categories: ['Cement & Concrete', 'Bricks & Blocks', 'Sand & Aggregates', 'Tools', 'Reinforcement'],
      requiredFields: ['name', 'quantity_on_hand', 'unit', 'material_type'],
      features: {
        mixRatioCalculator: true,
        projectEstimation: true,
        wasteTracking: true,
        strengthTesting: true,
      },
    },
    
    'WELDER': {
      enabled: true,
      menuLabel: 'Welding Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Welding Rods', 'Gases', 'Safety Equipment', 'Metal Stock', 'Tools'],
      requiredFields: ['name', 'quantity_on_hand', 'material_type', 'specification'],
      features: {
        gasTracking: true,
        certificationTracking: true,
        projectMaterials: true,
        safetyCompliance: true,
      },
    },
    
    'MECHANIC': {
      enabled: true,
      menuLabel: 'Auto Parts',
      itemSingular: 'Part',
      itemPlural: 'Parts',
      showInMenu: true,
      categories: ['Engine Parts', 'Brake Parts', 'Filters', 'Fluids', 'Tools', 'Consumables'],
      requiredFields: ['name', 'part_number', 'quantity_on_hand', 'compatibility'],
      optionalFields: ['manufacturer', 'oem_number', 'condition'],
      features: {
        partCompatibility: true,
        vinLookup: true,
        warrantyTracking: true,
        coreExchange: true,
      },
      quickAddTemplates: [
        { name: 'Engine Oil 5W-30', category: 'Fluids', unit: 'quart' },
        { name: 'Air Filter', category: 'Filters', unit: 'each' },
        { name: 'Brake Pads - Front', category: 'Brake Parts', unit: 'set' },
      ],
    },
    
    'HVAC_TECH': {
      enabled: true,
      menuLabel: 'HVAC Parts',
      itemSingular: 'Part',
      itemPlural: 'Parts',
      showInMenu: true,
      categories: ['Filters', 'Refrigerants', 'Components', 'Tools', 'Controls'],
      requiredFields: ['name', 'part_number', 'quantity_on_hand', 'system_type'],
      features: {
        refrigerantTracking: true,
        certificationRequired: true,
        maintenanceSchedules: true,
        warrantyTracking: true,
      },
    },
    
    'HANDYMAN': {
      enabled: true,
      menuLabel: 'Tools & Supplies',
      itemSingular: 'Item',
      itemPlural: 'Items',
      showInMenu: true,
      categories: ['Tools', 'Hardware', 'Electrical', 'Plumbing', 'Paint', 'Safety'],
      requiredFields: ['name', 'quantity_on_hand', 'category'],
      features: {
        multiCategorySupport: true,
        toolMaintenance: true,
        projectTracking: true,
      },
    },
    
    'CLEANER': {
      enabled: true,
      menuLabel: 'Cleaning Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Cleaning Chemicals', 'Equipment', 'Tools', 'Consumables', 'Safety Gear'],
      requiredFields: ['name', 'quantity_on_hand', 'concentration'],
      optionalFields: ['safety_data_sheet', 'dilution_ratio'],
      features: {
        chemicalSafety: true,
        equipmentMaintenance: true,
        clientSupplies: true,
      },
      quickAddTemplates: [
        { name: 'All-Purpose Cleaner', category: 'Cleaning Chemicals', unit: 'gallon' },
        { name: 'Microfiber Cloths', category: 'Consumables', unit: 'pack' },
        { name: 'Mop Heads', category: 'Equipment', unit: 'each' },
      ],
    },
    
    'LANDSCAPER': {
      enabled: true,
      menuLabel: 'Landscaping Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Plants & Seeds', 'Fertilizers', 'Tools', 'Hardscape Materials', 'Irrigation'],
      requiredFields: ['name', 'quantity_on_hand', 'category'],
      optionalFields: ['seasonal', 'growth_zone', 'coverage_area'],
      features: {
        seasonalTracking: true,
        plantDatabase: true,
        irrigationDesign: true,
        maintenanceSchedules: true,
      },
    },
    
    'PEST_CONTROL': {
      enabled: true,
      menuLabel: 'Pest Control Supplies',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: true,
      categories: ['Pesticides', 'Traps & Baits', 'Equipment', 'Safety Gear', 'Tools'],
      requiredFields: ['name', 'epa_number', 'active_ingredient', 'quantity_on_hand'],
      optionalFields: ['target_pests', 'application_rate', 'restricted_use'],
      features: {
        regulatoryCompliance: true,
        applicationTracking: true,
        safetyDataSheets: true,
        licenseTracking: true,
      },
    },

    // ============================================
    // PROFESSIONAL SERVICES
    // ============================================
    'CONSULTANT': {
      enabled: false, // Minimal inventory needs
      menuLabel: 'Office Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: false,
      categories: ['Office Supplies', 'Technology', 'Reference Materials'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        minimal: true,
      },
    },
    
    'ACCOUNTANT': {
      enabled: true,
      menuLabel: 'Office Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: false,
      categories: ['Office Supplies', 'Software Licenses', 'Reference Materials'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        licenseTracking: true,
        subscriptionManagement: true,
      },
    },
    
    'LAWYER': {
      enabled: true,
      menuLabel: 'Office Resources',
      itemSingular: 'Resource',
      itemPlural: 'Resources',
      showInMenu: false,
      categories: ['Legal Forms', 'Office Supplies', 'Reference Materials', 'Technology'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        documentTemplates: true,
        libraryManagement: true,
      },
    },
    
    'REAL_ESTATE_AGENT': {
      enabled: true,
      menuLabel: 'Marketing Materials',
      itemSingular: 'Material',
      itemPlural: 'Materials',
      showInMenu: true,
      categories: ['Signs & Banners', 'Brochures', 'Business Cards', 'Promotional Items', 'Office Supplies'],
      requiredFields: ['name', 'quantity_on_hand', 'cost'],
      features: {
        marketingMaterials: true,
        propertyPackets: true,
        signManagement: true,
      },
    },
    
    'INSURANCE_AGENT': {
      enabled: true,
      menuLabel: 'Office Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: false,
      categories: ['Forms & Documents', 'Marketing Materials', 'Office Supplies'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        formManagement: true,
        marketingMaterials: true,
      },
    },
    
    'FINANCIAL_ADVISOR': {
      enabled: false,
      menuLabel: 'Office Supplies',
      showInMenu: false,
    },
    
    'TAX_PREPARER': {
      enabled: true,
      menuLabel: 'Tax Forms & Supplies',
      itemSingular: 'Item',
      itemPlural: 'Items',
      showInMenu: false,
      categories: ['Tax Forms', 'Office Supplies', 'Software'],
      requiredFields: ['name', 'tax_year', 'quantity_on_hand'],
      features: {
        formTracking: true,
        yearlyUpdates: true,
      },
    },
    
    'TRANSLATOR': {
      enabled: false,
      menuLabel: 'Resources',
      showInMenu: false,
    },

    // ============================================
    // CREATIVE & DIGITAL SERVICES
    // ============================================
    'PHOTOGRAPHER': {
      enabled: true,
      menuLabel: 'Photography Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Cameras', 'Lenses', 'Lighting', 'Accessories', 'Props', 'Consumables'],
      requiredFields: ['name', 'serial_number', 'value', 'condition'],
      optionalFields: ['purchase_date', 'warranty_expiry', 'insurance_value'],
      features: {
        equipmentTracking: true,
        maintenanceSchedules: true,
        insuranceTracking: true,
        rentalManagement: true,
      },
      quickAddTemplates: [
        { name: 'Camera Body', category: 'Cameras', unit: 'each', material_type: 'reusable' },
        { name: 'Memory Card 64GB', category: 'Accessories', unit: 'each' },
        { name: 'Studio Backdrop', category: 'Props', unit: 'each' },
      ],
    },
    
    'VIDEOGRAPHER': {
      enabled: true,
      menuLabel: 'Video Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Cameras', 'Audio Equipment', 'Lighting', 'Accessories', 'Storage Media'],
      requiredFields: ['name', 'serial_number', 'value', 'condition'],
      features: {
        equipmentTracking: true,
        projectGearLists: true,
        maintenanceTracking: true,
        rentalManagement: true,
      },
    },
    
    'GRAPHIC_DESIGNER': {
      enabled: true,
      menuLabel: 'Design Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: false,
      categories: ['Software Licenses', 'Hardware', 'Print Materials', 'Office Supplies'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        licenseManagement: true,
        assetLibrary: true,
      },
    },
    
    'WEB_DEVELOPER': {
      enabled: true,
      menuLabel: 'Development Resources',
      itemSingular: 'Resource',
      itemPlural: 'Resources',
      showInMenu: false,
      categories: ['Software Licenses', 'Hardware', 'Subscriptions', 'Domains'],
      requiredFields: ['name', 'license_key', 'expiry_date'],
      features: {
        licenseTracking: true,
        domainManagement: true,
        subscriptionTracking: true,
      },
    },
    
    'APP_DEVELOPER': {
      enabled: true,
      menuLabel: 'Development Resources',
      itemSingular: 'Resource',
      itemPlural: 'Resources',
      showInMenu: false,
      categories: ['Software Licenses', 'Test Devices', 'Subscriptions', 'APIs'],
      requiredFields: ['name', 'license_type', 'expiry_date'],
      features: {
        deviceManagement: true,
        licenseTracking: true,
        apiKeyManagement: true,
      },
    },
    
    'CONTENT_CREATOR': {
      enabled: true,
      menuLabel: 'Content Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Recording Equipment', 'Lighting', 'Props', 'Software', 'Consumables'],
      requiredFields: ['name', 'quantity_on_hand', 'category'],
      features: {
        equipmentTracking: true,
        contentCalendar: true,
        propManagement: true,
      },
    },
    
    'SOCIAL_MEDIA_MANAGER': {
      enabled: true,
      menuLabel: 'Marketing Assets',
      itemSingular: 'Asset',
      itemPlural: 'Assets',
      showInMenu: false,
      categories: ['Software Tools', 'Stock Media', 'Templates', 'Subscriptions'],
      requiredFields: ['name', 'license_type'],
      features: {
        assetLibrary: true,
        subscriptionTracking: true,
      },
    },
    
    'WRITER': {
      enabled: false,
      menuLabel: 'Writing Resources',
      showInMenu: false,
    },
    
    'MUSICIAN': {
      enabled: true,
      menuLabel: 'Music Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Instruments', 'Audio Equipment', 'Accessories', 'Cables', 'Cases'],
      requiredFields: ['name', 'serial_number', 'value', 'condition'],
      features: {
        instrumentMaintenance: true,
        gigEquipmentLists: true,
        insuranceTracking: true,
      },
    },
    
    'ARTIST': {
      enabled: true,
      menuLabel: 'Art Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Paints', 'Brushes', 'Canvas', 'Drawing Materials', 'Tools', 'Framing'],
      requiredFields: ['name', 'quantity_on_hand', 'brand'],
      features: {
        colorInventory: true,
        projectMaterials: true,
        artworkCatalog: true,
      },
    },

    // ============================================
    // PERSONAL CARE & WELLNESS
    // ============================================
    'HAIRSTYLIST': {
      enabled: true,
      menuLabel: 'Salon Products',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: true,
      categories: ['Hair Color', 'Styling Products', 'Treatment Products', 'Tools', 'Retail Products'],
      requiredFields: ['name', 'brand', 'quantity_on_hand', 'product_line'],
      optionalFields: ['color_code', 'developer_volume', 'client_price', 'retail_price'],
      features: {
        colorFormulation: true,
        clientHistory: true,
        retailTracking: true,
        professionalTracking: true,
      },
      quickAddTemplates: [
        { name: 'Hair Color - Black', category: 'Hair Color', unit: 'tube' },
        { name: 'Developer 20 Vol', category: 'Hair Color', unit: 'bottle' },
        { name: 'Shampoo - Professional', category: 'Treatment Products', unit: 'bottle' },
      ],
    },
    
    'MAKEUP_ARTIST': {
      enabled: true,
      menuLabel: 'Makeup Products',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: true,
      categories: ['Foundation', 'Eye Makeup', 'Lip Products', 'Tools & Brushes', 'Skincare'],
      requiredFields: ['name', 'brand', 'shade', 'quantity_on_hand', 'expiry_date'],
      features: {
        shadeMatching: true,
        expiryTracking: true,
        sanitizationTracking: true,
        kitManagement: true,
      },
    },
    
    'NAIL_TECHNICIAN': {
      enabled: true,
      menuLabel: 'Nail Products',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: true,
      categories: ['Nail Polish', 'Gel Products', 'Tools', 'Care Products', 'Decorations'],
      requiredFields: ['name', 'brand', 'color_code', 'quantity_on_hand'],
      features: {
        colorCatalog: true,
        sanitizationTracking: true,
        clientPreferences: true,
      },
    },
    
    'MASSAGE_THERAPIST': {
      enabled: true,
      menuLabel: 'Massage Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Oils & Lotions', 'Linens', 'Equipment', 'Aromatherapy', 'Retail Products'],
      requiredFields: ['name', 'quantity_on_hand', 'product_type'],
      optionalFields: ['scent', 'ingredients', 'allergens'],
      features: {
        allergenTracking: true,
        linenManagement: true,
        clientPreferences: true,
      },
    },
    
    'PERSONAL_TRAINER': {
      enabled: true,
      menuLabel: 'Training Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Weights', 'Resistance Equipment', 'Cardio Equipment', 'Accessories', 'Supplements'],
      requiredFields: ['name', 'quantity_on_hand', 'condition'],
      features: {
        equipmentMaintenance: true,
        clientEquipment: true,
        supplementTracking: true,
      },
    },
    
    'YOGA_INSTRUCTOR': {
      enabled: true,
      menuLabel: 'Yoga Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Mats', 'Blocks & Straps', 'Bolsters', 'Cleaning Supplies', 'Retail Items'],
      requiredFields: ['name', 'quantity_on_hand', 'condition'],
      features: {
        equipmentSanitization: true,
        studioSupplies: true,
        retailTracking: true,
      },
    },
    
    'NUTRITIONIST': {
      enabled: true,
      menuLabel: 'Nutrition Products',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: false,
      categories: ['Supplements', 'Educational Materials', 'Testing Kits', 'Meal Plans'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        supplementDatabase: true,
        educationalMaterials: true,
      },
    },
    
    'LIFE_COACH': {
      enabled: false,
      menuLabel: 'Coaching Materials',
      showInMenu: false,
    },

    // ============================================
    // EDUCATION & TRAINING
    // ============================================
    'TUTOR': {
      enabled: true,
      menuLabel: 'Teaching Materials',
      itemSingular: 'Material',
      itemPlural: 'Materials',
      showInMenu: false,
      categories: ['Textbooks', 'Workbooks', 'Supplies', 'Digital Resources'],
      requiredFields: ['name', 'subject', 'grade_level'],
      features: {
        curriculumTracking: true,
        resourceLibrary: true,
      },
    },
    
    'LANGUAGE_TEACHER': {
      enabled: true,
      menuLabel: 'Teaching Resources',
      itemSingular: 'Resource',
      itemPlural: 'Resources',
      showInMenu: false,
      categories: ['Textbooks', 'Audio Materials', 'Visual Aids', 'Games', 'Digital Resources'],
      requiredFields: ['name', 'language', 'level'],
      features: {
        levelTracking: true,
        resourceLibrary: true,
      },
    },
    
    'MUSIC_TEACHER': {
      enabled: true,
      menuLabel: 'Music Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Sheet Music', 'Instruments', 'Accessories', 'Books', 'Equipment'],
      requiredFields: ['name', 'quantity_on_hand', 'category'],
      features: {
        sheetMusicLibrary: true,
        instrumentRental: true,
        practiceRoomSupplies: true,
      },
    },
    
    'DRIVING_INSTRUCTOR': {
      enabled: true,
      menuLabel: 'Training Materials',
      itemSingular: 'Material',
      itemPlural: 'Materials',
      showInMenu: false,
      categories: ['Training Materials', 'Vehicle Supplies', 'Safety Equipment', 'Documentation'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        vehicleMaintenance: true,
        trainingMaterials: true,
      },
    },
    
    'SPORTS_COACH': {
      enabled: true,
      menuLabel: 'Sports Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Training Equipment', 'Team Gear', 'Safety Equipment', 'First Aid', 'Uniforms'],
      requiredFields: ['name', 'quantity_on_hand', 'condition', 'size'],
      features: {
        teamEquipment: true,
        uniformManagement: true,
        maintenanceTracking: true,
      },
    },
    
    'SKILLS_TRAINER': {
      enabled: true,
      menuLabel: 'Training Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: false,
      categories: ['Training Materials', 'Equipment', 'Consumables', 'Certification Materials'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        certificationTracking: true,
        trainingMaterials: true,
      },
    },

    // ============================================
    // SPECIALIZED SERVICES
    // ============================================
    'TAILOR': {
      enabled: true,
      menuLabel: 'Sewing Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Fabrics', 'Threads', 'Buttons & Zippers', 'Tools', 'Patterns', 'Trimmings'],
      requiredFields: ['name', 'quantity_on_hand', 'color', 'material'],
      optionalFields: ['width', 'pattern', 'weight'],
      features: {
        fabricInventory: true,
        customerMeasurements: true,
        patternLibrary: true,
        orderTracking: true,
      },
      quickAddTemplates: [
        { name: 'Cotton Fabric - White', category: 'Fabrics', unit: 'yards' },
        { name: 'Thread - Black', category: 'Threads', unit: 'spool' },
        { name: 'Button - 4 Hole', category: 'Buttons & Zippers', unit: 'dozen' },
      ],
    },
    
    'COBBLER': {
      enabled: true,
      menuLabel: 'Shoe Repair Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Leather', 'Soles & Heels', 'Adhesives', 'Tools', 'Accessories', 'Polishes'],
      requiredFields: ['name', 'quantity_on_hand', 'size_range'],
      features: {
        materialTracking: true,
        repairTracking: true,
        customerOrders: true,
      },
    },
    
    'LOCKSMITH': {
      enabled: true,
      menuLabel: 'Lock & Key Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Locks', 'Keys & Blanks', 'Tools', 'Parts', 'Security Hardware'],
      requiredFields: ['name', 'part_number', 'quantity_on_hand', 'brand'],
      features: {
        keyCodeDatabase: true,
        securityCompliance: true,
        emergencyStock: true,
      },
    },
    
    'SECURITY_GUARD': {
      enabled: true,
      menuLabel: 'Security Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Uniforms', 'Communication Equipment', 'Safety Gear', 'Documentation', 'First Aid'],
      requiredFields: ['name', 'quantity_on_hand', 'condition'],
      features: {
        uniformTracking: true,
        equipmentAssignment: true,
        certificationTracking: true,
      },
    },
    
    'EVENT_PLANNER': {
      enabled: true,
      menuLabel: 'Event Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Decorations', 'Linens', 'Tableware', 'Equipment', 'Props', 'Consumables'],
      requiredFields: ['name', 'quantity_on_hand', 'category', 'condition'],
      optionalFields: ['color', 'theme', 'rental_price'],
      features: {
        eventInventory: true,
        rentalTracking: true,
        themePackages: true,
        vendorSupplies: true,
      },
    },
    
    'CATERER': {
      enabled: true,
      menuLabel: 'Catering Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Serving Equipment', 'Tableware', 'Linens', 'Food Containers', 'Cooking Equipment'],
      requiredFields: ['name', 'quantity_on_hand', 'capacity'],
      features: {
        eventInventory: true,
        menuPlanning: true,
        equipmentRental: true,
        portionCalculator: true,
      },
    },
    
    'TOUR_GUIDE': {
      enabled: true,
      menuLabel: 'Tour Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: false,
      categories: ['Audio Equipment', 'Safety Gear', 'Maps & Guides', 'First Aid', 'Communication'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        groupEquipment: true,
        safetyCompliance: true,
      },
    },
    
    'PET_GROOMER': {
      enabled: true,
      menuLabel: 'Grooming Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Shampoos & Conditioners', 'Tools', 'Equipment', 'Safety Gear', 'Retail Products'],
      requiredFields: ['name', 'brand', 'quantity_on_hand', 'pet_type'],
      features: {
        productSafety: true,
        toolMaintenance: true,
        retailTracking: true,
      },
    },
    
    'VETERINARY_ASSISTANT': {
      enabled: true,
      menuLabel: 'Veterinary Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Medical Supplies', 'Medications', 'Equipment', 'Pet Food', 'Retail Products'],
      requiredFields: ['name', 'quantity_on_hand', 'expiry_date'],
      features: {
        medicationTracking: true,
        expiryManagement: true,
        prescriptionRequired: true,
      },
    },

    // ============================================
    // RETAIL & COMMERCE
    // ============================================
    'RETAIL_STORE': {
      enabled: true,
      menuLabel: 'Products',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: true,
      categories: [], // Dynamic based on store type
      requiredFields: ['name', 'sku', 'price', 'quantity_on_hand'],
      optionalFields: ['barcode', 'supplier', 'category', 'brand', 'size', 'color'],
      features: {
        barcodeScanning: true,
        categoryManagement: true,
        priceTagPrinting: true,
        seasonalTracking: true,
        multiLocation: true,
        posIntegration: true,
      },
    },
    
    'GROCERY_MARKET': {
      enabled: true,
      menuLabel: 'Grocery Stock',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: true,
      categories: ['Fresh Produce', 'Dairy', 'Meat & Seafood', 'Bakery', 'Packaged Goods', 'Beverages'],
      requiredFields: ['name', 'sku', 'price', 'quantity_on_hand', 'expiry_date'],
      optionalFields: ['batch_number', 'supplier', 'origin_country'],
      features: {
        expiryTracking: true,
        batchTracking: true,
        temperatureMonitoring: true,
        wasteTracking: true,
        supplierOrdering: true,
        weightBasedPricing: true,
      },
    },
    
    'FASHION_CLOTHING': {
      enabled: true,
      menuLabel: 'Fashion Inventory',
      itemSingular: 'Item',
      itemPlural: 'Items',
      showInMenu: true,
      categories: ['Mens Wear', 'Womens Wear', 'Children', 'Accessories', 'Footwear'],
      requiredFields: ['name', 'sku', 'price', 'size', 'color', 'quantity_on_hand'],
      optionalFields: ['brand', 'season', 'material', 'care_instructions'],
      features: {
        sizeColorMatrix: true,
        seasonalTracking: true,
        trendAnalysis: true,
        visualMerchandising: true,
      },
    },
    
    'ELECTRONICS_TECH': {
      enabled: true,
      menuLabel: 'Electronics Stock',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: true,
      categories: ['Computers', 'Mobile Devices', 'Audio', 'Gaming', 'Accessories', 'Components'],
      requiredFields: ['name', 'model_number', 'serial_number', 'price', 'quantity_on_hand'],
      optionalFields: ['manufacturer', 'warranty_period', 'specifications'],
      features: {
        serialNumberTracking: true,
        warrantyManagement: true,
        technicalSpecs: true,
        bundleManagement: true,
      },
    },
    
    'HARDWARE_BUILDING': {
      enabled: true,
      menuLabel: 'Hardware Stock',
      itemSingular: 'Item',
      itemPlural: 'Items',
      showInMenu: true,
      categories: ['Tools', 'Building Materials', 'Electrical', 'Plumbing', 'Paint', 'Garden'],
      requiredFields: ['name', 'sku', 'price', 'quantity_on_hand', 'location'],
      optionalFields: ['brand', 'specifications', 'unit_of_measure'],
      features: {
        bulkPricing: true,
        contractorAccounts: true,
        specialOrders: true,
        locationMapping: true,
      },
    },
    
    'PHARMACY': {
      enabled: true,
      menuLabel: 'Medications',
      itemSingular: 'Medication',
      itemPlural: 'Medications',
      showInMenu: true,
      categories: ['Prescription Drugs', 'OTC Medications', 'Medical Devices', 'Health Products', 'Cosmetics'],
      requiredFields: ['name', 'generic_name', 'batch_number', 'expiry_date', 'manufacturer', 'quantity_on_hand'],
      optionalFields: ['controlled_substance_schedule', 'storage_requirements', 'ndc_code'],
      features: {
        prescriptionTracking: true,
        batchTracking: true,
        expiryManagement: true,
        regulatoryCompliance: true,
        drugInteractionWarnings: true,
        temperatureMonitoring: true,
        insuranceBilling: true,
      },
      validations: {
        expiryDate: 'minimum_30_days',
        batchNumber: 'required_format',
        controlledSubstance: 'dea_compliance',
      },
    },
    
    'BOOKSTORE_STATIONERY': {
      enabled: true,
      menuLabel: 'Books & Stationery',
      itemSingular: 'Item',
      itemPlural: 'Items',
      showInMenu: true,
      categories: ['Books', 'Stationery', 'Art Supplies', 'Office Supplies', 'Gifts'],
      requiredFields: ['name', 'isbn', 'price', 'quantity_on_hand'],
      optionalFields: ['author', 'publisher', 'category', 'publication_date'],
      features: {
        isbnLookup: true,
        specialOrders: true,
        consignmentTracking: true,
        textbookManagement: true,
      },
    },
    
    'ONLINE_STORE': {
      enabled: true,
      menuLabel: 'Online Inventory',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: true,
      categories: [], // Fully dynamic
      requiredFields: ['name', 'sku', 'price', 'quantity_on_hand', 'weight'],
      optionalFields: ['dimensions', 'shipping_class', 'digital_product'],
      features: {
        multiChannel: true,
        dropshipping: true,
        digitalProducts: true,
        shippingIntegration: true,
        warehouseSync: true,
      },
    },
    
    'MOBILE_MONEY': {
      enabled: true,
      menuLabel: 'Agent Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: false,
      categories: ['Forms', 'Marketing Materials', 'Equipment'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        floatManagement: true,
        commissionTracking: true,
      },
    },
    
    'FUEL_STATION': {
      enabled: true,
      menuLabel: 'Station Inventory',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: true,
      categories: ['Fuel', 'Lubricants', 'Convenience Items', 'Car Care', 'Beverages', 'Snacks'],
      requiredFields: ['name', 'price', 'quantity_on_hand'],
      optionalFields: ['tank_level', 'octane_rating'],
      features: {
        tankMonitoring: true,
        convenienceStore: true,
        loyaltyProgram: true,
        shiftReconciliation: true,
      },
    },

    // ============================================
    // FOOD & HOSPITALITY
    // ============================================
    'RESTAURANT_CAFE': {
      enabled: true,
      menuLabel: 'Ingredients & Supplies',
      itemSingular: 'Ingredient',
      itemPlural: 'Ingredients',
      showInMenu: true,
      categories: ['Food Items', 'Beverages', 'Packaging', 'Cleaning Supplies', 'Kitchen Equipment'],
      requiredFields: ['name', 'quantity_on_hand', 'unit', 'expiry_date', 'storage_temperature'],
      optionalFields: ['supplier', 'allergen_info', 'nutritional_info', 'origin'],
      features: {
        recipeCosting: true,
        menuEngineering: true,
        expiryTracking: true,
        wasteTracking: true,
        portionControl: true,
        allergenManagement: true,
        temperatureLogging: true,
        supplierOrdering: true,
      },
      customButtons: [
        { label: 'Daily Waste', icon: 'trash-outline', action: 'recordWaste' },
        { label: 'Recipe Cost', icon: 'calculator-outline', action: 'calculateRecipe' },
        { label: 'Order Supplies', icon: 'cart-outline', action: 'orderSupplies' },
      ],
      quickAddTemplates: [
        { name: 'Fresh Vegetables', category: 'Food Items', unit: 'kg' },
        { name: 'Coffee Beans', category: 'Beverages', unit: 'kg' },
        { name: 'Take-out Containers', category: 'Packaging', unit: 'pack' },
      ],
    },
    
    'FAST_FOOD': {
      enabled: true,
      menuLabel: 'Food Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Food Items', 'Beverages', 'Packaging', 'Condiments', 'Cleaning'],
      requiredFields: ['name', 'quantity_on_hand', 'expiry_date', 'par_level'],
      features: {
        parLevelManagement: true,
        wasteTracking: true,
        portionStandardization: true,
        supplierAutoOrdering: true,
      },
    },
    
    'BAKERY': {
      enabled: true,
      menuLabel: 'Baking Supplies',
      itemSingular: 'Ingredient',
      itemPlural: 'Ingredients',
      showInMenu: true,
      categories: ['Flour & Grains', 'Dairy', 'Sweeteners', 'Flavorings', 'Decorations', 'Packaging'],
      requiredFields: ['name', 'quantity_on_hand', 'unit', 'expiry_date'],
      optionalFields: ['batch_number', 'allergen_info'],
      features: {
        recipeScaling: true,
        batchProduction: true,
        shelfLifeTracking: true,
        preOrderManagement: true,
        nutritionalLabeling: true,
      },
    },
    
    'BAR_NIGHTCLUB': {
      enabled: true,
      menuLabel: 'Bar Inventory',
      itemSingular: 'Item',
      itemPlural: 'Items',
      showInMenu: true,
      categories: ['Spirits', 'Beer', 'Wine', 'Mixers', 'Garnishes', 'Glassware', 'Supplies'],
      requiredFields: ['name', 'brand', 'quantity_on_hand', 'pour_cost', 'bottle_size'],
      optionalFields: ['vintage', 'alcohol_content', 'distributor'],
      features: {
        pourCostAnalysis: true,
        bottleTracking: true,
        cocktailRecipes: true,
        inventorySpotChecks: true,
        shrinkageTracking: true,
      },
    },
    
    'HOTEL_HOSPITALITY': {
      enabled: true,
      menuLabel: 'Hotel Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Room Amenities', 'Linens', 'Cleaning Supplies', 'F&B Supplies', 'Maintenance'],
      requiredFields: ['name', 'quantity_on_hand', 'par_level', 'location'],
      features: {
        parLevelByRoom: true,
        linenRotation: true,
        minibarTracking: true,
        maintenanceSupplies: true,
        guestRequestItems: true,
      },
    },
    
    'GUEST_HOUSE': {
      enabled: true,
      menuLabel: 'Guest Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Room Supplies', 'Linens', 'Breakfast Items', 'Cleaning', 'Amenities'],
      requiredFields: ['name', 'quantity_on_hand', 'reorder_point'],
      features: {
        roomInventory: true,
        breakfastSupplies: true,
        linenManagement: true,
      },
    },
    
    'CATERING_SERVICE': {
      enabled: true,
      menuLabel: 'Catering Inventory',
      itemSingular: 'Item',
      itemPlural: 'Items',
      showInMenu: true,
      categories: ['Food Items', 'Equipment', 'Serving Ware', 'Linens', 'Decorations'],
      requiredFields: ['name', 'quantity_on_hand', 'serving_capacity'],
      features: {
        eventInventory: true,
        equipmentRental: true,
        menuCosting: true,
        portionCalculator: true,
      },
    },
    
    'FOOD_DELIVERY': {
      enabled: true,
      menuLabel: 'Delivery Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Packaging', 'Insulation', 'Utensils', 'Condiments', 'Marketing Materials'],
      requiredFields: ['name', 'quantity_on_hand', 'cost_per_unit'],
      features: {
        packagingCostTracking: true,
        deliveryKitManagement: true,
        brandedMaterials: true,
      },
    },

    // ============================================
    // HEALTHCARE
    // ============================================
    'MEDICAL_DENTAL': {
      enabled: true,
      menuLabel: 'Medical Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Medical Supplies', 'Medications', 'Equipment', 'PPE', 'Office Supplies'],
      requiredFields: ['name', 'quantity_on_hand', 'expiry_date', 'lot_number'],
      optionalFields: ['sterilization_date', 'manufacturer', 'reorder_point'],
      features: {
        sterilizationTracking: true,
        expiryManagement: true,
        lotTracking: true,
        regulatoryCompliance: true,
        equipmentCalibration: true,
      },
    },
    
    'VETERINARY': {
      enabled: true,
      menuLabel: 'Veterinary Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Medications', 'Medical Supplies', 'Surgical', 'Pet Food', 'Grooming'],
      requiredFields: ['name', 'quantity_on_hand', 'expiry_date'],
      optionalFields: ['species_specific', 'controlled_drug'],
      features: {
        medicationTracking: true,
        speciesSpecific: true,
        surgicalKits: true,
        prescriptionManagement: true,
      },
    },
    
    'LABORATORY': {
      enabled: true,
      menuLabel: 'Lab Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Reagents', 'Consumables', 'Equipment', 'Safety', 'Specimens'],
      requiredFields: ['name', 'quantity_on_hand', 'expiry_date', 'storage_conditions'],
      optionalFields: ['hazard_class', 'cas_number', 'purity'],
      features: {
        chemicalInventory: true,
        hazmatCompliance: true,
        equipmentCalibration: true,
        specimenTracking: true,
        chainOfCustody: true,
      },
    },
    
    'OPTICAL': {
      enabled: true,
      menuLabel: 'Optical Inventory',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: true,
      categories: ['Frames', 'Lenses', 'Contact Lenses', 'Solutions', 'Accessories'],
      requiredFields: ['name', 'brand', 'model', 'quantity_on_hand', 'price'],
      optionalFields: ['prescription_range', 'material', 'color'],
      features: {
        frameInventory: true,
        lensTracking: true,
        prescriptionManagement: true,
        insuranceIntegration: true,
      },
    },
    
    'PHYSIOTHERAPY': {
      enabled: true,
      menuLabel: 'Therapy Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Exercise Equipment', 'Modalities', 'Consumables', 'Braces & Supports'],
      requiredFields: ['name', 'quantity_on_hand', 'condition'],
      features: {
        equipmentMaintenance: true,
        patientEquipment: true,
        consumableTracking: true,
      },
    },
    
    'MENTAL_HEALTH': {
      enabled: false,
      menuLabel: 'Office Supplies',
      showInMenu: false,
    },
    
    'TRADITIONAL_MEDICINE': {
      enabled: true,
      menuLabel: 'Herbal Medicines',
      itemSingular: 'Medicine',
      itemPlural: 'Medicines',
      showInMenu: true,
      categories: ['Herbs', 'Preparations', 'Tinctures', 'Powders', 'Oils'],
      requiredFields: ['name', 'quantity_on_hand', 'preparation_date', 'potency'],
      features: {
        herbInventory: true,
        preparationTracking: true,
        potencyManagement: true,
      },
    },

    // ============================================
    // PROFESSIONAL SERVICES (FIRMS)
    // ============================================
    'CONSULTING_FIRM': {
      enabled: false,
      menuLabel: 'Office Supplies',
      showInMenu: false,
    },
    
    'LAW_FIRM': {
      enabled: true,
      menuLabel: 'Legal Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: false,
      categories: ['Legal Forms', 'Office Supplies', 'Library', 'Technology'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        libraryManagement: true,
        formTemplates: true,
      },
    },
    
    'ACCOUNTING_FIRM': {
      enabled: true,
      menuLabel: 'Office Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: false,
      categories: ['Tax Forms', 'Office Supplies', 'Software', 'Reference Materials'],
      requiredFields: ['name', 'tax_year', 'quantity_on_hand'],
      features: {
        formManagement: true,
        softwareLicenses: true,
      },
    },
    
    'REAL_ESTATE': {
      enabled: true,
      menuLabel: 'Marketing Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Signs', 'Marketing Materials', 'Staging Items', 'Office Supplies'],
      requiredFields: ['name', 'quantity_on_hand', 'location'],
      features: {
        signManagement: true,
        stagingInventory: true,
        marketingMaterials: true,
      },
    },
    
    'INSURANCE_COMPANY': {
      enabled: true,
      menuLabel: 'Office Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: false,
      categories: ['Forms', 'Marketing', 'Office Supplies'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        formManagement: true,
      },
    },
    
    'FINANCIAL_SERVICES': {
      enabled: false,
      menuLabel: 'Office Supplies',
      showInMenu: false,
    },
    
    'MARKETING_AGENCY': {
      enabled: true,
      menuLabel: 'Marketing Assets',
      itemSingular: 'Asset',
      itemPlural: 'Assets',
      showInMenu: false,
      categories: ['Print Materials', 'Promotional Items', 'Digital Assets', 'Equipment'],
      requiredFields: ['name', 'quantity_on_hand', 'client'],
      features: {
        clientInventory: true,
        assetLibrary: true,
        campaignMaterials: true,
      },
    },

    // ============================================
    // MANUFACTURING & PRODUCTION
    // ============================================
    'MANUFACTURING': {
      enabled: true,
      menuLabel: 'Materials & Products',
      itemSingular: 'Item',
      itemPlural: 'Items',
      showInMenu: true,
      categories: ['Raw Materials', 'Components', 'Work in Progress', 'Finished Products', 'Packaging'],
      requiredFields: ['name', 'part_number', 'quantity_on_hand', 'unit', 'stage'],
      optionalFields: ['batch_number', 'quality_grade', 'specification'],
      features: {
        billOfMaterials: true,
        productionPlanning: true,
        qualityControl: true,
        batchTracking: true,
        warehouseManagement: true,
        costAccounting: true,
      },
    },
    
    'FOOD_PROCESSING': {
      enabled: true,
      menuLabel: 'Processing Inventory',
      itemSingular: 'Item',
      itemPlural: 'Items',
      showInMenu: true,
      categories: ['Raw Materials', 'Ingredients', 'Packaging', 'Finished Products', 'By-products'],
      requiredFields: ['name', 'batch_number', 'quantity_on_hand', 'expiry_date', 'production_date'],
      features: {
        batchTracking: true,
        expiryManagement: true,
        qualityTesting: true,
        traceability: true,
        nutritionalLabeling: true,
        haccp: true,
      },
    },
    
    'TEXTILE_GARMENT': {
      enabled: true,
      menuLabel: 'Textile Inventory',
      itemSingular: 'Item',
      itemPlural: 'Items',
      showInMenu: true,
      categories: ['Fabrics', 'Threads', 'Accessories', 'Dyes', 'Finished Garments'],
      requiredFields: ['name', 'quantity_on_hand', 'color', 'material', 'width'],
      features: {
        rollTracking: true,
        colorManagement: true,
        sizeRuns: true,
        defectTracking: true,
        cuttingOptimization: true,
      },
    },
    
    'FURNITURE_MAKING': {
      enabled: true,
      menuLabel: 'Materials & Products',
      itemSingular: 'Item',
      itemPlural: 'Items',
      showInMenu: true,
      categories: ['Lumber', 'Hardware', 'Fabrics', 'Finishes', 'Work in Progress', 'Finished Products'],
      requiredFields: ['name', 'quantity_on_hand', 'dimensions', 'material'],
      features: {
        cutListOptimization: true,
        customOrders: true,
        finishTracking: true,
        assemblyManagement: true,
      },
    },
    
    'PRINTING_PUBLISHING': {
      enabled: true,
      menuLabel: 'Print Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Paper Stock', 'Inks', 'Plates', 'Binding Materials', 'Finished Products'],
      requiredFields: ['name', 'quantity_on_hand', 'size', 'weight'],
      features: {
        jobTracking: true,
        paperInventory: true,
        inkManagement: true,
        wasteTracking: true,
        jobCosting: true,
      },
    },
    
    'PACKAGING': {
      enabled: true,
      menuLabel: 'Packaging Materials',
      itemSingular: 'Material',
      itemPlural: 'Materials',
      showInMenu: true,
      categories: ['Raw Materials', 'Boxes', 'Labels', 'Fillers', 'Custom Packaging'],
      requiredFields: ['name', 'quantity_on_hand', 'dimensions', 'material_type'],
      features: {
        customDesigns: true,
        dieCutting: true,
        minimumOrders: true,
        sustainableOptions: true,
      },
    },

    // ============================================
    // TECHNOLOGY
    // ============================================
    'SOFTWARE_COMPANY': {
      enabled: true,
      menuLabel: 'Tech Resources',
      itemSingular: 'Resource',
      itemPlural: 'Resources',
      showInMenu: false,
      categories: ['Hardware', 'Software Licenses', 'Development Tools', 'Cloud Services'],
      requiredFields: ['name', 'license_key', 'expiry_date'],
      features: {
        licenseManagement: true,
        subscriptionTracking: true,
        assetManagement: true,
      },
    },
    
    'IT_SERVICES': {
      enabled: true,
      menuLabel: 'IT Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Hardware', 'Software', 'Cables', 'Components', 'Tools'],
      requiredFields: ['name', 'serial_number', 'quantity_on_hand', 'condition'],
      features: {
        assetTracking: true,
        warrantyManagement: true,
        clientEquipment: true,
        spareParts: true,
      },
    },
    
    'TELECOM': {
      enabled: true,
      menuLabel: 'Telecom Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Network Equipment', 'Cables', 'SIM Cards', 'Devices', 'Accessories'],
      requiredFields: ['name', 'serial_number', 'imei', 'quantity_on_hand'],
      features: {
        simManagement: true,
        deviceTracking: true,
        networkEquipment: true,
        activationTracking: true,
      },
    },
    
    'INTERNET_CAFE': {
      enabled: true,
      menuLabel: 'Cafe Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Computer Parts', 'Accessories', 'Stationery', 'Snacks', 'Beverages'],
      requiredFields: ['name', 'quantity_on_hand', 'location'],
      features: {
        computerMaintenance: true,
        accessoryTracking: true,
        snackInventory: true,
      },
    },
    
    'COMPUTER_REPAIR': {
      enabled: true,
      menuLabel: 'Repair Parts',
      itemSingular: 'Part',
      itemPlural: 'Parts',
      showInMenu: true,
      categories: ['Screens', 'Batteries', 'Keyboards', 'Components', 'Tools', 'Cables'],
      requiredFields: ['name', 'part_number', 'compatibility', 'quantity_on_hand'],
      features: {
        compatibilityMatrix: true,
        warrantyTracking: true,
        refurbishedParts: true,
        customerParts: true,
      },
    },
    
    'WEB_HOSTING': {
      enabled: false,
      menuLabel: 'Server Resources',
      showInMenu: false,
    },

    // ============================================
    // CONSTRUCTION & REAL ESTATE
    // ============================================
    'CONSTRUCTION': {
      enabled: true,
      menuLabel: 'Construction Materials',
      itemSingular: 'Material',
      itemPlural: 'Materials',
      showInMenu: true,
      categories: ['Building Materials', 'Tools', 'Equipment', 'Safety Gear', 'Hardware'],
      requiredFields: ['name', 'quantity_on_hand', 'unit', 'location'],
      optionalFields: ['project_allocation', 'supplier', 'delivery_date'],
      features: {
        projectAllocation: true,
        toolTracking: true,
        safetyCompliance: true,
        deliveryScheduling: true,
        wasteManagement: true,
      },
    },
    
    'ARCHITECTURE': {
      enabled: true,
      menuLabel: 'Design Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: false,
      categories: ['Drawing Supplies', 'Model Materials', 'Software', 'Reference Materials'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        projectMaterials: true,
        softwareLicenses: true,
      },
    },
    
    'PROPERTY_MANAGEMENT': {
      enabled: true,
      menuLabel: 'Maintenance Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Maintenance', 'Cleaning', 'Appliances', 'Keys & Locks', 'Emergency Supplies'],
      requiredFields: ['name', 'quantity_on_hand', 'property_location'],
      features: {
        propertySpecific: true,
        maintenanceTracking: true,
        keyManagement: true,
        emergencyStock: true,
      },
    },
    
    'INTERIOR_DESIGN': {
      enabled: true,
      menuLabel: 'Design Materials',
      itemSingular: 'Material',
      itemPlural: 'Materials',
      showInMenu: true,
      categories: ['Fabrics', 'Wallpapers', 'Samples', 'Furniture', 'Accessories'],
      requiredFields: ['name', 'quantity_on_hand', 'supplier', 'lead_time'],
      features: {
        sampleLibrary: true,
        clientSelections: true,
        orderTracking: true,
        vendorCatalogs: true,
      },
    },
    
    'LANDSCAPING_COMPANY': {
      enabled: true,
      menuLabel: 'Landscaping Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Plants', 'Mulch & Soil', 'Hardscape', 'Tools', 'Chemicals', 'Irrigation'],
      requiredFields: ['name', 'quantity_on_hand', 'unit', 'seasonal'],
      features: {
        seasonalInventory: true,
        bulkMaterials: true,
        plantCare: true,
        projectMaterials: true,
      },
    },

    // ============================================
    // TRANSPORT & LOGISTICS
    // ============================================
    'TRANSPORT_SERVICE': {
      enabled: true,
      menuLabel: 'Fleet Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Vehicle Parts', 'Fluids', 'Tires', 'Safety Equipment', 'Documentation'],
      requiredFields: ['name', 'quantity_on_hand', 'vehicle_compatibility'],
      features: {
        fleetMaintenance: true,
        fuelManagement: true,
        complianceTracking: true,
        vehicleAssignment: true,
      },
    },
    
    'LOGISTICS_FREIGHT': {
      enabled: true,
      menuLabel: 'Logistics Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Packaging', 'Pallets', 'Straps & Ties', 'Labels', 'Documentation'],
      requiredFields: ['name', 'quantity_on_hand', 'location'],
      features: {
        warehouseManagement: true,
        loadPlanning: true,
        trackingMaterials: true,
        crossDocking: true,
      },
    },
    
    'COURIER_COMPANY': {
      enabled: true,
      menuLabel: 'Courier Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Packaging', 'Labels', 'Uniforms', 'Devices', 'Vehicle Supplies'],
      requiredFields: ['name', 'quantity_on_hand', 'branch_location'],
      features: {
        branchInventory: true,
        uniformTracking: true,
        deviceManagement: true,
      },
    },
    
    'CAR_RENTAL': {
      enabled: true,
      menuLabel: 'Rental Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Cleaning Supplies', 'Documents', 'Accessories', 'Emergency Kits', 'Maintenance'],
      requiredFields: ['name', 'quantity_on_hand', 'per_vehicle_quantity'],
      features: {
        vehicleKits: true,
        cleaningSupplies: true,
        documentManagement: true,
      },
    },
    
    'TOUR_OPERATOR': {
      enabled: true,
      menuLabel: 'Tour Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Equipment', 'Safety Gear', 'Maps & Guides', 'First Aid', 'Refreshments'],
      requiredFields: ['name', 'quantity_on_hand', 'tour_type'],
      features: {
        tourEquipment: true,
        safetyCompliance: true,
        groupSupplies: true,
      },
    },
    
    'TRAVEL_AGENCY': {
      enabled: true,
      menuLabel: 'Agency Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: false,
      categories: ['Brochures', 'Travel Documents', 'Promotional Items', 'Office Supplies'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        brochureInventory: true,
        promotionalItems: true,
      },
    },

    // ============================================
    // EDUCATION & TRAINING (INSTITUTIONS)
    // ============================================
    'SCHOOL': {
      enabled: true,
      menuLabel: 'School Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Textbooks', 'Stationery', 'Lab Equipment', 'Sports Equipment', 'Cleaning'],
      requiredFields: ['name', 'quantity_on_hand', 'department', 'grade_level'],
      features: {
        departmentAllocation: true,
        textbookTracking: true,
        labInventory: true,
        sportsEquipment: true,
      },
    },
    
    'TRAINING_CENTER': {
      enabled: true,
      menuLabel: 'Training Materials',
      itemSingular: 'Material',
      itemPlural: 'Materials',
      showInMenu: true,
      categories: ['Course Materials', 'Equipment', 'Consumables', 'Certification', 'Safety'],
      requiredFields: ['name', 'quantity_on_hand', 'course_type'],
      features: {
        courseMaterials: true,
        equipmentBooking: true,
        certificationStock: true,
      },
    },
    
    'DAYCARE': {
      enabled: true,
      menuLabel: 'Childcare Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Toys', 'Educational Materials', 'Art Supplies', 'Diapers', 'Snacks', 'Cleaning'],
      requiredFields: ['name', 'quantity_on_hand', 'age_group'],
      features: {
        ageAppropriate: true,
        safetyCompliance: true,
        snackInventory: true,
        sanitationTracking: true,
      },
    },
    
    'DRIVING_SCHOOL': {
      enabled: true,
      menuLabel: 'Driving School Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Training Materials', 'Vehicle Parts', 'Safety Equipment', 'Documentation'],
      requiredFields: ['name', 'quantity_on_hand', 'vehicle_type'],
      features: {
        vehicleMaintenance: true,
        trainingMaterials: true,
        studentKits: true,
      },
    },
    
    'LANGUAGE_SCHOOL': {
      enabled: true,
      menuLabel: 'Language Materials',
      itemSingular: 'Material',
      itemPlural: 'Materials',
      showInMenu: true,
      categories: ['Textbooks', 'Audio Materials', 'Software', 'Flashcards', 'Games'],
      requiredFields: ['name', 'language', 'level', 'quantity_on_hand'],
      features: {
        languageSpecific: true,
        levelProgression: true,
        digitalResources: true,
      },
    },
    
    'VOCATIONAL_TRAINING': {
      enabled: true,
      menuLabel: 'Training Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Tools', 'Materials', 'Safety Equipment', 'Consumables', 'Reference'],
      requiredFields: ['name', 'quantity_on_hand', 'trade_type'],
      features: {
        tradeSpecific: true,
        toolCheckout: true,
        consumableTracking: true,
        safetyCompliance: true,
      },
    },

    // ============================================
    // AGRICULTURE
    // ============================================
    'FARM': {
      enabled: true,
      menuLabel: 'Farm Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Seeds', 'Fertilizers', 'Pesticides', 'Equipment', 'Harvested Produce', 'Feed'],
      requiredFields: ['name', 'quantity_on_hand', 'unit', 'season'],
      optionalFields: ['expiry_date', 'batch_number', 'application_rate'],
      features: {
        seasonalTracking: true,
        harvestTracking: true,
        chemicalCompliance: true,
        equipmentMaintenance: true,
        cropRotation: true,
      },
    },
    
    'LIVESTOCK': {
      enabled: true,
      menuLabel: 'Livestock Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Feed', 'Medications', 'Supplements', 'Equipment', 'Breeding Supplies'],
      requiredFields: ['name', 'quantity_on_hand', 'animal_type'],
      features: {
        feedManagement: true,
        medicationTracking: true,
        breedingSupplies: true,
        livestockCount: true,
      },
    },
    
    'AGRO_PROCESSING': {
      enabled: true,
      menuLabel: 'Processing Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Raw Materials', 'Processing Aids', 'Packaging', 'Finished Products'],
      requiredFields: ['name', 'quantity_on_hand', 'batch_number', 'production_date'],
      features: {
        batchProcessing: true,
        qualityControl: true,
        packagingTracking: true,
        traceability: true,
      },
    },
    
    'AGRICULTURAL_SUPPLIES': {
      enabled: true,
      menuLabel: 'Agri Supplies Stock',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: true,
      categories: ['Seeds', 'Fertilizers', 'Pesticides', 'Tools', 'Irrigation', 'Equipment'],
      requiredFields: ['name', 'quantity_on_hand', 'expiry_date', 'batch_number'],
      features: {
        seasonalDemand: true,
        bulkSales: true,
        technicalSupport: true,
        regulatoryCompliance: true,
      },
    },
    
    'FISHERY': {
      enabled: true,
      menuLabel: 'Fishery Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Feed', 'Equipment', 'Nets', 'Processing', 'Packaging'],
      requiredFields: ['name', 'quantity_on_hand', 'storage_temperature'],
      features: {
        coldChainManagement: true,
        feedTracking: true,
        harvestTracking: true,
        processingSupplies: true,
      },
    },

    // ============================================
    // OTHER SERVICES
    // ============================================
    'FITNESS_CENTER': {
      enabled: true,
      menuLabel: 'Gym Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Cardio Equipment', 'Weights', 'Accessories', 'Supplements', 'Maintenance'],
      requiredFields: ['name', 'quantity_on_hand', 'condition', 'maintenance_date'],
      features: {
        equipmentMaintenance: true,
        supplementSales: true,
        memberEquipment: true,
        cleaningSchedule: true,
      },
    },
    
    'SALON_SPA': {
      enabled: true,
      menuLabel: 'Salon Products',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: true,
      categories: ['Professional Products', 'Retail Products', 'Equipment', 'Linens', 'Consumables'],
      requiredFields: ['name', 'brand', 'quantity_on_hand', 'category', 'usage_type'],
      optionalFields: ['client_price', 'retail_price', 'commission_rate'],
      features: {
        dualInventory: true, // Professional vs Retail
        clientPreferences: true,
        productUsageTracking: true,
        commissionManagement: true,
        appointmentLinking: true,
      },
    },
    
    'ENTERTAINMENT': {
      enabled: true,
      menuLabel: 'Entertainment Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Equipment', 'Consumables', 'Merchandise', 'Safety', 'Maintenance'],
      requiredFields: ['name', 'quantity_on_hand', 'location'],
      features: {
        venueEquipment: true,
        merchandiseSales: true,
        eventSupplies: true,
      },
    },
    
    'IMPORT_EXPORT': {
      enabled: true,
      menuLabel: 'Trade Inventory',
      itemSingular: 'Product',
      itemPlural: 'Products',
      showInMenu: true,
      categories: ['Import Goods', 'Export Goods', 'Documents', 'Packaging', 'Samples'],
      requiredFields: ['name', 'quantity_on_hand', 'hs_code', 'origin_country'],
      features: {
        customsTracking: true,
        containerManagement: true,
        documentManagement: true,
        sampleInventory: true,
      },
    },
    
    'MINING_ENERGY': {
      enabled: true,
      menuLabel: 'Mining Supplies',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Equipment Parts', 'Explosives', 'Safety Gear', 'Chemicals', 'Tools'],
      requiredFields: ['name', 'quantity_on_hand', 'hazard_class', 'storage_requirements'],
      features: {
        hazmatCompliance: true,
        equipmentTracking: true,
        safetyCompliance: true,
        regulatoryReporting: true,
      },
    },
    
    'WASTE_MANAGEMENT': {
      enabled: true,
      menuLabel: 'Waste Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Collection Equipment', 'Processing', 'Safety Gear', 'Chemicals', 'Containers'],
      requiredFields: ['name', 'quantity_on_hand', 'capacity', 'condition'],
      features: {
        routeSupplies: true,
        processingMaterials: true,
        safetyCompliance: true,
        containerTracking: true,
      },
    },
    
    'SECURITY_COMPANY': {
      enabled: true,
      menuLabel: 'Security Equipment',
      itemSingular: 'Equipment',
      itemPlural: 'Equipment',
      showInMenu: true,
      categories: ['Uniforms', 'Communication', 'Surveillance', 'Safety', 'Documentation'],
      requiredFields: ['name', 'serial_number', 'quantity_on_hand', 'assignment'],
      features: {
        equipmentAssignment: true,
        uniformManagement: true,
        deviceTracking: true,
        certificationTracking: true,
      },
    },
    
    'CLEANING_COMPANY': {
      enabled: true,
      menuLabel: 'Cleaning Inventory',
      itemSingular: 'Supply',
      itemPlural: 'Supplies',
      showInMenu: true,
      categories: ['Chemicals', 'Equipment', 'Tools', 'PPE', 'Consumables'],
      requiredFields: ['name', 'quantity_on_hand', 'concentration', 'safety_class'],
      features: {
        chemicalManagement: true,
        clientSupplies: true,
        equipmentMaintenance: true,
        safetyCompliance: true,
      },
    },
    
    'EVENT_MANAGEMENT': {
      enabled: true,
      menuLabel: 'Event Inventory',
      itemSingular: 'Item',
      itemPlural: 'Items',
      showInMenu: true,
      categories: ['Decorations', 'Audio/Visual', 'Furniture', 'Linens', 'Lighting', 'Props'],
      requiredFields: ['name', 'quantity_on_hand', 'condition', 'category'],
      optionalFields: ['theme', 'color', 'rental_price'],
      features: {
        eventPackages: true,
        rentalManagement: true,
        vendorCoordination: true,
        warehouseTracking: true,
      },
    },
    
    'OTHER': {
      enabled: true,
      menuLabel: 'Inventory',
      itemSingular: 'Item',
      itemPlural: 'Items',
      showInMenu: true,
      categories: ['General'],
      requiredFields: ['name', 'quantity_on_hand'],
      features: {
        basic: true,
      },
    },
  };
  
  // Return the configuration for the business type, or default
  return configs[businessType] || configs['OTHER'];
};

// Helper function to check if inventory should be shown in menu
export const shouldShowInventory = (businessType) => {
  const config = getInventoryConfig(businessType);
  return config.enabled && config.showInMenu;
};

// Helper function to get inventory terminology for menu
export const getInventoryMenuLabel = (businessType) => {
  const config = getInventoryConfig(businessType);
  return config.menuLabel || 'Inventory';
};

// Helper function to get required fields for a business type
export const getRequiredFields = (businessType) => {
  const config = getInventoryConfig(businessType);
  return config.requiredFields || ['name', 'quantity_on_hand'];
};

// Helper function to check if a feature is enabled
export const isFeatureEnabled = (businessType, feature) => {
  const config = getInventoryConfig(businessType);
  return config.features && config.features[feature] === true;
};

// Helper function to get quick add templates
export const getQuickAddTemplates = (businessType) => {
  const config = getInventoryConfig(businessType);
  return config.quickAddTemplates || [];
};

// Helper function to get custom buttons for business type
export const getCustomButtons = (businessType) => {
  const config = getInventoryConfig(businessType);
  return config.customButtons || [];
};