# Data Model mapping: Learner Sentence Timeline

## Supabase Tables Used

This feature uses the existing public schema tables without modification:

1. **`learners`**:
   - `id` (UUID, Primary Key)
   - `display_name` (Text)
2. **`learner_responses`**:
   - `id` (UUID, Primary Key)
   - `learner_id` (UUID, Foreign Key → `learners.id`)
   - `round_id` (UUID, Foreign Key → `room_rounds.id`)
   - `cpd_result` (Numeric)
   - `response_color` (Text) - used for grade color
   - `submitted_at` (Timestamp)
3. **`room_rounds`**:
   - `id` (UUID, Primary Key)
   - `room_id` (UUID, Foreign Key → `practice_rooms.id`)
   - `round_index` (Integer)
   - `sentence_resource_id` (UUID, Foreign Key → `sentence_resources.id`)
4. **`sentence_resources`**:
   - `id` (UUID, Primary Key)
   - `sentence_code` (Text)
   - `cvr_value` (Numeric)
   - `cci_standard_x` (Numeric)

## Frontend Telemetry Data Structure

We aggregate `learner_responses` into a chart-friendly format for Recharts.

### Grouped Data Item
```typescript
interface TimelineChartPoint {
  // X-Axis value representing the round or sentence point
  xKey: string;
  // Display name/label for the X-Axis ticks
  label: string;
  // Full detail string (sentence code, round, etc.)
  details: {
    roundIndex: number;
    sentenceCode: string;
    cvrValue: number;
    cciX: number;
  };
  // Dynamic keys for up to 10 active learners, mapping learner_id (or name) to CPD value
  [learnerId: string]: any; 
}
```

### Active Learners List
To associate lines with colors:
```typescript
interface ActiveLearnerMeta {
  id: string;
  displayName: string;
  color: string;
  responseCount: number;
}
```
We select up to 10 learners with the highest `responseCount` from the filtered dataset.
