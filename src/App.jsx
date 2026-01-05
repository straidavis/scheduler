import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './store';
import Layout from './ui/Layout';
import Dash from './views/Dash';
import Deploys from './views/Deploys';
import Cal from './views/Cal';
import Bill from './views/Bill';
import Invoices from './views/Invoices';
import Work from './views/Work';
import Pricing from './views/Pricing';
import Cfg from './views/Cfg';

function App() {
  return (
    <StoreProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dash />} />
            <Route path="/deployments" element={<Deploys />} />
            <Route path="/calendar" element={<Cal />} />
            <Route path="/billing" element={<Bill />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/labor" element={<Work />} />
            <Route path="/settings" element={<Cfg />} />
          </Routes>
        </Layout>
      </Router>
    </StoreProvider>
  );
}

export default App;
