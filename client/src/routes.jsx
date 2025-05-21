import ScalarNcFilePage from '@pages/scalarNcFilePage/ScalarNcFilePage.jsx';
import VectorNcFilePage from '@pages/vectorNcFilePage/VectorNcFilePage.jsx';


const routes = [
  {
    path: '/scalar',
    element: <ScalarNcFilePage />,
    children: [
      { path: 'ncFile', element: <ScalarNcFilePage /> },
    ]
  },
  {
    path: '/vector',
    children: [
      { path: 'ncFile', element: <VectorNcFilePage /> },
    ]
  },
];

export default routes;
