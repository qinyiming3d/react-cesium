import ScalarPage from './pages/ScalarPage';
import TemperaturePage from './pages/TemperaturePage/TemperaturePage';
import SalinityPage from './pages/SalinityPage';
import DensityPage from './pages/DensityPage';
import VectorPage from './pages/VectorPage';
import VelocityPage from './pages/VelocityPage';
import DirectionPage from './pages/DirectionPage';

const routes = [
  {
    path: '/scalar',
    children: [
      { path: 'temperature', element: <TemperaturePage /> },
      { path: 'salinity', element: <SalinityPage /> },
      { path: 'density', element: <DensityPage /> },
      { path: '', element: <ScalarPage /> }
    ]
  },
  {
    path: '/vector',
    children: [
      { path: 'velocity', element: <VelocityPage /> },
      { path: 'direction', element: <DirectionPage /> },
      { path: '', element: <VectorPage /> }
    ]
  },
  { 
    path: '*',
    element: <ScalarPage />
  }
];

export default routes;
