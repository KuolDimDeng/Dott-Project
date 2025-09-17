# 🌟 Complex Product & Menu Featuring System

## Overview
The Dott platform includes a sophisticated, multi-factor featuring algorithm that automatically promotes products and menu items based on performance metrics, engagement data, and business quality scores.

## Architecture

### 1. **Multi-Factor Scoring Algorithm**

The system uses a weighted scoring model with 5 key components:

| Factor | Weight | Description | Score Range |
|--------|---------|-------------|------------|
| **Popularity** | 30% | Views + Orders | 0-100 |
| **Recency** | 10% | Age of item | 25-100 |
| **Engagement** | 25% | Click-through rate | 0-100 |
| **Business Quality** | 20% | Business rating | 0-100 |
| **Inventory** | 15% | Stock levels | 25-100 |

### 2. **Scoring Details**

#### Popularity Score (30% weight)
```python
view_score = min(views / 100, 1) * 50  # Max 50 points
order_score = min(orders / 20, 1) * 50  # Max 50 points
popularity = view_score + order_score
```

#### Recency Score (10% weight)
- ≤ 7 days old: 100 points
- 8-30 days: 75 points
- 31-90 days: 50 points
- > 90 days: 25 points

#### Engagement Score (25% weight)
```python
engagement = min(click_through_rate * 10, 100)
```

#### Business Quality Score (20% weight)
```python
quality = business_rating * 20  # Convert 5-star to 100 scale
```

#### Inventory Score (15% weight)
- > 50 units: 100 points
- 21-50 units: 75 points
- 6-20 units: 50 points
- ≤ 5 units: 25 points

### 3. **Manual Boost**
Items manually marked as featured receive a +20 point bonus to their overall score.

## Database Schema

### Product/MenuItem Fields
```python
is_featured         # Boolean - Manual featuring flag
featured_priority   # Integer - Override sorting (higher = first)
featured_score      # Decimal - Calculated by algorithm
featured_until      # DateTime - Expiration timestamp
view_count         # Integer - Total views
order_count        # Integer - Total orders
```

### Analytics Models
- **ProductView**: Tracks individual product views with context
- **ProductClick**: Engagement tracking
- **FeaturingPerformance**: ROI metrics for featured items
- **ConsumerPreference**: User preference learning
- **FeaturingScore**: Detailed score breakdown

## Implementation

### 1. **Management Command**
```bash
# Calculate scores for last 7 days (default)
python manage.py calculate_featuring_scores

# Calculate for last 30 days
python manage.py calculate_featuring_scores --days 30

# Dry run (no database changes)
python manage.py calculate_featuring_scores --dry-run
```

### 2. **Activation Script**
```bash
# One-time activation with initial calculation
python scripts/activate_featuring_system.py

# Simple setup for testing
python scripts/setup_featured_items.py
```

### 3. **API Endpoints**

#### Get Featured Items
```
GET /api/marketplace/consumer/featured_items/
?city=Juba
&country=SS
&type=all|products|menu_items
&limit=20
```

Response includes items sorted by:
1. `featured_priority` (descending)
2. `featured_score` (descending)
3. `order_count` (descending)

## Automation

### Option 1: Cron Job
```bash
# Add to crontab for daily updates at 2 AM
0 2 * * * cd /path/to/backend && python manage.py calculate_featuring_scores
```

### Option 2: Celery Beat
```python
# In settings.py
CELERY_BEAT_SCHEDULE = {
    'calculate-featuring-scores': {
        'task': 'marketplace.tasks.calculate_featuring_scores',
        'schedule': crontab(hour=2, minute=0),
    },
}
```

### Option 3: Django-Crontab
```python
# In settings.py
CRONJOBS = [
    ('0 2 * * *', 'django.core.management.call_command', ['calculate_featuring_scores']),
]
```

## Performance Optimization

### Query Optimization
- Uses `select_related()` for business listings
- Batch processing to avoid N+1 queries
- Indexed fields: `is_featured`, `featured_score`, `tenant_id`

### Caching Strategy
- Featured items cached for 15 minutes
- Score calculation runs once daily
- Analytics aggregated hourly

## Business Logic

### Auto-Featuring Rules
1. Items with score > 50 are eligible
2. Top 10 items per category auto-featured
3. Featured status expires after 7 days
4. Manual featuring overrides algorithm

### Exclusion Criteria
- Out of stock items
- Inactive products
- Hidden businesses
- Items with < 25 score

## Monitoring

### Key Metrics
- **Featuring Coverage**: % of items featured
- **CTR Improvement**: Featured vs non-featured
- **Revenue Impact**: Sales from featured items
- **Score Distribution**: Average and median scores

### Health Checks
```python
# Check featuring system health
from marketplace.models import FeaturingScore
from django.utils import timezone
from datetime import timedelta

# Recent calculations
recent = FeaturingScore.objects.filter(
    updated_at__gte=timezone.now() - timedelta(days=1)
).count()

# Featured items count
featured_products = Product.objects.filter(is_featured=True).count()
featured_menu_items = MenuItem.objects.filter(is_featured=True).count()

print(f"Recent calculations: {recent}")
print(f"Featured products: {featured_products}")
print(f"Featured menu items: {featured_menu_items}")
```

## Troubleshooting

### Common Issues

1. **No featured items showing**
   - Run: `python manage.py calculate_featuring_scores`
   - Check: Business visibility in marketplace
   - Verify: Items have stock and are active

2. **Scores not updating**
   - Check: Cron job running
   - Verify: Analytics data being collected
   - Run: Manual calculation with `--days 30`

3. **Wrong items featured**
   - Review: Score weights in algorithm
   - Check: Manual featuring overrides
   - Audit: Business quality scores

## Advanced Configuration

### Customize Weights
```python
# In calculate_featuring_scores.py
weights = {
    'popularity': Decimal('0.3'),     # Adjust these
    'recency': Decimal('0.1'),
    'engagement': Decimal('0.25'),
    'business_quality': Decimal('0.2'),
    'inventory': Decimal('0.15'),
}
```

### Personalization (Future)
```python
# Per-user featuring based on preferences
user_preferences = ConsumerPreference.objects.filter(user=user)
personalized_score = base_score * preference_multiplier
```

## Summary

The featuring system provides:
- ✅ **Automatic featuring** based on performance
- ✅ **Manual override** capability
- ✅ **Time-limited featuring** with expiration
- ✅ **Multi-factor scoring** for fairness
- ✅ **Business quality** consideration
- ✅ **Inventory-aware** featuring
- ✅ **Analytics tracking** for ROI

This creates a dynamic marketplace where high-performing, well-stocked items from quality businesses automatically get promoted, while still allowing manual curation when needed.