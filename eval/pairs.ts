/**
 * Fixed (resume, JD) evaluation pairs for the scoring eval harness (Task 3.1).
 *
 * Six synthetic-but-realistic pairs spanning the fit range — two strong, two
 * mid, two weak — so the harness exercises the full 1–10 spectrum. `expectedBand`
 * is the human judgement of where a well-behaved scorer's `overall` should land;
 * it is a sanity anchor for reading baselines, NOT an assertion the harness
 * enforces (the harness measures the model, it doesn't grade it).
 */
export type FitBand = 'strong' | 'mid' | 'weak';

export interface EvalPair {
  id: string;
  expectedBand: FitBand;
  title: string;
  company: string;
  resume: string;
  jd: string;
}

export const EVAL_PAIRS: EvalPair[] = [
  {
    id: 'strong-frontend',
    expectedBand: 'strong',
    title: 'Senior Frontend Engineer',
    company: 'Northwind',
    resume: `Priya Sharma — Senior Frontend Engineer, 7 years.
Built and shipped large React + TypeScript applications at consumer-scale startups. Led a migration of a 200k-LOC app to React 18 and Vite, cutting build times 60%. Deep expertise in React, TypeScript, state management (Redux, Zustand), accessibility (WCAG AA), and performance profiling. Owned the design-system component library used by 40 engineers. Mentored 5 junior engineers. Comfortable with Node.js BFF layers, GraphQL, and end-to-end testing (Playwright).`,
    jd: `Senior Frontend Engineer at Northwind. We need someone with 6+ years building production React + TypeScript web apps. You will own major features end to end, drive performance and accessibility, and mentor other engineers. Requirements: expert React and TypeScript, experience with modern build tooling (Vite/webpack), state management, testing, and a strong eye for accessibility. Bonus: design systems, GraphQL.`,
  },
  {
    id: 'strong-data-scientist',
    expectedBand: 'strong',
    title: 'Senior Data Scientist',
    company: 'Helio Labs',
    resume: `Marcus Bell — Data Scientist, 6 years.
PhD in Statistics. Shipped production ML models: churn prediction (XGBoost), demand forecasting (Prophet, LightGBM), and an experimentation platform. Strong Python (pandas, scikit-learn, PyTorch), SQL, and causal inference / A-B testing. Built feature pipelines on Airflow and deployed models via Docker + FastAPI. Published 4 peer-reviewed papers. Comfortable partnering with product to frame ambiguous problems.`,
    jd: `Senior Data Scientist at Helio Labs. Seeking 5+ years applying ML to business problems: forecasting, churn, experimentation. Must be strong in Python (pandas, scikit-learn), SQL, statistics, and A/B testing. You will own models end to end from framing to deployment. Bonus: causal inference, deep learning, production deployment experience.`,
  },
  {
    id: 'mid-backend',
    expectedBand: 'mid',
    title: 'Backend Engineer (Go / Kubernetes)',
    company: 'Corvid Systems',
    resume: `Dana Ortiz — Backend Engineer, 3 years.
Built REST APIs in Python (Django, FastAPI) and PostgreSQL for a fintech startup. Some exposure to AWS (EC2, RDS, S3) and Docker. Wrote background workers with Celery. Have read about Kubernetes and dabbled in a personal side project, but have not run it in production. No professional Go experience, though I've completed a Go tutorial and enjoy it.`,
    jd: `Backend Engineer at Corvid Systems. We run a high-throughput platform in Go on Kubernetes. Requirements: 4+ years backend engineering, strong Go, production Kubernetes experience, and comfort with distributed systems, observability, and on-call. You will design services handling millions of requests/day. Solid database and API design fundamentals expected.`,
  },
  {
    id: 'mid-product-manager',
    expectedBand: 'mid',
    title: 'Product Manager',
    company: 'Brightside',
    resume: `Sam Whitaker — Associate Product Manager, 2.5 years.
Owned the onboarding funnel for a B2C mobile app, running experiments that lifted activation 18%. Wrote PRDs, ran sprint ceremonies, and worked closely with design and engineering. Strong on user research and analytics (Amplitude, SQL). Have not yet managed a full product line or owned a P&L, and my experience is B2C rather than the B2B SaaS this role targets.`,
    jd: `Product Manager at Brightside. Own a B2B SaaS product line end to end: strategy, roadmap, and delivery. Requirements: 4+ years PM experience, ideally B2B SaaS, with a track record of shipping impactful features, strong analytics, and stakeholder management. You will define the roadmap and partner with sales and success. Bonus: experience with pricing and packaging.`,
  },
  {
    id: 'weak-ml-research',
    expectedBand: 'weak',
    title: 'Machine Learning Research Engineer',
    company: 'Aperture AI',
    resume: `Leo Nguyen — Junior Web Developer, 1.5 years.
Build marketing websites and small CRUD apps with WordPress, PHP, and jQuery. Some HTML/CSS and basic JavaScript. Comfortable with Git and simple MySQL queries. No machine learning, Python, or research background. Bachelor's in Communications. Interested in learning to code more seriously.`,
    jd: `Machine Learning Research Engineer at Aperture AI. Requirements: PhD or equivalent research experience in ML, expert PyTorch, strong grasp of transformer architectures, and a publication record at top venues (NeurIPS/ICML/ICLR). You will design and train large models and push the state of the art. Strong applied mathematics and distributed training experience required.`,
  },
  {
    id: 'weak-enterprise-sales',
    expectedBand: 'weak',
    title: 'Enterprise Account Executive',
    company: 'Ledgerline',
    resume: `Chen Wu — Software Engineer, 5 years.
Backend engineer building payment services in Java and Kotlin. Strong distributed systems, databases, and API design. No sales, quota-carrying, or account-management experience. Introverted; prefer deep technical work over client-facing roles. Have never used a CRM or run a sales cycle.`,
    jd: `Enterprise Account Executive at Ledgerline. Requirements: 5+ years closing six-figure B2B SaaS deals, a consistent record of exceeding quota, mastery of complex sales cycles, and excellent executive relationship-building. You will own a book of enterprise accounts, run discovery-to-close, and forecast in the CRM. Bonus: fintech domain experience.`,
  },
];
