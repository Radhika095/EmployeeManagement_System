export default function AuthShell({ title, subtitle, children }) {
  return (
    <main className="auth">
      <section className="auth-aside" aria-hidden="true">
        <p className="auth-aside-lead">Every person on the team, one clear record.</p>
        <ul className="auth-aside-list">
          <li>Add people as they join</li>
          <li>Keep role and pay details current</li>
          <li>Remove records when someone leaves</li>
        </ul>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
