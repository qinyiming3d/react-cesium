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
    element: <NcFilePage />,
    children: [
      { path: 'ncFile', element: <NcFilePage /> },
    ]
  },
  {
    path: '/vector',
    children: [
      { path: 'ncFile', element: <VelocityPage /> },
    ]
  },
];

export default routes;
