import { CompanyLogo } from "@/components/public/CompanyLogo";
import { COMPANY } from "@/lib/company";

export function PublicRegistrationShell({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <div className="pub-page">
      <header className="pub-topbar">
        <div className="pub-topbar-inner">
          <div className="pub-topbar-brand">
            <CompanyLogo size={40} />
            <div>
              <span className="pub-topbar-name">{COMPANY.name}</span>
              <span className="pub-topbar-tag">{COMPANY.tagline}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="pub-main">
        <div className="pub-layout">
          <aside className="pub-sidebar">
            <div className="pub-sidebar-inner">
              <CompanyLogo size={64} className="pub-sidebar-logo" />
              <h1 className="pub-sidebar-title">{COMPANY.formTitle}</h1>
              <div className="pub-sidebar-address">
                <address>
                  {COMPANY.address.line1}
                  <br />
                  {COMPANY.address.line2}
                  <br />
                  {COMPANY.address.line3}
                  <br />
                  {COMPANY.address.line4}
                </address>
              </div>
            </div>
          </aside>

          <div className="pub-form-area">
            {sidebar}
            {children}
          </div>
        </div>
      </main>

      <footer className="pub-footer">
        <div className="pub-footer-inner">
          <p>
            © {year} {COMPANY.name} · {COMPANY.address.line4}
          </p>
        </div>
      </footer>
    </div>
  );
}
