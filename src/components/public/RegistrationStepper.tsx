const STEPS = [
  { num: 1, label: "Details", desc: "Personal info" },
  { num: 2, label: "Documents", desc: "Upload files" },
  { num: 3, label: "Done", desc: "Confirmation" },
] as const;

export function RegistrationStepper({ stage }: { stage: 1 | 2 | 3 }) {
  return (
    <nav className="pub-stepper" aria-label="Registration progress">
      <ol className="pub-stepper-track">
        {STEPS.map((s, i) => {
          const state = stage > s.num ? "done" : stage === s.num ? "current" : "upcoming";
          return (
            <li key={s.num} className={`pub-stepper-step ${state}`}>
              <div className="pub-stepper-node">
                <span className="pub-stepper-dot" aria-hidden>
                  {state === "done" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    s.num
                  )}
                </span>
                <div className="pub-stepper-text">
                  <span className="pub-stepper-name">{s.label}</span>
                  <span className="pub-stepper-desc">{s.desc}</span>
                </div>
              </div>
              {i < STEPS.length - 1 ? <div className="pub-stepper-connector" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
