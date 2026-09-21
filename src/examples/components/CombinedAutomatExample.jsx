import { PureComponent } from 'react';
import { appAutomat } from '../automats/combinedAutomat.js';

class CombinedAutomatExample extends PureComponent {
  constructor(props) {
    super(props);
    this.state = appAutomat.state;
  }

  componentDidMount() {
    this.unsubscribe = appAutomat.subscribe(this);
  }

  componentWillUnmount() {
    this.unsubscribe?.();
  }

  render() {
    const { auth, company } = this.state;

    return (
      <div className="card">
        <div className="card-header">
          <span className="card-icon">🧩</span>
          <h3>Combined Application State</h3>
          <span className="badge badge-local">2 automats</span>
        </div>
        <div className="card-body">
          <div className="ctrl-current-value">
            <span className="ctrl-current-label">Signed in as</span>
            <span>{auth.user?.name ?? 'Guest'}</span>
          </div>
          <div className="ctrl-current-value">
            <span className="ctrl-current-label">Company</span>
            <span>{company.name} · {company.plan}</span>
          </div>
          <div className="counter-controls">
            <button className="btn btn-secondary" type="button" onClick={() => auth.user ? appAutomat.actions.auth.logout() : appAutomat.actions.auth.login()}>
              {auth.user ? 'Log out' : 'Log in'}
            </button>
            <button className="btn btn-primary" type="button" onClick={() => appAutomat.actions.company.togglePlan()}>
              Toggle plan
            </button>
          </div>
          <div className="code-snippet">
            <pre>{`const app = Automat.combine({
  auth: authAutomat,
  company: companyAutomat,
});

app.subscribe(this);
app.actions.auth.login();
app.actions.company.togglePlan();`}</pre>
          </div>
        </div>
      </div>
    );
  }
}

export default CombinedAutomatExample;