import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';

function App() {

  return (
    <BrowserRouter>
    	<main className='font-default'>
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>    	      
    </BrowserRouter>
  );
}

export default App;