# KPI Domain Module

This folder contains pure business calculations.

Rules:

- do not query Prisma directly from KPI functions;
- biological calculations may use normal numeric values with explicit units;
- authoritative money calculations must use decimal-safe values;
- formulas must match `docs/KPI_MODEL.md`;
- breaking formula changes require a new `calculation_version`;
- UI components consume calculated results and must not reimplement formulas.

Current code only starts the biological primitives. FCR, HPP, margin, projection, and cycle aggregation are implemented in the next application-service milestone.
