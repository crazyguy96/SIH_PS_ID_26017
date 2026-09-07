# Model Lifecycle

## Data Refresh Cadence

The predictive delay-risk system follows a quarterly model refresh
cycle aligned with the MoSPI QPISR reporting cycle.

### Quarterly workflow

1. Receive the latest quarterly project data.
2. Run the data through the existing enrichment pipeline.
3. Generate the same engineered and narrative-based features used
   during model training.
4. Append the new labeled observations to the historical training data.
5. Train a new candidate model.
6. Evaluate the candidate model against the currently deployed model.
7. Promote the candidate only if it meets the defined performance
   criteria.
8. Generate predictions for the latest project records.
9. Update the dashboard and alert system.

### Model safety

A newly trained model must not automatically replace the existing
production model.

The candidate model must first be evaluated against the previous
model using the same validation methodology.

If the candidate performs worse than the current model beyond the
allowed tolerance, the existing production model remains active.

### Frequency

Primary refresh:
- Quarterly

Manual refresh:
- Allowed when corrected or newly labeled historical data becomes
  available.