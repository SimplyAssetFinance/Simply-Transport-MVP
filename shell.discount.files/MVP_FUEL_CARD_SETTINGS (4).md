# MVP Feature: Multi-Card Fuel Discounts

## Overview
Allow users to add **multiple fuel cards** with **individual CPL discounts** for each. The map displays the best available discount at each site based on the user's card portfolio.

**Key Feature:** Shell Card has **two discount tiers** — higher discount at National Truckstop Network sites, lower discount at all other Shell sites nationally.

---

## Shell Card — Tiered Discount Structure

Shell Card offers a **Discount Off Pump (DOP)** structure with two tiers:

| Tier | Sites | Example |
|------|-------|---------|
| **Truckstop Discount** | 259 National Truckstop Network sites | -6.0 cpl |
| **National Discount** | All other Shell/Viva/Liberty sites | -3.0 cpl |

### Example Scenario
User's Shell Card settings:
- Truckstop Discount: -6.0 cpl
- National Discount: -3.0 cpl

| Site | Network | Discount Applied |
|------|---------|------------------|
| Shell OTR Dubbo | Truckstop Network ✓ | **-6.0 cpl** |
| Shell Coles Express Sydney CBD | Other Shell | **-3.0 cpl** |
| Liberty Tamworth | Other Shell | **-3.0 cpl** |
| BP Parramatta | Not Shell | 0 (no discount) |

---

## Requirements

### 1. Settings Page — Fuel Cards Section

Replace single card dropdown with a **card management interface**.

#### UI Layout (Multi-Card)
```
┌─────────────────────────────────────────────────────────────┐
│  Your Fuel Cards                                    [+ Add] │
├─────────────────────────────────────────────────────────────┤
│  🐚 Shell Card                                     [✏️] [🗑️] │
│     Truckstop Network: -6.0 cpl                             │
│     Other Shell sites: -3.0 cpl                             │
│  ⛽ BP Plus                            -3.0 cpl    [✏️] [🗑️] │
│  🔷 AmpolCard                          -2.5 cpl    [✏️] [🗑️] │
└─────────────────────────────────────────────────────────────┘
```

#### Add Shell Card Modal (Two-Tier)
```
┌─────────────────────────────────────────────────────────────┐
│  Add Shell Card                                         [X] │
├─────────────────────────────────────────────────────────────┤
│  Truckstop Network Discount:  [-6.0] cpl                    │
│  (259 National Truckstop Network sites)                     │
│                                                             │
│  All Other Shell Sites:       [-3.0] cpl                    │
│  (Shell, Viva, Liberty nationally)                          │
│                                                             │
│                              [Cancel]  [Add Card]           │
└─────────────────────────────────────────────────────────────┘
```

#### Add Other Card Modal (Single Discount)
```
┌─────────────────────────────────────────────────────────────┐
│  Add Fuel Card                                          [X] │
├─────────────────────────────────────────────────────────────┤
│  Card Provider:  [BP Plus ▼]                                │
│  Your Discount:  [-4.5] cpl                                 │
│                                                             │
│                              [Cancel]  [Add Card]           │
└─────────────────────────────────────────────────────────────┘
```

#### Dropdown Options
Display in this exact order (Shell first, then alphabetical):

```
1. Shell
2. 7-Eleven Fuel Pass
3. AmpolCard
4. BP Plus
5. EG Fuel
6. FleetCard
7. Metro Petroleum
8. Mobil
9. Puma
10. United
11. WEX Motorpass
```

**Note:** Shell is always first, regardless of alphabetical order. All other options are alphabetical.

---

### 2. Discount Logic — Best Available

**Logic:** At each site, apply the **best (largest) discount** from the user's cards that are accepted at that site.

#### Example Scenario
User has:
- Shell: -4.5 cpl
- BP Plus: -3.0 cpl
- FleetCard: -2.0 cpl (multi-network)

| Site | Cards Accepted | Applied Discount |
|------|----------------|------------------|
| Shell Coles Express | Shell, FleetCard | **-4.5 cpl** (Shell wins) |
| BP Truck Stop | BP Plus, FleetCard | **-3.0 cpl** (BP wins) |
| United Servo | FleetCard only | **-2.0 cpl** (FleetCard) |
| Metro Petroleum | FleetCard only | **-2.0 cpl** (FleetCard) |

---

### 3. Provider → Site Network Mapping

| Fuel Card Provider | Sites Where Discount Applies |
|--------------------|------------------------------|
| Shell | Shell, Shell Coles Express, Viva Energy, Liberty (Shell-branded) |
| 7-Eleven Fuel Pass | 7-Eleven |
| AmpolCard | Ampol, Caltex (Ampol-branded) |
| BP Plus | BP |
| EG Fuel | EG Australia sites |
| FleetCard | **All sites** (multi-network) |
| Metro Petroleum | Metro Petroleum |
| Mobil | Mobil, 7-Eleven (some), ExxonMobil |
| Puma | Puma Energy |
| United | United Petroleum |
| WEX Motorpass | **All sites** (multi-network) |

**Multi-network cards:** FleetCard and WEX Motorpass are accepted at most sites.

---

### 4. Map Display Logic

```typescript
// Site data includes whether it's in the Truckstop Network
interface FuelSite {
  id: string;
  name: string;
  brand: string;
  boardPrice: number;
  isNationalTruckstop: boolean;  // True for 259 Shell National Truckstop Network sites
  urn?: string;                  // URN identifier for Truckstop sites
  latitude: number;
  longitude: number;
}

// Get best discount for a site (handles Shell's two-tier system)
function getBestDiscount(site: FuelSite, userCards: FuelCard[]): { 
  discount: number; 
  cardUsed: string | null;
  tier?: 'truckstop' | 'national';
} {
  let bestDiscount = 0;
  let cardUsed: string | null = null;
  let tier: 'truckstop' | 'national' | undefined = undefined;
  
  for (const card of userCards) {
    if (!cardAppliesToSite(card.provider, site.brand)) continue;
    
    let discount = 0;
    let currentTier: 'truckstop' | 'national' | undefined = undefined;
    
    // Shell Card: Check which tier applies
    if (isShellCard(card)) {
      if (site.isNationalTruckstop) {
        discount = card.truckstopDiscountCpl;
        currentTier = 'truckstop';
      } else {
        discount = card.nationalDiscountCpl;
        currentTier = 'national';
      }
    } else {
      discount = card.discountCpl;
    }
    
    // More negative = better discount
    if (discount < bestDiscount) {
      bestDiscount = discount;
      cardUsed = card.provider;
      tier = currentTier;
    }
  }
  
  return { discount: bestDiscount, cardUsed, tier };
}

function cardAppliesToSite(cardProvider: string, siteBrand: string): boolean {
  // Multi-network cards apply everywhere
  if (cardProvider === 'FleetCard' || cardProvider === 'WEX Motorpass') {
    return true;
  }
  
  const cardNetworks: Record<string, string[]> = {
    'Shell': ['Shell', 'Shell Coles Express', 'Viva', 'Liberty', 'OTR', 'Reddy Express'],
    '7-Eleven Fuel Pass': ['7-Eleven'],
    'AmpolCard': ['Ampol', 'Caltex'],
    'BP Plus': ['BP'],
    'EG Fuel': ['EG Australia', 'EG'],
    'Metro Petroleum': ['Metro', 'Metro Petroleum'],
    'Mobil': ['Mobil', '7-Eleven', 'ExxonMobil'],
    'Puma': ['Puma', 'Puma Energy'],
    'United': ['United', 'United Petroleum'],
  };
  
  const acceptedBrands = cardNetworks[cardProvider] || [];
  return acceptedBrands.some(brand => 
    siteBrand.toLowerCase().includes(brand.toLowerCase())
  );
}

// Rendering sites on map
sites.forEach(site => {
  const { discount, cardUsed, tier } = getBestDiscount(site, userSettings.fuelCards);
  
  if (discount < 0) {
    site.displayPrice = site.boardPrice + discount;
    site.discountApplied = discount;
    site.discountCard = cardUsed;
    site.discountTier = tier;  // 'truckstop' or 'national' for Shell
    site.showDiscountBadge = true;
  } else {
    site.displayPrice = site.boardPrice;
    site.showDiscountBadge = false;
  }
});
```

---

### 5. "Your Discounts" Tile Update

**New:** Show summary of all configured cards.

#### Single Card
```
┌─────────────────────────────────┐
│  Your Shell Discount            │
│  -4.5 cpl                       │
└─────────────────────────────────┘
```

#### Multiple Cards
```
┌─────────────────────────────────┐
│  Your Fuel Card Discounts       │
│  Shell: -4.5 cpl                │
│  BP Plus: -3.0 cpl              │
│  FleetCard: -2.0 cpl            │
└─────────────────────────────────┘
```

#### Site Popup/Tooltip
When viewing a specific site, show which card discount was applied:

**Truckstop Network Site:**
```
┌─────────────────────────────────┐
│  🚛 Shell OTR Dubbo             │
│  ⭐ National Truckstop Network  │
│                                 │
│  Board Price: 185.9 cpl         │
│  Your Price: 179.9 cpl          │
│  💳 Shell Card (-6.0 cpl)       │
│     Truckstop Discount          │
└─────────────────────────────────┘
```

**Other Shell Site:**
```
┌─────────────────────────────────┐
│  ⛽ Shell Coles Express Sydney  │
│                                 │
│  Board Price: 185.9 cpl         │
│  Your Price: 182.9 cpl          │
│  💳 Shell Card (-3.0 cpl)       │
│     National Discount           │
└─────────────────────────────────┘
```

**Non-Shell Site (with other card):**
```
┌─────────────────────────────────┐
│  ⛽ BP Parramatta               │
│                                 │
│  Board Price: 187.5 cpl         │
│  Your Price: 184.5 cpl          │
│  💳 BP Plus (-3.0 cpl)          │
└─────────────────────────────────┘
```

---

### 6. Data Model Changes

#### Supabase Schema

**Option A: JSONB column (simpler)**
```sql
ALTER TABLE user_settings 
ADD COLUMN fuel_cards JSONB DEFAULT '[]';

-- Example data:
-- [
--   {"provider": "Shell", "discountCpl": -4.5},
--   {"provider": "BP Plus", "discountCpl": -3.0},
--   {"provider": "FleetCard", "discountCpl": -2.0}
-- ]
```

**Option B: Separate table (normalized)**
```sql
CREATE TABLE user_fuel_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  discount_cpl DECIMAL(4,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
```

**Recommendation:** Option A (JSONB) for MVP simplicity.

#### TypeScript Types

```typescript
type FuelCardProvider = 
  | 'Shell'
  | '7-Eleven Fuel Pass'
  | 'AmpolCard'
  | 'BP Plus'
  | 'EG Fuel'
  | 'FleetCard'
  | 'Metro Petroleum'
  | 'Mobil'
  | 'Puma'
  | 'United'
  | 'WEX Motorpass';

// Shell Card has TWO discount tiers
interface ShellCard {
  provider: 'Shell';
  truckstopDiscountCpl: number;  // e.g., -6.0 (National Truckstop Network)
  nationalDiscountCpl: number;   // e.g., -3.0 (all other Shell/Viva/Liberty)
}

// Other cards have single discount
interface StandardFuelCard {
  provider: Exclude<FuelCardProvider, 'Shell'>;
  discountCpl: number; // e.g., -4.5
}

type FuelCard = ShellCard | StandardFuelCard;

interface UserSettings {
  fuelCards: FuelCard[];
  // ... other settings
}

// Helper to check if card is Shell
function isShellCard(card: FuelCard): card is ShellCard {
  return card.provider === 'Shell';
}
```

---

### 7. UI Components

#### Fuel Cards List
```tsx
function FuelCardsList({ cards, onEdit, onDelete, onAdd }) {
  return (
    <div className="fuel-cards-section">
      <div className="section-header">
        <h3>Your Fuel Cards</h3>
        <Button onClick={onAdd}>+ Add</Button>
      </div>
      
      {cards.length === 0 ? (
        <p className="empty-state">No fuel cards configured. Add your first card to see discounted prices.</p>
      ) : (
        <ul className="fuel-cards-list">
          {cards.map((card, index) => (
            <li key={index} className="fuel-card-item">
              <span className="card-provider">{card.provider}</span>
              <span className="card-discount">{card.discountCpl} cpl</span>
              <Button size="sm" onClick={() => onEdit(index)}>✏️</Button>
              <Button size="sm" variant="danger" onClick={() => onDelete(index)}>🗑️</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

#### Add/Edit Card Modal
```tsx
function AddCardModal({ isOpen, onClose, onSave, existingCards }) {
  const [provider, setProvider] = useState('Shell');
  const [discount, setDiscount] = useState(-4.0);
  
  // Filter out already-added providers (except for editing)
  const availableProviders = FUEL_CARD_OPTIONS.filter(
    p => !existingCards.some(c => c.provider === p)
  );
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Add Fuel Card</h2>
      
      <Select 
        label="Card Provider" 
        value={provider} 
        onChange={setProvider}
      >
        {availableProviders.map(p => (
          <Option key={p} value={p}>{p}</Option>
        ))}
      </Select>
      
      <NumberInput
        label="Your Discount (cpl)"
        value={discount}
        onChange={setDiscount}
        min={-20}
        max={0}
        step={0.1}
      />
      
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave({ provider, discountCpl: discount })}>
          Add Card
        </Button>
      </div>
    </Modal>
  );
}
```

#### Discounts Summary Tile
```tsx
function DiscountsTile({ fuelCards }) {
  if (fuelCards.length === 0) {
    return (
      <div className="discount-tile empty">
        <p>No fuel cards configured</p>
      </div>
    );
  }
  
  if (fuelCards.length === 1) {
    return (
      <div className="discount-tile">
        <h3>Your {fuelCards[0].provider} Discount</h3>
        <p className="discount-value">{fuelCards[0].discountCpl} cpl</p>
      </div>
    );
  }
  
  return (
    <div className="discount-tile multi">
      <h3>Your Fuel Card Discounts</h3>
      <ul>
        {fuelCards.map((card, i) => (
          <li key={i}>
            <span>{card.provider}:</span>
            <span>{card.discountCpl} cpl</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

### 8. Fuel Card Options Constant

```typescript
// Shell first, then alphabetical
export const FUEL_CARD_OPTIONS: FuelCardProvider[] = [
  'Shell',
  '7-Eleven Fuel Pass',
  'AmpolCard',
  'BP Plus',
  'EG Fuel',
  'FleetCard',
  'Metro Petroleum',
  'Mobil',
  'Puma',
  'United',
  'WEX Motorpass',
];

export const MULTI_NETWORK_CARDS = ['FleetCard', 'WEX Motorpass'];
```

---

---

### 9. Map Visual Differentiation

#### Marker Styling
Differentiate National Truckstop Network sites visually on the map:

| Site Type | Marker Style | Icon |
|-----------|--------------|------|
| Truckstop Network (with discount) | Gold/Yellow marker | 🚛 |
| Truckstop Network (no card) | Orange marker | 🚛 |
| Other Shell (with discount) | Green marker | ⛽ |
| Other Shell (no card) | Blue marker | ⛽ |
| Non-Shell (with discount) | Green marker | ⛽ |
| Non-Shell (no card) | Grey marker | ⛽ |

#### Map Legend
```
┌────────────────────────────────────────────┐
│  Map Legend                                │
├────────────────────────────────────────────┤
│  🚛 🟡  Truckstop Network (your discount)  │
│  🚛 🟠  Truckstop Network                  │
│  ⛽ 🟢  Your discounted price              │
│  ⛽ 🔵  Shell/Viva sites                   │
│  ⛽ ⚪  Other fuel sites                   │
└────────────────────────────────────────────┘
```

#### Filter Options
Allow users to filter map by:
- [ ] Show only Truckstop Network sites
- [ ] Show only sites with my discount
- [ ] Show all Shell/Viva sites
- [ ] Show all sites

---

### 10. National Truckstop Network Data

The **247 National Truckstop Network sites** are pre-loaded from Shell's official site list.

#### Data Source
`shell_national_truckstop_network.csv` (247 sites)

#### Key Stats
| Metric | Value |
|--------|-------|
| **Total Sites** | 247 |
| **States** | NSW (57), WA (50), VIC (49), QLD (42), SA (31), NT (9), TAS (8), ACT (1) |
| **Brands** | Shell (186), Liberty (32), BP (14), Caltex (8), Mogas (4), Advantage (2), TPSC (1) |

#### Truck Facilities Available
| Facility | Sites |
|----------|-------|
| High Flow Diesel | 204 |
| Ultra High Flow Diesel | 93 |
| AdBlue at Pump | 117 |
| Truck Parking | 101 |
| Showers | 64 |
| Truckers Lounge | 28 |
| 24/7 Sites | 163 |

#### Site Record Fields
| Field | Description | Example |
|-------|-------------|---------|
| URN | Unique site identifier | A200 |
| Platform | Network platform | Alliance, Liberty Oil Australia, Viva Direct |
| Forecourt Brand | Brand on site | Shell, Liberty, BP |
| Site Name | Full name | SHELL COLES EXPRESS BATHURST |
| Address | Street address | 59 DURHAM STREET |
| Suburb | Location | BATHURST |
| State | State code | NSW |
| Postcode | Postcode | 2795 |
| Lat/Long | GPS coordinates | -33.416408, 149.584312 |
| Status | Open/Closed | Open |
| Metro/Regional | Location type | Metro, Regional, Remote |
| Highway Site | On highway | Yes/No |
| Truck Forecourt | Has truck area | Yes/No |
| Semi-Trailer Accessible | Semi access | Yes/No |
| B Double Accessible | B-double access | Yes/No |
| Road Train Accessible | Road train access | Yes/No |
| High Flow Diesel | HFD pumps | Yes/No |
| Ultra High Flow Diesel | UHFD pumps | Yes/No |
| AdBlue at Pump | AdBlue available | Yes/No |
| Truck Parking | Parking available | Yes/No |
| Showers | Showers available | Yes/No |
| Truckers Lounge | Lounge available | Yes/No |
| Trading Hours (24 x 7 Site) | 24/7 operation | Yes/No |

#### Note on Brands
The National Truckstop Network includes sites under multiple brands:
- **Shell** — Main brand (186 sites)
- **Liberty** — Franchise partner (32 sites)
- **BP/Caltex/Others** — Also in network (29 sites)

All 247 sites accept Shell Card with the **Truckstop Discount** tier.

---

## Summary

| Change | Location | Details |
|--------|----------|---------|
| Multi-card management UI | Settings page | Add/edit/delete cards with individual discounts |
| Shell two-tier discount | Settings modal | Truckstop Network vs National discount inputs |
| Best discount logic | Map component | Apply best available discount at each site |
| Tiered Shell discount logic | Map component | Check `isNationalTruckstop` for Shell card tier |
| Card-specific site mapping | Utility functions | Match cards to their accepted networks |
| Discount summary tile | Dashboard/Map | Show all cards or single card dynamically |
| Site popup enhancement | Map markers | Show which card discount was applied + tier |
| Visual differentiation | Map markers | Different colors/icons for Truckstop vs other |
| Map filters | Map controls | Filter by Truckstop Network, discounts, etc. |
| DB schema update | Supabase | JSONB column for fuel_cards array |

---

## Testing Checklist

### Basic Card Management
- [ ] Can add multiple fuel cards with different discounts
- [ ] Can edit existing card discount
- [ ] Can delete a card
- [ ] Cannot add duplicate card providers
- [ ] Dropdown shows Shell first, then alphabetical
- [ ] Settings persist after page refresh
- [ ] Empty state shown when no cards configured

### Shell Card Two-Tier System
- [ ] Shell Card modal shows TWO discount fields (Truckstop + National)
- [ ] Truckstop Network sites apply Truckstop discount (higher)
- [ ] Other Shell/Viva/Liberty sites apply National discount (lower)
- [ ] Site popup shows which tier was applied
- [ ] Discount tile shows both Shell discount tiers

### Map Display
- [ ] Map applies best discount at each site
- [ ] Shell sites use Shell card discount (not FleetCard if Shell is better)
- [ ] Non-network sites use multi-network card discount (FleetCard/WEX)
- [ ] Sites with no matching cards show board price only
- [ ] Truckstop Network sites have distinct marker (🚛 gold/orange)
- [ ] Other Shell sites have blue markers
- [ ] Discounted sites show green markers
- [ ] Map legend displays correctly
- [ ] Filter options work (Truckstop only, discounts only, etc.)

### Site Popups
- [ ] Discount tile shows single or multiple cards appropriately
- [ ] Site popup shows which card discount was applied
- [ ] Truckstop sites show "⭐ National Truckstop Network" badge
- [ ] Truckstop sites show "Truckstop Discount" label
- [ ] Other Shell sites show "National Discount" label
