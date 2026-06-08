# Configuration Files

## Names Database (`names.csv`)

### Overview

This CSV file contains the name components used for automatic username generation based on species
type. Names are thematically appropriate for each species and are combined algorithmically to create
unique usernames.

### File Structure

- **Format**: CSV (Comma-Separated Values)
- **Rows**: 30 name combinations per species
- **Columns**: 18 total (3 parts × 6 species types)

### Column Layout

```
type0first,type0middle,type0last,type1first,type1middle,type1last,...
```

For each species type (0-5):

1. `typeXfirst`: First name component
2. `typeXmiddle`: Middle name component
3. `typeXlast`: Last name component

### Species Types

1. **Type 0 (Dominant)**
   - Theme: Military/leadership
   - Examples: Alpha, Prime, Chief
   - Style: Strong, commanding names

2. **Type 1 (Robot)**
   - Theme: Technical/digital
   - Examples: Core, Unit, Bot
   - Style: Mechanical, systematic names

3. **Type 2 (Creature)**
   - Theme: Animal/wild
   - Examples: Wild, Fang, Beast
   - Style: Natural, primal names

4. **Type 3 (Hydra)**
   - Theme: Water/fluid
   - Examples: Hydro, Flow, Wave
   - Style: Fluid, multi-part names

5. **Type 4 (Avian)**
   - Theme: Sky/flight
   - Examples: Sky, Wing, Soar
   - Style: Aerial, graceful names

6. **Type 5 (Mech)**
   - Theme: Mechanical
   - Examples: Mech, Steel, Titan
   - Style: Industrial, powerful names

### Usage

The `nameGenerator.js` utility reads this file to generate usernames:

```javascript
const username = generateUsername('char-2-123456789-0.png');
// Returns e.g., "Wild Fang" for Creature type
```

### Maintenance

- Keep names short (consider combined length limits)
- Maintain thematic consistency per species
- Test new additions with the name generator
- Backup before making large changes

### Name Requirements

1. **Length**: Individual components should be short
2. **Uniqueness**: Avoid duplicates within species
3. **Appropriateness**: Match species theme
4. **Combinability**: Work well in combinations
5. **Pronunciation**: Easy to read/pronounce

### Example Row

```csv
Alpha,Prime,Chief,Zero,Core,Unit,Wild,Fang,Beast,Hydro,Flow,Multi,Sky,Wing,Talon,Mech,Steel,Titan
```

This creates possibilities like:

- Dominant: "Alpha Prime", "Prime Chief"
- Robot: "Zero Core", "Core Unit"
- Creature: "Wild Fang", "Fang Beast"
- Hydra: "Hydro Flow", "Flow Multi"
- Avian: "Sky Wing", "Wing Talon"
- Mech: "Mech Steel", "Steel Titan"
