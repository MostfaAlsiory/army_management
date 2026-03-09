## Packages
date-fns | Date formatting and manipulation for attendance system
recharts | Dashboard charts and statistics visualization
lucide-react | Icons for the UI

## Notes
- RTL Layout: The application is forced to `dir="rtl"` in the CSS layer for Arabic support.
- Tailwind Logical Properties: UI uses `ms-`, `me-`, `ps-`, `pe-` instead of `ml-`, `mr-` to ensure perfect RTL rendering.
- API Schema: All API schemas and URLs are imported from `@shared/routes`.
- Dates: Dates are generally transmitted as `YYYY-MM-DD` strings for standard SQL date fields.
