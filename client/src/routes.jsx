import ScalarPage from './pages/ScalarPage';
import NcFilePage from './pages/ncFilePage/ncFilePage';
import SalinityPage from './pages/SalinityPage';
import DensityPage from './pages/DensityPage';
import VectorPage from './pages/VectorPage';
import VelocityPage from './pages/VelocityPage';
import DirectionPage from './pages/DirectionPage';

const routes = [
  {
    path: '/scalar',
    children: [
      { path: 'ncFile', element: <NcFilePage /> },
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
