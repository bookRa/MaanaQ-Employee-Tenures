# Employee Tenure Service

This service draws upon the Employee Kind, adds a "Tenure" Field, and wraps some maana-interval functionality to easily reason about
"who was here first," "whose tenure ended before the other started," etc.

## Open Issues @TODO

- What if there already exists an "Employee" Kind from another service. Can I build upon it?
- What role does CKG play in this service, and how should I build my schema and resolvers to take that into account?
- How can I use this service with Function Composition? And is that mutually exclusive with using Bot Actions?
- Is this a canonical use case for how to build a service that interplays with a "pure" logic microservice? Moreover, will this service be easily used by other services (for example, other HR-reasoning services like "Employee Performance Service")?
