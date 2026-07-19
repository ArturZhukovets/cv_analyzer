import { createBrowserRouter } from "react-router";

import Layout from "@/components/Layout";
import AnalyzePage from "@/pages/AnalyzePage";
import HistoryPage from "@/pages/HistoryPage";
import NotFoundPage from "@/pages/NotFoundPage";
import RunPage from "@/pages/RunPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <AnalyzePage /> },
      { path: "runs/:runId", element: <RunPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
