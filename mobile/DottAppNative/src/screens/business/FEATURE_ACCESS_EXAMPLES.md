# Feature Access Integration Examples

This document shows how to integrate the à la carte feature access system into mobile app screens.

## 1. Basic Feature Gate Usage

```javascript
import FeatureGate from '../../components/FeatureGate';

// In your component
<FeatureGate 
  feature="payroll" 
  showUpgradePrompt={true}
  onUpgradePress={() => navigation.navigate('Settings', { tab: 'features' })}
>
  <PayrollContent />
</FeatureGate>
```

## 2. Menu Item with Feature Access

```javascript
import { FeatureMenuItem } from '../../components/FeatureGate';

// In your menu
<FeatureMenuItem
  feature="analytics"
  title="Analytics & Reports"
  icon="stats-chart-outline"
  onPress={() => navigation.navigate('Analytics')}
/>
```

## 3. Conditional Rendering Based on Feature

```javascript
import { useFeatureAccess } from '../../hooks/useFeatureAccess';

const MyScreen = () => {
  const { hasAccess: hasPayroll } = useFeatureAccess('payroll');
  const { hasAccess: hasAnalytics } = useFeatureAccess('analytics');

  return (
    <View>
      {hasPayroll && (
        <TouchableOpacity onPress={handlePayroll}>
          <Text>Process Payroll</Text>
        </TouchableOpacity>
      )}
      
      {hasAnalytics && (
        <TouchableOpacity onPress={handleReports}>
          <Text>View Advanced Reports</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

## 4. Feature Badge on Menu Items

```javascript
import { FeatureBadge } from '../../components/FeatureGate';

<View style={styles.menuItem}>
  <Text>Accounting</Text>
  <FeatureBadge feature="accounting" />
</View>
```

## 5. Multiple Features Gate

```javascript
import { MultiFeatureGate } from '../../components/FeatureGate';

// Requires ALL features
<MultiFeatureGate 
  features={['payroll', 'hr', 'timesheets']} 
  requireAll={true}
>
  <CompleteHRSuite />
</MultiFeatureGate>

// Requires ANY of the features
<MultiFeatureGate 
  features={['analytics', 'smart_insights']} 
  requireAll={false}
>
  <ReportsSection />
</MultiFeatureGate>
```

## 6. Integration in HomeScreen

```javascript
// In HomeScreen.js or DashboardScreen.js
import FeatureGate, { FeatureMenuItem } from '../../components/FeatureGate';
import featureApi from '../../services/featureApi';

const HomeScreen = () => {
  const [features, setFeatures] = useState(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const data = await featureApi.getEnabledFeatures();
      setFeatures(data);
    } catch (error) {
      console.error('Error loading features:', error);
    }
  };

  // Show testing mode banner
  if (features?.testing_mode) {
    return (
      <View style={styles.banner}>
        <Text>Testing Mode: All features are accessible</Text>
      </View>
    );
  }

  return (
    <ScrollView>
      {/* Core Features - Always Available */}
      <Section title="Core Features">
        <MenuItem title="POS" icon="cart" onPress={handlePOS} />
        <MenuItem title="Inventory" icon="cube" onPress={handleInventory} />
        <MenuItem title="Customers" icon="people" onPress={handleCustomers} />
      </Section>

      {/* À La Carte Features */}
      <Section title="Premium Features">
        <FeatureMenuItem
          feature="payroll"
          title="Payroll & HR"
          icon="cash-outline"
          onPress={handlePayroll}
        />
        <FeatureMenuItem
          feature="analytics"
          title="Advanced Analytics"
          icon="analytics-outline"
          onPress={handleAnalytics}
        />
        <FeatureMenuItem
          feature="accounting"
          title="Accounting Pro"
          icon="calculator-outline"
          onPress={handleAccounting}
        />
      </Section>
    </ScrollView>
  );
};
```

## 7. Feature-Specific Screen Protection

```javascript
// In PayrollScreen.js
import FeatureGate from '../../components/FeatureGate';

const PayrollScreen = () => {
  return (
    <FeatureGate 
      feature="payroll"
      showUpgradePrompt={true}
      onUpgradePress={() => {
        // Navigate to Settings > Features tab
        navigation.navigate('Settings', { 
          screen: 'FeatureModules' 
        });
      }}
    >
      <View style={styles.container}>
        {/* Payroll screen content */}
      </View>
    </FeatureGate>
  );
};
```

## 8. Business Type-Aware Features

```javascript
import featureApi from '../../services/featureApi';

const getBusinessFeatures = (businessType) => {
  return featureApi.getBusinessCoreFeatures(businessType);
};

// In your component
const businessType = user?.business?.simplified_business_type || 'OTHER';
const coreFeatures = getBusinessFeatures(businessType);

// Show only relevant features for business type
{businessType === 'RESTAURANT' && (
  <MenuItem title="Menu Management" icon="restaurant" onPress={handleMenu} />
)}
```

## Feature Codes Reference

### Core Features (Free)
- `dashboard`
- `pos`
- `inventory`
- `customers`
- `invoicing`
- `banking`
- `menu` (restaurants only)
- `orders`
- `discover`
- `advertise`
- `invite`
- `qr_code`
- `business_wallet`

### À La Carte Modules
- `payroll` - $15/mo
- `hr` - Part of Payroll bundle
- `timesheets` - Part of Payroll bundle
- `analytics` - $5/mo
- `smart_insights` - Part of Analytics
- `accounting` - $10/mo
- `marketing` - $6/mo
- `whatsapp_business` - Part of Marketing
- `jobs` - $12/mo
- `transport` - $12/mo
- `courier` - $12/mo
- `multi_location` - $10/mo
- `ecommerce` - $10/mo
- `workflow_automation` - $8/mo

## Testing

During testing mode (currently active), all features are accessible but the system shows what would be charged in production. Test accounts (support@dottapps.com) always have full access without charges.