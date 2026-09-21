import { Automat } from '../../lib/index.js';

export const authAutomat = new Automat(
  { user: null },
  {
    login() {
      authAutomat.setState({ user: { name: 'Ada Lovelace' } });
    },
    logout() {
      authAutomat.setState({ user: null });
    },
  }
);

export const companyAutomat = new Automat(
  { name: 'Analytical Engines Ltd.', plan: 'Starter' },
  {
    rename(name) {
      companyAutomat.setState({ name });
    },
    togglePlan() {
      companyAutomat.setState({
        plan: companyAutomat.state.plan === 'Starter' ? 'Enterprise' : 'Starter',
      });
    },
  }
);

export const appAutomat = Automat.combine({
  auth: authAutomat,
  company: companyAutomat,
});